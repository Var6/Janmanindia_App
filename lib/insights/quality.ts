import mongoose from "mongoose";
import Case from "@/models/Case";
import Expense from "@/models/Expense";
import User from "@/models/User";
import { BIHAR_DISTRICTS, canonicalDistrict, OUTSIDE_BIHAR, UNSPECIFIED } from "@/lib/insights/districts";

/**
 * Data-health checks. Each returns a count and the records behind it, with a
 * link to fix each one. Items name a case by its JMI number and court number
 * only, so this list can be shown on a screen without exposing parties.
 */

export type QualityItem = { id: string; label: string; detail?: string; link?: string };
export type QualityResult = {
  key: string;
  label: string;
  description: string;
  severity: "high" | "medium" | "low";
  count: number;
  items: QualityItem[];
  /** A bulk fix the app can apply safely (e.g. district spelling). */
  fixable?: boolean;
};

export type QualityCheck = {
  key: string;
  label: string;
  description: string;
  severity: QualityResult["severity"];
  run: () => Promise<QualityItem[]>;
  fixable?: boolean;
};

const LIVE = ["Open", "Pending", "Escalated"];
const VISIBLE = { isPrivate: { $ne: true } };
const ITEM_CAP = 300;

type LeanCase = {
  _id: unknown; caseNumber: string; courtCaseNumber?: string; caseTitle?: string; district?: string; courtName?: string;
  status: string; nextHearingDate?: Date; courtAppearances?: { date?: Date }[]; caseType?: string; community?: unknown;
};

const caseLink = (c: { _id: unknown }) => `/director/cases/${String(c._id)}`;
const caseLabel = (c: LeanCase) => `${c.caseNumber}${c.courtCaseNumber ? ` · ${c.courtCaseNumber}` : ""}`;
const day = (d?: Date) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

const PLACEHOLDER_NUMBERS = new Set(["0", "00", "000", "n", "na", "n/a", "nil", "none", "-", "—", "gr", "acjm", "cjm", "x", "xx", "test"]);

export function isPlaceholderCaseNumber(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (PLACEHOLDER_NUMBERS.has(s)) return true;
  if (/\.{4,}/.test(s)) return true; // "A.B.P No.:- ....840..../2025"
  if (!/\d/.test(s)) return true; // no digits at all ("Dagarua", "SABOUR P.S")
  // A two-digit year that cannot be right ("63/35", "44/34" in 2026).
  const yy = s.match(/\/\s*(\d{2})\s*$/);
  if (yy) {
    const year = Number(yy[1]);
    const now = new Date().getFullYear() % 100;
    if (year > now + 1 && year < 50) return true;
  }
  return false;
}

/** Address, parentage, age or minor markers in a case title. */
const PERSONAL_IN_TITLE = /(\b[SDW]\s*\/\s*o\b|\bR\s*\/\s*O\b|\bage\s*[:\-–]|\bminor\b|\bvill(age)?\b\s*[-:]|\bmohalla\b|\bP\.?\s*S\.?\s*[-–:]\s*\w|\bdistrict\s*[-–:])/i;

export function hasPersonalDetails(title?: string): boolean {
  if (!title) return false;
  return title.length > 160 || PERSONAL_IN_TITLE.test(title);
}

function normaliseNumber(v: string): string {
  return v.toLowerCase().replace(/(case|no|number|p\.?s\.?|[.:\-–_\s])/g, "");
}

export const QUALITY_CHECKS: QualityCheck[] = [
  {
    key: "stale_hearings",
    label: "Live cases whose next hearing date has passed",
    description: "The hearing has happened (or was adjourned) but no new date is recorded. Reminders and the hearings list miss these.",
    severity: "high",
    run: async () => {
      const cases = await Case.find({ ...VISIBLE, status: { $in: LIVE }, nextHearingDate: { $lt: new Date() } })
        .select("caseNumber courtCaseNumber nextHearingDate").sort({ nextHearingDate: 1 }).lean<LeanCase[]>();
      return cases.map((c) => ({ id: String(c._id), label: caseLabel(c), detail: `Next hearing recorded as ${day(c.nextHearingDate)}`, link: caseLink(c) }));
    },
  },
  {
    key: "no_next_hearing",
    label: "Live cases with no next hearing date",
    description: "Pending, open or escalated cases with no hearing date at all.",
    severity: "high",
    run: async () => {
      const cases = await Case.find({ ...VISIBLE, status: { $in: LIVE }, $or: [{ nextHearingDate: { $exists: false } }, { nextHearingDate: null }] })
        .select("caseNumber courtCaseNumber").lean<LeanCase[]>();
      return cases.map((c) => ({ id: String(c._id), label: caseLabel(c), link: caseLink(c) }));
    },
  },
  {
    key: "hearing_order",
    label: "Hearing dates out of order",
    description: "The last logged hearing is after the next hearing date, or a logged hearing is in the future.",
    severity: "medium",
    run: async () => {
      const now = Date.now();
      const cases = await Case.find({ ...VISIBLE, "courtAppearances.0": { $exists: true } })
        .select("caseNumber courtCaseNumber nextHearingDate courtAppearances.date").lean<LeanCase[]>();
      const out: QualityItem[] = [];
      for (const c of cases) {
        const last = Math.max(...(c.courtAppearances ?? []).map((a) => (a.date ? new Date(a.date).getTime() : 0)));
        const next = c.nextHearingDate ? new Date(c.nextHearingDate).getTime() : null;
        if (last > now + 24 * 3600 * 1000) out.push({ id: String(c._id), label: caseLabel(c), detail: `A hearing is logged for ${day(new Date(last))}, which is in the future`, link: caseLink(c) });
        else if (next !== null && last > next) out.push({ id: String(c._id), label: caseLabel(c), detail: `Last hearing ${day(new Date(last))}, next hearing ${day(c.nextHearingDate)}`, link: caseLink(c) });
      }
      return out;
    },
  },
  {
    key: "district_missing",
    label: "Cases with no usable district",
    description: "District is blank or just \"Bihar\" (or outside Bihar) and the court name does not give one. These fall out of district maps and filters.",
    severity: "medium",
    run: async () => {
      const cases = await Case.find(VISIBLE).select("caseNumber courtCaseNumber district courtName").lean<LeanCase[]>();
      return cases
        .map((c) => ({ c, d: canonicalDistrict(c.district, c.courtName) }))
        .filter(({ d }) => d === UNSPECIFIED || d === OUTSIDE_BIHAR)
        .map(({ c, d }) => ({ id: String(c._id), label: caseLabel(c), detail: `District: "${c.district ?? ""}" (${d})`, link: caseLink(c) }));
    },
  },
  {
    key: "district_spelling",
    label: "District spelt differently from the standard name",
    description: "e.g. PURNIA, Purnea or patna. Insights already reads these correctly; fixing them keeps the Cases page filters tidy.",
    severity: "low",
    fixable: true,
    run: async () => {
      const cases = await Case.find(VISIBLE).select("caseNumber courtCaseNumber district courtName").lean<LeanCase[]>();
      return cases
        .filter((c) => c.district && BIHAR_DISTRICTS.some((d) => d.name === canonicalDistrict(c.district)) && canonicalDistrict(c.district) !== c.district.trim())
        .map((c) => ({ id: String(c._id), label: caseLabel(c), detail: `"${c.district}" → ${canonicalDistrict(c.district)}`, link: caseLink(c) }));
    },
  },
  {
    key: "placeholder_numbers",
    label: "Placeholder or impossible court case numbers",
    description: "Numbers like \"00\", \"n\", \"NA\", a bare \"GR\", dotted blanks, no digits, or a year such as /35.",
    severity: "medium",
    run: async () => {
      const cases = await Case.find({ ...VISIBLE, courtCaseNumber: { $exists: true, $ne: "" } }).select("caseNumber courtCaseNumber").lean<LeanCase[]>();
      return cases.filter((c) => isPlaceholderCaseNumber(c.courtCaseNumber))
        .map((c) => ({ id: String(c._id), label: c.caseNumber, detail: `Court number: "${c.courtCaseNumber}"`, link: caseLink(c) }));
    },
  },
  {
    key: "duplicate_numbers",
    label: "Possible duplicate cases",
    description: "Two or more cases share the same court case number. Some may be co-accused in one matter; the rest should be merged.",
    severity: "medium",
    run: async () => {
      const cases = await Case.find({ ...VISIBLE, courtCaseNumber: { $exists: true, $ne: "" } }).select("caseNumber courtCaseNumber district courtName").lean<LeanCase[]>();
      const groups = new Map<string, LeanCase[]>();
      for (const c of cases) {
        if (isPlaceholderCaseNumber(c.courtCaseNumber)) continue;
        const k = `${normaliseNumber(c.courtCaseNumber!)}|${canonicalDistrict(c.district, c.courtName)}`;
        groups.set(k, [...(groups.get(k) ?? []), c]);
      }
      return [...groups.values()].filter((g) => g.length > 1).flatMap((g) =>
        g.map((c) => ({ id: String(c._id), label: caseLabel(c), detail: `Same number as ${g.filter((x) => x !== c).map((x) => x.caseNumber).join(", ")}`, link: caseLink(c) })));
    },
  },
  {
    key: "personal_in_title",
    label: "Addresses, ages or parentage in case titles",
    description: "Titles show on every list, export and calendar entry. Keep them to party names; move addresses and ages to the parties section.",
    severity: "high",
    run: async () => {
      const cases = await Case.find(VISIBLE).select("caseNumber courtCaseNumber caseTitle").lean<LeanCase[]>();
      return cases.filter((c) => hasPersonalDetails(c.caseTitle))
        .map((c) => ({ id: String(c._id), label: caseLabel(c), detail: `Title is ${c.caseTitle?.length ?? 0} characters long`, link: caseLink(c) }));
    },
  },
  {
    key: "pocso_titles",
    label: "POCSO and JJ matters to check for a child's name",
    description: "Every POCSO or Juvenile Justice matter, for a quick check that the title does not name the child. Use initials or \"X\" instead.",
    severity: "high",
    run: async () => {
      const cases = await Case.find({
        ...VISIBLE,
        $or: [
          { caseType: { $in: ["POCSO", "JJ"] } },
          { courtCaseNumber: { $regex: "pocso|\\bjj\\b", $options: "i" } },
          { courtName: { $regex: "juvenile|\\bjjb\\b|pocso", $options: "i" } },
        ],
      }).select("caseNumber courtCaseNumber").lean<LeanCase[]>();
      return cases.map((c) => ({ id: String(c._id), label: caseLabel(c), link: caseLink(c) }));
    },
  },
  {
    key: "no_client",
    label: "Live cases with no client linked",
    description: "Care plans, the client's case tracker and per-client counts need the client account linked.",
    severity: "low",
    run: async () => {
      const cases = await Case.find({ ...VISIBLE, status: { $in: LIVE }, $or: [{ community: { $exists: false } }, { community: null }] })
        .select("caseNumber courtCaseNumber").lean<LeanCase[]>();
      return cases.map((c) => ({ id: String(c._id), label: caseLabel(c), link: caseLink(c) }));
    },
  },
  {
    key: "self_approved_expenses",
    label: "Expense claims checked by the person who filed them",
    description: "HR verification or director approval done by the same person who submitted the claim.",
    severity: "high",
    run: async () => {
      const rows = await Expense.find({
        $expr: { $or: [{ $eq: ["$hrVerification.by", "$submittedBy"] }, { $eq: ["$directorApproval.by", "$submittedBy"] }] },
      }).select("title amount status submittedAt hrVerification.by directorApproval.by submittedBy").populate("submittedBy", "name").lean();
      return rows.map((e) => {
        const who = (e.submittedBy as unknown as { name?: string } | null)?.name ?? "Someone";
        const steps = [
          String(e.hrVerification?.by) === String((e.submittedBy as unknown as { _id: unknown })?._id) ? "HR verification" : null,
          String(e.directorApproval?.by) === String((e.submittedBy as unknown as { _id: unknown })?._id) ? "director approval" : null,
        ].filter(Boolean).join(" and ");
        return { id: String(e._id), label: `₹${(e.amount ?? 0).toLocaleString("en-IN")} · ${e.title}`, detail: `${who} filed it and did the ${steps}`, link: "/reports/expenses" };
      });
    },
  },
  {
    key: "duplicate_users",
    label: "Possible duplicate accounts",
    description: "Active accounts whose names match once spacing and case are ignored.",
    severity: "low",
    run: async () => {
      const users = await User.find({ isActive: true }).select("name role email").lean();
      const groups = new Map<string, typeof users>();
      for (const u of users) {
        const k = (u.name ?? "").toLowerCase().replace(/[^a-z]/g, "");
        if (k.length < 3) continue;
        groups.set(k, [...(groups.get(k) ?? []), u]);
      }
      return [...groups.values()].filter((g) => g.length > 1).flatMap((g) =>
        g.map((u) => ({ id: String(u._id), label: `${u.name} (${u.role})`, detail: `${g.length} accounts with this name`, link: "/director/users" })));
    },
  },
  {
    key: "test_records",
    label: "Test or demo records in live data",
    description: "Cases whose client or title looks like a test or a review account.",
    severity: "low",
    run: async () => {
      const reviewers = await User.find({ name: { $regex: "google review|test user|demo", $options: "i" } }).select("_id").lean();
      const cases = await Case.find({
        ...VISIBLE,
        $or: [{ caseTitle: { $regex: "\\btest\\b|\\bdemo\\b", $options: "i" } }, { community: { $in: reviewers.map((r) => r._id) } }],
      }).select("caseNumber courtCaseNumber").lean<LeanCase[]>();
      return cases.map((c) => ({ id: String(c._id), label: caseLabel(c), link: caseLink(c) }));
    },
  },
];

export async function runQualityCheck(key: string): Promise<QualityResult> {
  const check = QUALITY_CHECKS.find((c) => c.key === key);
  if (!check) throw new Error("Unknown check");
  const items = await check.run();
  return {
    key: check.key, label: check.label, description: check.description, severity: check.severity, fixable: check.fixable,
    count: items.length, items: items.slice(0, ITEM_CAP),
  };
}

export async function runAllQualityChecks(): Promise<QualityResult[]> {
  return Promise.all(QUALITY_CHECKS.map((c) => runQualityCheck(c.key)));
}

/** Rewrites district spellings to the standard name. Only touches values that
 *  map unambiguously to a Bihar district; records the change in each case's
 *  audit log. Returns how many cases changed. */
export async function fixDistrictSpelling(by: { id: string; role: string }): Promise<number> {
  const cases = await Case.find(VISIBLE).select("district").lean<{ _id: mongoose.Types.ObjectId; district?: string }[]>();
  let changed = 0;
  for (const c of cases) {
    if (!c.district) continue;
    const canon = canonicalDistrict(c.district);
    if (!BIHAR_DISTRICTS.some((d) => d.name === canon) || canon === c.district.trim()) continue;
    await Case.updateOne(
      { _id: c._id },
      {
        $set: { district: canon },
        $push: { auditLog: { action: "district_normalised", summary: `District "${c.district}" changed to "${canon}" (Insights data health)`, by: new mongoose.Types.ObjectId(by.id), byRole: by.role, at: new Date() } },
      },
    );
    changed++;
  }
  return changed;
}
