"use client";

/**
 * Litigation-side case creation. Court-type-aware (Supreme / High Court /
 * District / Other), captures parties, strategic subject notes, and either
 * a court-assigned case number OR a filing-status fallback for matters
 * still going through registry scrutiny. Also collects additional
 * litigation members so the case can be shared at creation time.
 *
 * Sister of `CreateCaseForm` — that one is used by SW / director and stays
 * intentionally minimal. This is the heavy form for the lawyers.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { useRouter } from "next/navigation";
import {
  COURT_TYPES, INDIAN_STATES, HIGH_COURTS, DISTRICT_COURTS,
  CASE_NUMBER_HINTS, FILING_STATUSES, REPORTING_STATUSES, LITIGATION_STATUSES,
  hasDistrictCourtList,
  type CourtType,
} from "@/lib/courts";
import { CASE_TYPES, lookupCaseType } from "@/lib/case-types";
import { caseTypesForCourt, lookupECourtType, type ECourtCaseType } from "@/lib/ecourts-case-types";

/** Friendly group headers for the cascaded case-type dropdown. */
const FLOW_LABELS: Record<ECourtCaseType["flow"], string> = {
  criminal: "Criminal",
  family: "Family Court",
  civil: "Civil / Other",
  writ: "Writ & Appeals",
};

type Community = { _id: string; name: string; email: string; phone?: string };
type Lawyer    = { _id: string; name: string; email: string };

/** Build the human display title from the parties array.
 *
 *   1 vs 1 → "A vs B"
 *   2 vs 1 → "A & B vs C"
 *   3+ vs 1 → "A & 2 others vs C"
 *   N vs M (M>1, M<3) → ... (mirrored)
 *   3+ vs 3+ → "A & 2 others vs X & 2 others"
 */
function buildPartyTitle(petitioners: string[], respondents: string[]): string {
  const fmt = (xs: string[]): string => {
    const cleaned = xs.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} & ${cleaned[1]}`;
    return `${cleaned[0]} & ${cleaned.length - 1} others`;
  };
  const left  = fmt(petitioners);
  const right = fmt(respondents);
  if (!left && !right) return "";
  if (!right) return left;
  if (!left)  return `vs ${right}`;
  return `${left} vs ${right}`;
}

export default function CreateLitigationCaseForm() {
  const router = useRouter();
  const t = useT();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ── Court selection ─────────────────────────────────────────────── */
  const [courtType, setCourtType]     = useState<CourtType>("highcourt");
  const [highCourt, setHighCourt]     = useState("");
  const [state, setState]             = useState("");
  const [districtCourt, setDistrictCourt] = useState("");
  const [districtOther, setDistrictOther] = useState("");
  const [otherCourtName, setOtherCourtName] = useState("");

  /* ── Parties ─────────────────────────────────────────────────────── */
  const [petitioners, setPetitioners] = useState<string[]>([]);
  const [respondents, setRespondents] = useState<string[]>([]);
  const [petitionerDraft, setPetitionerDraft] = useState("");
  const [respondentDraft, setRespondentDraft] = useState("");
  const [titleOverride, setTitleOverride] = useState("");

  const autoTitle = useMemo(() => buildPartyTitle(petitioners, respondents), [petitioners, respondents]);
  const finalTitle = titleOverride.trim() || autoTitle;

  /* ── Subject ─────────────────────────────────────────────────────── */
  const [subjectCourtThey, setSubjectCourtThey] = useState("");
  const [subjectOurPoints, setSubjectOurPoints] = useState("");
  const [eCourtLink,       setECourtLink]       = useState("");

  /* ── Janman district (where the case is filed) ───────────────────── */
  const [district, setDistrict] = useState("");

  /* ── Project (grant / programme, e.g. GBV, Fellowship) ───────────── */
  const [projects, setProjects] = useState<{ _id: string; name: string; code?: string; phases?: { name: string }[] }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectPhase, setProjectPhase] = useState("");
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  /* ── Reporter (mandatory) — who reported this matter ─────────────── */
  const [reporterName,  setReporterName]  = useState("");
  const [reporterPhone, setReporterPhone] = useState("");

  /* ── Point of contact for this case (mandatory) ──────────────────── */
  const [pocName,    setPocName]    = useState("");
  const [pocPhone,   setPocPhone]   = useState("");
  const [pocAddress, setPocAddress] = useState("");

  /* ── Case-type (workflow path) ───────────────────────────────────── */
  const [caseType, setCaseType] = useState("");

  // Case types cascade off the selected court level. Each option's value is its
  // short code when the portal gives one, else its name. Grouped by flow for
  // readability. "Other" courts have no fixed list → fall back to the legacy
  // grouped catalog below.
  const availableTypes = useMemo(() => caseTypesForCourt(courtType), [courtType]);
  const typeValue = (t: ECourtCaseType) => t.code ?? t.name;
  const typesByFlow = useMemo(() => {
    const order: ECourtCaseType["flow"][] = ["criminal", "family", "civil", "writ"];
    return order
      .map((flow) => ({ flow, types: availableTypes.filter((t) => t.flow === flow) }))
      .filter((g) => g.types.length > 0);
  }, [availableTypes]);

  // When the court level changes, drop a case type that no longer belongs to
  // the new list so we never submit a mismatched (court, type) pair.
  useEffect(() => {
    if (availableTypes.length === 0) return; // "other" — keep whatever's chosen
    if (caseType && !availableTypes.some((t) => typeValue(t) === caseType)) {
      setCaseType("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtType]);

  /* ── Numbering: assigned vs in-progress ──────────────────────────── */
  const [hasNumber, setHasNumber] = useState(true);
  // Assigned-number fields
  const [courtCaseNumber, setCourtCaseNumber] = useState("");
  const [firNumber, setFirNumber]             = useState("");
  const [policeStation, setPoliceStation]     = useState("");
  const [relevantSections, setRelevantSections] = useState("");
  // In-progress fields
  const [filingStatus, setFilingStatus] = useState<"drafting" | "filing" | "filed">("drafting");
  const [reportingStatus, setReportingStatus] = useState<"pending" | "success" | "conflict">("pending");
  const [defectNote, setDefectNote]           = useState("");
  const [defectDeadline, setDefectDeadline]   = useState("");

  /* ── Status ──────────────────────────────────────────────────────── */
  const [caseStatus, setCaseStatus] = useState<"Pending" | "Disposal" | "Withdrawn">("Pending");

  /* ── Community member ────────────────────────────────────────────── */
  const [community, setCommunity] = useState<Community | null>(null);
  const [communityQuery, setCommunityQuery] = useState("");
  const [communityResults, setCommunityResults] = useState<Community[]>([]);
  const [communitySearching, setCommunitySearching] = useState(false);
  const communityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!communityQuery || communityQuery.length < 2 || community) { setCommunityResults([]); return; }
    if (communityDebounce.current) clearTimeout(communityDebounce.current);
    communityDebounce.current = setTimeout(async () => {
      setCommunitySearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(communityQuery)}&role=community`);
        const d = await r.json();
        setCommunityResults(d.users ?? []);
      } catch { setCommunityResults([]); }
      finally { setCommunitySearching(false); }
    }, 300);
  }, [communityQuery, community]);

  /* ── Additional litigation members ───────────────────────────────── */
  const [shareWith, setShareWith] = useState<Lawyer[]>([]);
  const [lawyerQuery, setLawyerQuery] = useState("");
  const [lawyerResults, setLawyerResults] = useState<Lawyer[]>([]);
  const [lawyerSearching, setLawyerSearching] = useState(false);
  const lawyerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lawyerQuery || lawyerQuery.length < 2) { setLawyerResults([]); return; }
    if (lawyerDebounce.current) clearTimeout(lawyerDebounce.current);
    lawyerDebounce.current = setTimeout(async () => {
      setLawyerSearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(lawyerQuery)}&role=litigation,director`);
        const d = await r.json();
        setLawyerResults((d.users ?? []).filter((u: Lawyer) => !shareWith.some(s => s._id === u._id)));
      } catch { setLawyerResults([]); }
      finally { setLawyerSearching(false); }
    }, 300);
  }, [lawyerQuery, shareWith]);

  /* ── Resolved court name ─────────────────────────────────────────── */
  const resolvedCourtName = useMemo(() => {
    if (courtType === "supreme")   return "Supreme Court of India";
    if (courtType === "highcourt") return highCourt;
    if (courtType === "district") {
      if (districtCourt && districtCourt !== "Other (specify)") return districtCourt;
      return districtOther.trim();
    }
    return otherCourtName.trim();
  }, [courtType, highCourt, districtCourt, districtOther, otherCourtName]);

  function reset() {
    setOpen(false);
    setCourtType("highcourt");
    setHighCourt(""); setState(""); setDistrictCourt(""); setDistrictOther(""); setOtherCourtName("");
    setPetitioners([]); setRespondents([]); setPetitionerDraft(""); setRespondentDraft(""); setTitleOverride("");
    setSubjectCourtThey(""); setSubjectOurPoints(""); setECourtLink("");
    setDistrict(""); setReporterName(""); setReporterPhone(""); setPocName(""); setPocPhone(""); setPocAddress("");
    setCaseType("");
    setHasNumber(true);
    setCourtCaseNumber(""); setFirNumber(""); setPoliceStation(""); setRelevantSections("");
    setFilingStatus("drafting"); setReportingStatus("pending"); setDefectNote(""); setDefectDeadline("");
    setCaseStatus("Pending");
    setCommunity(null); setCommunityQuery(""); setCommunityResults([]);
    setShareWith([]); setLawyerQuery(""); setLawyerResults([]);
    setError("");
  }

  function commitChip(side: "petitioners" | "respondents") {
    const draft = side === "petitioners" ? petitionerDraft : respondentDraft;
    const v = draft.trim();
    if (!v) return;
    if (side === "petitioners") {
      if (!petitioners.includes(v)) setPetitioners([...petitioners, v]);
      setPetitionerDraft("");
    } else {
      if (!respondents.includes(v)) setRespondents([...respondents, v]);
      setRespondentDraft("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!finalTitle.trim()) { setError("Add at least one petitioner and one respondent — the case title is built from these."); return; }
    if (!caseType) { setError("Pick a case type so we can route the workflow (criminal vs civil/HC)."); return; }
    if (!reporterName.trim() || !reporterPhone.trim()) { setError("Reporter name and mobile number are required."); return; }
    if (!pocName.trim() || !pocPhone.trim()) { setError("A point of contact (name and phone) is required."); return; }

    if (courtType === "highcourt" && !highCourt) { setError("Select the High Court."); return; }
    if (courtType === "district") {
      if (!state) { setError("Select the state for the district court."); return; }
      if (!districtCourt) { setError("Select the district court (or pick \"Other (specify)\" and type the name)."); return; }
      if (districtCourt === "Other (specify)" && !districtOther.trim()) {
        setError("Type the court name in the \"Other\" box."); return;
      }
    }
    if (courtType === "other" && !otherCourtName.trim()) {
      setError("Type the tribunal / forum name."); return;
    }

    if (hasNumber && !courtCaseNumber.trim()) {
      setError("Enter the court case / registration number, or switch to \"Filing in progress\" if it's not assigned yet.");
      return;
    }
    if (!hasNumber && reportingStatus === "conflict" && !defectDeadline) {
      setError("A defect deadline is required when reporting status is \"Conflict / defect\".");
      return;
    }

    // Resolve the workflow path from the eCourts catalog first (court-cascaded
    // types), then fall back to the legacy grouped catalog (used for "Other"
    // courts and older codes).
    const meta = lookupECourtType(caseType) ?? lookupCaseType(caseType);
    if (!meta) { setError("That case type isn't recognised."); return; }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        // Core
        caseTitle: finalTitle.trim(),
        caseType,
        path: meta.path,
        communityId: community?._id,
        status: caseStatus,
        // Court taxonomy
        courtType,
        ...(courtType === "district" ? { state } : {}),
        ...(resolvedCourtName ? { courtName: resolvedCourtName } : {}),
        // Parties + cause title
        parties: { petitioners, respondents },
        causeTitle: autoTitle || undefined,
        // Subject + e-Court
        subject: {
          courtThey: subjectCourtThey.trim() || undefined,
          ourPoints: subjectOurPoints.trim() || undefined,
        },
        ...(eCourtLink.trim() ? { eCourtLink: eCourtLink.trim() } : {}),
        // Janman district (where filed)
        ...(district.trim() ? { district: district.trim() } : {}),
        // Point of contact + reporter — mandatory on every case.
        pointOfContact: { name: pocName.trim(), phone: pocPhone.trim(), address: pocAddress.trim() || undefined },
        enquiry: { filerName: reporterName.trim(), filerPhone: reporterPhone.trim() },
        // Project attribution — keeps each programme's finances separate.
        ...(projectId ? { project: projectId, ...(projectPhase ? { projectPhase } : {}) } : {}),
        // Sharing
        ...(shareWith.length ? { litigationMemberIds: shareWith.map(l => l._id) } : {}),
      };

      if (hasNumber) {
        body.courtCaseNumber  = courtCaseNumber.trim();
        body.relevantSections = relevantSections.trim() || undefined;
        // Pre-existing matter — flag it so the dashboard knows we're tracking, not filing.
        body.isExistingCase = true;
        body.filingStatus = "filed";
        const extra: Record<string, string> = {};
        if (firNumber.trim())     extra.firNumber     = firNumber.trim();
        if (policeStation.trim()) extra.policeStation = policeStation.trim();
        Object.assign(body.enquiry as Record<string, string>, extra);
      } else {
        body.filingStatus = filingStatus;
        body.reportingStatus = {
          status: reportingStatus,
          ...(reportingStatus === "conflict" && defectNote.trim() ? { defectNote: defectNote.trim() } : {}),
          ...(reportingStatus === "conflict" && defectDeadline ? { defectDeadline } : {}),
        };
      }

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create case.");
        return;
      }
      reset();
      router.refresh();
      // Hop straight to the new case so the lawyer can start logging.
      const id = data?.case?._id;
      if (id) router.push(`/litigation/cases/${id}`);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <path d="M3 8h10M8 3v10"/>
        </svg>
        {t("Add new case")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border p-6 space-y-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-(--text)">{t("Add new case")}</h2>
          <p className="text-xs text-(--muted) mt-0.5">{t("Fill what you have. Anything not yet known can be added later from the case page.")}</p>
        </div>
        <button type="button" onClick={reset}
          className="text-xs text-(--muted) hover:text-(--text) px-2 py-1 rounded-lg hover:bg-(--bg-secondary) transition-colors">
          {t("Cancel")}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm"
          style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
          {error}
        </div>
      )}

      {/* ─── 1. Court ────────────────────────────────────────────── */}
      <Section title="1. Court" subtitle="Where the matter is registered.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COURT_TYPES.map(opt => {
            const on = courtType === opt.value;
            return (
              <label key={opt.value}
                className="flex items-start gap-2.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors"
                style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                <input type="radio" name="courtType" checked={on}
                  onChange={() => setCourtType(opt.value)} className="mt-0.5 accent-(--accent) cursor-pointer" />
                <span>
                  <p className="text-sm font-semibold text-(--text)">{opt.label}</p>
                  <p className="text-[12px] text-(--muted) mt-0.5">{opt.description}</p>
                </span>
              </label>
            );
          })}
        </div>

        {courtType === "highcourt" && (
          <Field label="Which High Court" required>
            <Select value={highCourt} onChange={e => setHighCourt(e.target.value)} required>
              <option value="" disabled>Select…</option>
              {HIGH_COURTS.map(hc => <option key={hc} value={hc}>{hc}</option>)}
            </Select>
          </Field>
        )}

        {courtType === "district" && (
          <>
            <Field label="State" required>
              <Select value={state} onChange={e => { setState(e.target.value); setDistrictCourt(""); }} required>
                <option value="" disabled>Select state…</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            {state && hasDistrictCourtList(state) && (
              <Field label="District / Civil Court" required>
                <Select value={districtCourt} onChange={e => setDistrictCourt(e.target.value)} required>
                  <option value="" disabled>Select…</option>
                  {DISTRICT_COURTS[state].map(dc => <option key={dc} value={dc}>{dc}</option>)}
                </Select>
              </Field>
            )}
            {state && !hasDistrictCourtList(state) && (
              <Field label="District / Civil Court" required hint="No curated list for this state — type the court name.">
                <Input value={districtOther} onChange={e => { setDistrictOther(e.target.value); setDistrictCourt("Other (specify)"); }}
                  required placeholder="e.g. District Court, Cuttack" />
              </Field>
            )}
            {state && hasDistrictCourtList(state) && districtCourt === "Other (specify)" && (
              <Field label="Court name" required>
                <Input value={districtOther} onChange={e => setDistrictOther(e.target.value)} required
                  placeholder="Type the actual court name" />
              </Field>
            )}
          </>
        )}

        {courtType === "other" && (
          <Field label="Tribunal / Forum name" required
            hint="e.g. National Green Tribunal, NCDRC, NCLT Mumbai, State Human Rights Commission">
            <Input value={otherCourtName} onChange={e => setOtherCourtName(e.target.value)} required
              placeholder="Type the body's full name" />
          </Field>
        )}
      </Section>

      {/* ─── 2. Parties ──────────────────────────────────────────── */}
      <Section title="2. Parties" subtitle="Petitioners & respondents — the case title is built from these.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChipInput label="Petitioner(s)" required values={petitioners} draft={petitionerDraft}
            onDraftChange={setPetitionerDraft}
            onCommit={() => commitChip("petitioners")}
            onRemove={(i) => setPetitioners(petitioners.filter((_, idx) => idx !== i))}
            placeholder="Type a name and press Enter" />
          <ChipInput label="Respondent(s)" required values={respondents} draft={respondentDraft}
            onDraftChange={setRespondentDraft}
            onCommit={() => commitChip("respondents")}
            onRemove={(i) => setRespondents(respondents.filter((_, idx) => idx !== i))}
            placeholder="Type a name and press Enter" />
        </div>
        {autoTitle && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-secondary)" }}>
            <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">Auto-generated title</p>
            <p className="text-sm text-(--text) font-mono mt-0.5">{autoTitle}</p>
          </div>
        )}
        <Field label="Custom case title (optional)" hint="Leave blank to use the auto-generated one above.">
          <Input value={titleOverride} onChange={e => setTitleOverride(e.target.value)}
            placeholder={autoTitle || "e.g. Rishabh vs State of Bihar"} maxLength={200} />
        </Field>
      </Section>

      {/* ─── 3. Subject ──────────────────────────────────────────── */}
      <Section title="3. Subject of the case" subtitle="Key angles the team agrees on early — keeps strategy crisp.">
        <div className="grid grid-cols-1 gap-3">
          <Field label="Subject of the court" hint="What the court is hearing — the opposing stand and any orders so far.">
            <Textarea rows={2} value={subjectCourtThey} onChange={e => setSubjectCourtThey(e.target.value)}
              placeholder="State argues petitioner has no locus; matter already heard by HC…" />
          </Field>
          <Field label="Our points" hint="Our reading + the arguments we'll make.">
            <Textarea rows={2} value={subjectOurPoints} onChange={e => setSubjectOurPoints(e.target.value)}
              placeholder="Locus is established by Art. 32; HC ruling didn't address compensation question…" />
          </Field>
          <Field label="District (where filed)" hint="The district this case belongs to — used to filter cases by place.">
            <Input value={district} onChange={e => setDistrict(e.target.value)}
              placeholder="Katihar / Purnia / Patna / Malda…" />
          </Field>
          <Field label="e-Courts / SC services link (optional)">
            <Input value={eCourtLink} onChange={e => setECourtLink(e.target.value)}
              placeholder="https://services.ecourts.gov.in/…" type="url" />
          </Field>
        </div>
      </Section>

      {/* ─── Reporter (mandatory) ─────────────────────────────────── */}
      <Section title="Reporter" subtitle="Who reported this matter — required on every case." required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Reporter name" required>
            <Input value={reporterName} onChange={e => setReporterName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Reporter mobile" required>
            <Input value={reporterPhone} onChange={e => setReporterPhone(e.target.value)} placeholder="10-digit mobile" type="tel" />
          </Field>
        </div>
      </Section>

      {/* ─── Point of contact ─────────────────────────────────────── */}
      <Section title="Point of contact" subtitle="Who we call about this case — the litigant, a relative, or a paralegal." required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Contact name" required>
            <Input value={pocName} onChange={e => setPocName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Contact phone" required>
            <Input value={pocPhone} onChange={e => setPocPhone(e.target.value)} placeholder="10-digit mobile" type="tel" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contact address">
              <Textarea rows={2} value={pocAddress} onChange={e => setPocAddress(e.target.value)}
                placeholder="Village / town, police station, district" />
            </Field>
          </div>
        </div>
      </Section>

      {/* ─── 4. Case type (workflow path) ────────────────────────── */}
      <Section title="Project" subtitle="Which programme / grant is this case taken under (e.g. GBV — Gender Based Violence, Fellowship)? Keeps each project's cases and finances separate.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Project">
            <Select value={projectId} onChange={e => { setProjectId(e.target.value); setProjectPhase(""); }}>
              <option value="">Not linked to a project</option>
              {projects.map(pr => (
                <option key={pr._id} value={pr._id}>{pr.code ? `${pr.code} — ` : ""}{pr.name}</option>
              ))}
            </Select>
          </Field>
          {(projects.find(pr => pr._id === projectId)?.phases?.length ?? 0) > 0 && (
            <Field label="Funding phase">
              <Select value={projectPhase} onChange={e => setProjectPhase(e.target.value)}>
                <option value="">Choose phase…</option>
                {(projects.find(pr => pr._id === projectId)?.phases ?? []).map(ph => (
                  <option key={ph.name} value={ph.name}>{ph.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Section>

      <Section title="4. Type of case" subtitle="Case types shown match the court selected above (eCourts catalog). Picks which workflow graph drives the case page.">
        <Select value={caseType} onChange={e => setCaseType(e.target.value)} required>
          <option value="" disabled>Choose a case type…</option>
          {/* Cascaded list for Supreme / High Court / District — grouped by flow. */}
          {typesByFlow.map(g => (
            <optgroup key={g.flow} label={FLOW_LABELS[g.flow]}>
              {g.types.map(t => (
                <option key={typeValue(t)} value={typeValue(t)}>
                  {t.code ? `${t.code} — ${t.name}` : t.name}
                </option>
              ))}
            </optgroup>
          ))}
          {/* Fallback grouped catalog for "Other" courts (tribunals etc.). */}
          {availableTypes.length === 0 && CASE_TYPES.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.types.map(t => (
                <option key={t.code + g.group} value={t.code}>{t.code} — {t.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Section>

      {/* ─── 5. Numbering ────────────────────────────────────────── */}
      <Section title="5. Case number" subtitle={CASE_NUMBER_HINTS[courtType]}>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={hasNumber} onChange={() => setHasNumber(true)} className="accent-(--accent)" />
            <span className="text-(--text)">Number assigned</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={!hasNumber} onChange={() => setHasNumber(false)} className="accent-(--accent)" />
            <span className="text-(--text)">Filing in progress</span>
          </label>
        </div>

        {hasNumber ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Court Case / Registration No." required>
              <Input value={courtCaseNumber} onChange={e => setCourtCaseNumber(e.target.value)} required
                placeholder="GR 456/2026 · WP(C) 1234/2026" maxLength={120} />
            </Field>
            <Field label="FIR No. / Complaint Case No." hint="If a criminal trial — leave blank for HC writs / civil suits.">
              <Input value={firNumber} onChange={e => setFirNumber(e.target.value)}
                placeholder="123/2026" maxLength={120} />
            </Field>
            <Field label="Police Station">
              <Input value={policeStation} onChange={e => setPoliceStation(e.target.value)}
                placeholder="Khajanchi Hat PS" maxLength={200} />
            </Field>
            <Field label="Relevant Sections">
              <Input value={relevantSections} onChange={e => setRelevantSections(e.target.value)}
                placeholder="BNS 64, 351 r/w POCSO §6" maxLength={300} />
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Filing status" required>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FILING_STATUSES.map(opt => {
                  const on = filingStatus === opt.value;
                  return (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer rounded-xl border px-3 py-2"
                      style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                      <input type="radio" name="filingStatus" checked={on}
                        onChange={() => setFilingStatus(opt.value)} className="mt-0.5 accent-(--accent)" />
                      <span>
                        <p className="text-xs font-semibold text-(--text)">{opt.label}</p>
                        <p className="text-[11px] text-(--muted) mt-0.5">{opt.description}</p>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Reporting / scrutiny status" required hint="Stamp report from the registry.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {REPORTING_STATUSES.map(opt => {
                  const on = reportingStatus === opt.value;
                  return (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer rounded-xl border px-3 py-2"
                      style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                      <input type="radio" name="reportingStatus" checked={on}
                        onChange={() => setReportingStatus(opt.value)} className="mt-0.5 accent-(--accent)" />
                      <span>
                        <p className="text-xs font-semibold text-(--text)">{opt.label}</p>
                        <p className="text-[11px] text-(--muted) mt-0.5">{opt.description}</p>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
            {reportingStatus === "conflict" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-3 border"
                style={{ background: "var(--warning-bg)", borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)" }}>
                <Field label="Defect note" required>
                  <Input value={defectNote} onChange={e => setDefectNote(e.target.value)} required
                    placeholder="e.g. Court fee insufficient — short by ₹200" />
                </Field>
                <Field label="Last date to cure" required>
                  <Input type="date" value={defectDeadline} onChange={e => setDefectDeadline(e.target.value)} required />
                </Field>
                <p className="sm:col-span-2 text-[12px]" style={{ color: "var(--warning-text)" }}>
                  We&apos;ll surface a banner on the dashboard 3 days before this date.
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ─── 6. Status ──────────────────────────────────────────── */}
      <Section title="6. Case status" subtitle="What state the matter is in right now.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LITIGATION_STATUSES.map(opt => {
            const on = caseStatus === opt.value;
            return (
              <label key={opt.value} className="flex items-start gap-2 cursor-pointer rounded-xl border px-3 py-2"
                style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
                <input type="radio" name="caseStatus" checked={on}
                  onChange={() => setCaseStatus(opt.value)} className="mt-0.5 accent-(--accent)" />
                <span>
                  <p className="text-xs font-semibold text-(--text)">{opt.label}</p>
                  <p className="text-[11px] text-(--muted) mt-0.5">{opt.description}</p>
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ─── 7. Community member ────────────────────────────────── */}
      <Section title={t("7. Victim / Client")} subtitle={t("Whose case is this? Optional — you can link the beneficiary later.")}>
        {community ? (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
            style={{ background: "var(--bg)", borderColor: "var(--accent)" }}>
            <div>
              <p className="text-sm font-medium text-(--text)">{community.name}</p>
              <p className="text-xs text-(--muted)">{community.email}{community.phone ? ` · ${community.phone}` : ""}</p>
            </div>
            <button type="button" onClick={() => { setCommunity(null); setCommunityQuery(""); }}
              className="text-xs hover:underline" style={{ color: "var(--error)" }}>Change</button>
          </div>
        ) : (
          <div className="relative">
            <Input value={communityQuery} onChange={e => setCommunityQuery(e.target.value)}
              placeholder="Search by name or email…" />
            {communitySearching && <p className="text-[12px] text-(--muted) mt-1">Searching…</p>}
            {communityResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {communityResults.map(u => (
                  <button key={u._id} type="button"
                    onClick={() => {
                      setCommunity(u); setCommunityQuery(""); setCommunityResults([]);
                      setReporterName(p => p || u.name);
                      setReporterPhone(p => p || (u.phone ?? ""));
                      setPocName(p => p || u.name);
                      setPocPhone(p => p || (u.phone ?? ""));
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-(--bg-secondary)"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="font-medium text-(--text)">{u.name}</p>
                    <p className="text-xs text-(--muted)">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                  </button>
                ))}
              </div>
            )}
            {communityQuery.length >= 2 && !communitySearching && communityResults.length === 0 && (
              <p className="text-[12px] text-(--muted) mt-1">No victims/clients match &ldquo;{communityQuery}&rdquo;.</p>
            )}
          </div>
        )}
      </Section>

      {/* ─── 8. Share with other lawyers ────────────────────────── */}
      <Section title="8. Share with other litigation members"
        subtitle="They'll see this case as theirs. You stay the lead.">
        {shareWith.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {shareWith.map(l => (
              <span key={l._id}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                {l.name}
                <button type="button" onClick={() => setShareWith(shareWith.filter(s => s._id !== l._id))}
                  className="hover:underline">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Input value={lawyerQuery} onChange={e => setLawyerQuery(e.target.value)}
            placeholder="Search lawyer by name or email…" />
          {lawyerSearching && <p className="text-[12px] text-(--muted) mt-1">Searching…</p>}
          {lawyerResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {lawyerResults.map(u => (
                <button key={u._id} type="button"
                  onClick={() => { setShareWith([...shareWith, u]); setLawyerQuery(""); setLawyerResults([]); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-(--bg-secondary)"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="font-medium text-(--text)">{u.name}</p>
                  <p className="text-xs text-(--muted)">{u.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      <button type="submit" disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {submitting ? t("Creating…") : t("Create case")}
      </button>
    </form>
  );
}

/* ── Local UI primitives — kept in-file so we don't leak yet another shared
   atom into components/ui. They mirror the existing Field/Input/Textarea/
   Select look without re-routing through that import. */
function Section({ title, subtitle, children, required }: { title: string; subtitle?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-(--text)">
          {title}
          {required && <span className="ml-1" style={{ color: "var(--error)" }}>*</span>}
        </h3>
        {subtitle && <p className="text-[12px] text-(--muted) mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-(--text) mb-1">
        {label}
        {required && <span className="ml-1" style={{ color: "var(--error)" }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-(--muted) mt-1">{hint}</p>}
    </div>
  );
}

const INPUT_BASE = "w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none";
const INPUT_STYLE = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as const;

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_BASE} ${props.className ?? ""}`.trim()} style={{ ...INPUT_STYLE, ...props.style }} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_BASE} resize-y ${props.className ?? ""}`.trim()} style={{ ...INPUT_STYLE, ...props.style }} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT_BASE} cursor-pointer ${props.className ?? ""}`.trim()} style={{ ...INPUT_STYLE, ...props.style }} />;
}

function ChipInput({ label, required, values, draft, onDraftChange, onCommit, onRemove, placeholder }: {
  label: string; required?: boolean; values: string[]; draft: string;
  onDraftChange: (s: string) => void;
  onCommit: () => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
              {v}
              <button type="button" onClick={() => onRemove(i)} className="hover:underline">×</button>
            </span>
          ))}
        </div>
      )}
      <Input value={draft} onChange={e => onDraftChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onCommit(); }
        }}
        onBlur={() => { if (draft.trim()) onCommit(); }} />
    </Field>
  );
}
