"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CaseDocsUpload from "@/components/shared/CaseDocsUpload";
import dynamic from "next/dynamic";
// Tab-gated heavyweights are code-split so the case page loads fast: IcpForm
// alone drags in the whole PDF renderer, and Finance is rarely the first tab.
const IcpForm = dynamic(() => import("@/components/icp/IcpForm"), {
  loading: () => <div className="skeleton h-40 rounded-2xl" />,
});
import CaseWorkflowGraph from "@/components/shared/CaseWorkflowGraph";
import CaseAuditLog from "@/components/shared/CaseAuditLog";
import CaseCheatcodes from "@/components/shared/CaseCheatcodes";
const CaseFinanceTab = dynamic(() => import("@/components/case/CaseFinanceTab"), {
  loading: () => <div className="skeleton h-40 rounded-2xl" />,
});
import CaseChatPanel from "@/components/case/CaseChatPanel";
import CaseReviewMeetings from "@/components/case/CaseReviewMeetings";
import HighCourtStagesAndDocs from "@/components/shared/HighCourtStagesAndDocs";
import CaseReviewSection from "@/components/shared/CaseReviewSection";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { Skeleton, SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";
import Translatable from "@/components/i18n/Translatable";
import { lookupECourtType, type CaseFlow } from "@/lib/ecourts-case-types";

/* ── Types ──────────────────────────────────────────────────────────────── */
type DocMeta = { _id?: string; label: string; url: string; uploadedAt: string; ocrStatus?: string; ocrText?: string };
type HighCourtStep = { filed: boolean; filedAt?: string; doc?: DocMeta; notes?: string };

type Enquiry = {
  filerName?: string;
  filerPhone?: string;
  relationshipWithVictim?: string;
  victimName?: string;
  victimAddress?: string;
  victimContact?: string;
  issues?: string[];
  accusedNames?: string;
  accusedCount?: number;
  factsOfTheCase?: string;
  firNumber?: string;
  policeStation?: string;
  placeOfOccurrence?: string;
  incidentDateTime?: string;
};

type CourtAppearance = {
  _id: string;
  date: string;
  currentStatus?: string;
  dailyOrderBrief: string;
  lastHearingDate?: string;
  nextHearingDate?: string;
  remarks?: string;
  loggedBy?: string;
  loggedAt?: string;
};

type LawyerRef = { _id: string; name: string; email: string };
type PopulatedCase = {
  _id: string;
  caseTitle: string;
  caseNumber: string;
  status: "Open" | "Closed" | "Escalated" | "Pending" | "Dismissed" | "Disposal" | "Withdrawn";
  path: "criminal" | "highcourt";
  /** eCourts-style short code (e.g. "FIR", "BA", "ABA", "WP(C)"). */
  caseType?: string;
  district?: string;
  causeTitle?: string;
  courtCaseNumber?: string;
  courtName?: string;
  relevantSections?: string;
  bailAndAppearanceStatus?: string;
  stage?: string;
  compensationStatus?: string;
  disposedAt?: string;
  disposalReason?: string;
  // Court-type-aware fields populated by CreateLitigationCaseForm.
  courtType?: "supreme" | "highcourt" | "district" | "other";
  state?: string;
  /** Court-escalation history (subordinate → High Court → Supreme Court). */
  escalations?: Array<{
    fromCourtType?: "supreme" | "highcourt" | "district" | "other";
    fromCourtName?: string;
    toCourtType: "supreme" | "highcourt" | "district" | "other";
    toCourtName?: string;
    toState?: string;
    note?: string;
    at: string;
  }>;
  parties?: { petitioners?: string[]; respondents?: string[] };
  subject?: { courtThey?: string; ourPoints?: string; reason?: string };
  pointOfContact?: { name?: string; phone?: string; address?: string };
  project?: { _id: string; name: string; code: string; phases?: { name: string }[] } | null;
  projectPhase?: string;
  eCourtLink?: string;
  filingStatus?: "drafting" | "filing" | "filed";
  reportingStatus?: { status: "pending" | "success" | "conflict"; defectNote?: string; defectDeadline?: string };
  community?: { _id: string; name: string; email: string; phone?: string };
  /** Id of the user who filed the case (not populated — kept as a raw id for
   *  the "creator can see/delete" checks). */
  createdBy?: string;
  /** Lead lawyer (legacy single-field). */
  litigationMember?: LawyerRef;
  /** All assigned lawyers, including the lead. */
  litigationMembers?: LawyerRef[];
  socialWorker?: { _id: string; name: string; email: string };
  nextHearingDate?: string;
  documents: DocMeta[];
  caseDiary: Array<{ _id: string; date: string; findings: string; writtenBy: string }>;
  enquiry?: Enquiry;
  courtAppearances?: CourtAppearance[];
  auditLog?: Array<{
    _id?: string;
    action: string;
    summary: string;
    by: { _id: string; name: string; role?: string } | string | null;
    byRole?: string;
    at: string;
  }>;
  createdAt: string;
  updatedAt: string;
  criminalPath?: {
    firFiled: boolean; firDoc?: DocMeta;
    chargesheetFiled: boolean; chargesheetDate?: string; chargesheetDueDate?: string; chargesheetAlertSent: boolean;
    cognizanceOrderDoc?: DocMeta;
    chargesFramed: boolean; chargeDocs: DocMeta[];
    trial: {
      prosecutionWitnesses: Array<{ name: string; deposedAt?: string; depositionUrl?: string }>;
      defenseWitnesses: Array<{ name: string; deposedAt?: string; depositionUrl?: string }>;
      evidenceDocs: DocMeta[]; forensicDocs: DocMeta[];
    };
    verdict?: string; verdictDate?: string;
    bailTrack?: {
      bailApplied: boolean;
      bailType?: "regular" | "anticipatory" | "interim";
      bailApplicationDate?: string; bailApplicationDoc?: DocMeta;
      bailHearingDate?: string;
      bailDecision?: "granted" | "rejected" | "cancelled";
      bailDecisionDate?: string; bailOrderDoc?: DocMeta;
      bailConditions?: string;
    };
  };
  highCourtPath?: {
    petitionFiled: HighCourtStep; supportingAffidavit: HighCourtStep;
    admission: HighCourtStep; counterAffidavit: HighCourtStep;
    rejoinder: HighCourtStep; pleaClose: HighCourtStep; inducement: HighCourtStep;
    // High-level 4-stage tracker (additive).
    officeNotes?: HighCourtStep; argumentsStage?: HighCourtStep; judgements?: HighCourtStep;
    // Named document slots.
    mainPetitionDoc?: DocMeta;
    counterAffidavitDocs?: DocMeta[];
    rejoinderDocs?: DocMeta[];
    notesOfArgumentsDoc?: DocMeta;
    listOfDates?: Array<{ _id: string; date: string; label: string; addedBy: string; addedAt: string; doc?: DocMeta }>;
    orderDocs?: DocMeta[];
  };
  caseComments?: Array<{
    _id: string;
    text: string;
    by: string;
    byName: string;
    byRole?: string;
    pinned?: boolean;
    createdAt: string;
    editedAt?: string;
    replies: Array<{ _id: string; text: string; by: string; byName: string; byRole?: string; createdAt: string; editedAt?: string }>;
  }>;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open:       { bg: "var(--info-bg)",      text: "var(--info-text)"     },
  Escalated:  { bg: "var(--error-bg)",     text: "var(--error-text)"    },
  Pending:    { bg: "var(--warning-bg)",   text: "var(--warning-text)"  },
  Closed:     { bg: "var(--bg-secondary)", text: "var(--muted)"         },
  Dismissed:  { bg: "var(--error-bg)",     text: "var(--error-text)"    },
  Disposal:   { bg: "var(--success-bg)",   text: "var(--success-text)"  },
  Withdrawn:  { bg: "var(--bg-secondary)", text: "var(--muted)"         },
};

/* ── Small UI atoms ─────────────────────────────────────────────────────── */
function EventCard({ color, label, children }: {
  color?: string; label: string; children: React.ReactNode;
}) {
  const accent = color ?? "var(--accent)";
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-1.5 border-b flex items-center gap-2"
        style={{ background: `color-mix(in srgb, ${accent} 8%, var(--surface))`, borderColor: "var(--border)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-xs font-semibold" style={{ color: accent }}>{label}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/* The old buildTimeline + Aceternity Timeline render were removed — the
 * workflow graph is now the single chronological view. Document uploads,
 * court appearances, and case-diary entries each live in their own
 * dedicated collapsible section, and the audit log captures every change
 * across them. EventCard is kept for the FIR alert. */

/* ── Add diary form ─────────────────────────────────────────────────────── */
function AddDiaryForm({ caseId, onSuccess }: { caseId: string; onSuccess: () => void }) {
  const t = useT();
  const [findings, setFindings] = useState("");
  const [date, setDate]         = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!findings.trim()) return;
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntry: { date, findings: findings.trim() } }),
      });
      if (res.ok) {
        setFindings(""); onSuccess();
      } else {
        const d = await res.json();
        setErr(d.error ?? "Failed to add diary entry.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventCard color="var(--accent)" label={t("Add Diary Entry")}>
      <form onSubmit={submit} className="space-y-3">
        <textarea value={findings} onChange={e => setFindings(e.target.value)} required rows={3}
          placeholder={t("Write today's case findings, observations, or proceedings…")}
          className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button type="submit" disabled={saving || !findings.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {saving ? t("Saving…") : t("Add Entry")}
          </button>
        </div>
        {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
      </form>
    </EventCard>
  );
}

/* ── Update hearing form ─────────────────────────────────────────────────── */
function UpdateHearingForm({ caseId, current, onSuccess }: { caseId: string; current?: string; onSuccess: (date: string) => void }) {
  const t = useT();
  const [date, setDate]     = useState(current ? new Date(current).toISOString().split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextHearingDate: date }),
      });
      if (res.ok) {
        onSuccess(date);
      } else {
        const d = await res.json();
        setErr(d.error ?? "Failed.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-3 flex-wrap">
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="px-3 py-2 rounded-xl border text-sm focus:outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
      />
      <button type="submit" disabled={saving || !date}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {saving ? t("Saving…") : t("Save & Sync Calendar")}
      </button>
      {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
    </form>
  );
}

/* ── FIR alert ──────────────────────────────────────────────────────────── */
function FirAlert({ caseData }: { caseData: PopulatedCase }) {
  // Capture "now" once via a lazy initializer rather than calling Date.now()
  // in the render body — the latter is impure (changes between renders).
  const [now] = useState(() => Date.now());

  if (caseData.path !== "criminal" || !caseData.criminalPath?.firFiled || !caseData.criminalPath.firDoc) return null;
  const firDate = new Date(caseData.criminalPath.firDoc.uploadedAt);
  const days    = Math.floor((now - firDate.getTime()) / 86_400_000);
  if (days <= 60) return null;

  const critical = days > 90;
  return (
    <div className="rounded-2xl border p-4"
      style={{
        background: critical ? "var(--error-bg)"   : "var(--warning-bg)",
        borderColor: critical ? "color-mix(in srgb, var(--error) 30%, transparent)" : "color-mix(in srgb, var(--warning) 30%, transparent)",
        color: critical ? "var(--error-text)" : "var(--warning-text)",
      }}>
      <p className="text-sm font-semibold">
        {critical
          ? `⚠ ${days} days since FIR — chargesheet severely overdue!`
          : `⚡ ${days} days since FIR — chargesheet due in ${90 - days} days`}
      </p>
    </div>
  );
}

/* ── Enquiry summary ────────────────────────────────────────────────────── */
function EnquirySummary({ caseId, enquiry, district, causeTitle, canEdit, onChanged }: {
  caseId: string; enquiry?: Enquiry; district?: string; causeTitle?: string;
  canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  // Skip the whole block if there's truly nothing to show — keeps cases that
  // were filed before the structured intake form was rolled out from showing
  // an empty card. Editors always see the card so they can add intake facts.
  const has = (v?: string | number | string[]) =>
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
  const anything =
    has(district) || has(causeTitle) ||
    !!enquiry && (
      has(enquiry.filerName) || has(enquiry.victimName) || has(enquiry.victimAddress) ||
      has(enquiry.victimContact) || has(enquiry.relationshipWithVictim) || has(enquiry.issues) ||
      has(enquiry.accusedNames) || has(enquiry.accusedCount) || has(enquiry.factsOfTheCase) ||
      has(enquiry.firNumber) || has(enquiry.policeStation) ||
      has(enquiry.placeOfOccurrence) || has(enquiry.incidentDateTime)
    );
  if (!anything && !canEdit) return null;

  if (editing) {
    return <EnquiryEditor caseId={caseId} enquiry={enquiry} district={district} causeTitle={causeTitle}
      onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />;
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center gap-2"
        style={{ background: "color-mix(in srgb, var(--info) 8%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--info)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--info-text)" }}>{t("Case Enquiry — Intake Facts")}</span>
        {canEdit && (
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {anything ? t("Edit") : `+ ${t("Add intake facts")}`}
          </button>
        )}
      </div>
      {!anything ? (
        <div className="px-5 py-4">
          <p className="text-xs text-(--muted) italic">{t("No intake facts recorded yet.")}</p>
        </div>
      ) : (
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {has(enquiry?.victimName) && (
          <Line label={t("Victim")}>
            {enquiry!.victimName}
            {has(enquiry?.victimContact) && (
              <span className="text-xs text-(--muted)"> · {enquiry!.victimContact}</span>
            )}
            {has(enquiry?.victimAddress) && (
              <span className="block text-xs text-(--muted) mt-0.5">{enquiry!.victimAddress}</span>
            )}
          </Line>
        )}
        {has(enquiry?.filerName) && (
          <Line label={t("Filer")}>
            {enquiry!.filerName}
            {has(enquiry?.filerPhone) && (
              <span className="text-xs text-(--muted)"> · {enquiry!.filerPhone}</span>
            )}
            {has(enquiry?.relationshipWithVictim) && (
              <span className="block text-xs text-(--muted) mt-0.5">{t("Relationship with Victim")}: {enquiry!.relationshipWithVictim}</span>
            )}
          </Line>
        )}
        {has(district) && <Line label={t("District")}>{district}</Line>}
        {has(causeTitle) && <Line label={t("Cause Title")}>{causeTitle}</Line>}
        {has(enquiry?.policeStation) && <Line label={t("Police Station")}>{enquiry!.policeStation}</Line>}
        {has(enquiry?.firNumber) && <Line label={t("FIR No.")}>{enquiry!.firNumber}</Line>}
        {has(enquiry?.placeOfOccurrence) && <Line label={t("Place of Occurrence")}>{enquiry!.placeOfOccurrence}</Line>}
        {has(enquiry?.incidentDateTime) && (
          <Line label={t("Date / time of incident")}>{fmtDateTime(enquiry!.incidentDateTime!)}</Line>
        )}
        {has(enquiry?.accusedNames) && (
          <Line label={t("Accused")} wide>
            {enquiry!.accusedNames}
            {has(enquiry?.accusedCount) && (
              <span className="text-xs text-(--muted)"> · {enquiry!.accusedCount} {t("total")}</span>
            )}
          </Line>
        )}
        {has(enquiry?.issues) && (
          <Line label={t("Issues")} wide>
            <span className="flex flex-wrap gap-1.5">
              {enquiry!.issues!.map(i => (
                <span key={i} className="text-[12px] px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{i}</span>
              ))}
            </span>
          </Line>
        )}
        {has(enquiry?.factsOfTheCase) && (
          <Line label={t("Facts of the case")} wide>
            <Translatable text={enquiry!.factsOfTheCase} className="block text-(--text)" />
          </Line>
        )}
      </div>
      )}
    </div>
  );
}

/* ── Enquiry editor — the full Case Enquiry intake form, inline ──────────── */
function EnquiryEditor({ caseId, enquiry, district, causeTitle, onClose, onSaved }: {
  caseId: string; enquiry?: Enquiry; district?: string; causeTitle?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const t = useT();
  const toDateInput = (v?: string) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    // datetime-local wants YYYY-MM-DDTHH:mm in local time.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [draft, setDraft] = useState({
    district: district ?? "",
    causeTitle: causeTitle ?? "",
    filerName: enquiry?.filerName ?? "",
    filerPhone: enquiry?.filerPhone ?? "",
    relationshipWithVictim: enquiry?.relationshipWithVictim ?? "",
    victimName: enquiry?.victimName ?? "",
    victimAddress: enquiry?.victimAddress ?? "",
    victimContact: enquiry?.victimContact ?? "",
    accusedNames: enquiry?.accusedNames ?? "",
    accusedCount: enquiry?.accusedCount != null ? String(enquiry.accusedCount) : "",
    factsOfTheCase: enquiry?.factsOfTheCase ?? "",
    firNumber: enquiry?.firNumber ?? "",
    policeStation: enquiry?.policeStation ?? "",
    placeOfOccurrence: enquiry?.placeOfOccurrence ?? "",
    incidentDateTime: toDateInput(enquiry?.incidentDateTime),
  });
  const [issues, setIssues] = useState<string[]>(enquiry?.issues ?? []);
  const [issueDraft, setIssueDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof draft) => (v: string) => setDraft(s => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true); setErr("");
    const t = (v: string) => v.trim() || undefined;
    const countNum = draft.accusedCount.trim() === "" ? undefined : Number(draft.accusedCount);
    if (countNum !== undefined && (isNaN(countNum) || countNum < 0)) {
      setErr("Accused count must be a non-negative number."); setSaving(false); return;
    }
    // Guard the date parse — `new Date("…").toISOString()` throws a RangeError
    // on an invalid value, so only send a well-formed timestamp.
    let incidentISO: string | undefined;
    if (draft.incidentDateTime) {
      const d = new Date(draft.incidentDateTime);
      if (!isNaN(d.getTime())) incidentISO = d.toISOString();
    }
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: t(draft.district),
          causeTitle: t(draft.causeTitle),
          enquiry: {
            filerName: t(draft.filerName),
            filerPhone: t(draft.filerPhone),
            relationshipWithVictim: t(draft.relationshipWithVictim),
            victimName: t(draft.victimName),
            victimAddress: t(draft.victimAddress),
            victimContact: t(draft.victimContact),
            issues: issues.length ? issues : undefined,
            accusedNames: t(draft.accusedNames),
            accusedCount: countNum,
            factsOfTheCase: t(draft.factsOfTheCase),
            firNumber: t(draft.firNumber),
            policeStation: t(draft.policeStation),
            placeOfOccurrence: t(draft.placeOfOccurrence),
            incidentDateTime: incidentISO,
          },
        }),
      });
      if (res.ok) onSaved();
      else { const d = await res.json(); setErr(d.error ?? "Failed to save."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--accent)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--info) 8%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--info-text)" }}>{t("Edit Intake Facts")}</span>
        <button type="button" onClick={onClose} className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
      </div>
      <div className="px-5 py-4 space-y-3">
        {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CmInput label={t("District")} value={draft.district} onChange={set("district")} placeholder={t("Patna")} />
          <CmInput label={t("Cause Title")} value={draft.causeTitle} onChange={set("causeTitle")} placeholder={t("State vs Accused")} />
          <CmInput label={t("Victim Name")} value={draft.victimName} onChange={set("victimName")} />
          <CmInput label={t("Victim Contact")} value={draft.victimContact} onChange={set("victimContact")} />
          <div className="sm:col-span-2">
            <CmInput label={t("Victim Address")} value={draft.victimAddress} onChange={set("victimAddress")} />
          </div>
          <CmInput label={t("Filer Name")} value={draft.filerName} onChange={set("filerName")} />
          <CmInput label={t("Filer Phone")} value={draft.filerPhone} onChange={set("filerPhone")} />
          <div className="sm:col-span-2">
            <CmInput label={t("Relationship with Victim")} value={draft.relationshipWithVictim} onChange={set("relationshipWithVictim")} placeholder={t("Father, neighbour, NGO worker…")} />
          </div>
          <CmInput label={t("Accused Name(s)")} value={draft.accusedNames} onChange={set("accusedNames")} />
          <CmInput label={t("Accused Count")} value={draft.accusedCount} onChange={set("accusedCount")} placeholder={t("e.g. 3")} />
          <CmInput label={t("FIR Number")} value={draft.firNumber} onChange={set("firNumber")} />
          <CmInput label={t("Police Station")} value={draft.policeStation} onChange={set("policeStation")} />
          <CmInput label={t("Place of Occurrence")} value={draft.placeOfOccurrence} onChange={set("placeOfOccurrence")} />
          <div>
            <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Date / time of incident")}</label>
            <input type="datetime-local" value={draft.incidentDateTime} onChange={e => set("incidentDateTime")(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
        </div>
        <ChipField label={t("Issues")} chips={issues} draft={issueDraft}
          onDraftChange={setIssueDraft}
          onCommit={() => { const v = issueDraft.trim(); if (v && !issues.includes(v)) setIssues([...issues, v]); setIssueDraft(""); }}
          onRemove={i => setIssues(issues.filter((_, idx) => idx !== i))} />
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Facts of the case")}</label>
          <textarea value={draft.factsOfTheCase} onChange={e => set("factsOfTheCase")(e.target.value)} rows={4}
            placeholder={t("What happened, in the filer's words…")}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-y"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {saving ? t("Saving…") : t("Save")}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function Line({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{label}</p>
      <div className="text-sm text-(--text) mt-0.5">{children}</div>
    </div>
  );
}

/* ── Case Management ────────────────────────────────────────────────────── */
/** Lawyer-managed metadata mirroring the Janman District Legal Fellow Case
 *  Management form: court-side case number, court name, sections, bail/stage
 *  status, compensation. Read-only for everyone with case access; editable
 *  inline for litigation members. */
function CaseManagementSection({
  caseId, caseData, canEdit, onChanged,
}: {
  caseId: string;
  caseData: PopulatedCase;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    courtCaseNumber: caseData.courtCaseNumber ?? "",
    courtName: caseData.courtName ?? "",
    relevantSections: caseData.relevantSections ?? "",
    bailAndAppearanceStatus: caseData.bailAndAppearanceStatus ?? "",
    stage: caseData.stage ?? "",
    compensationStatus: caseData.compensationStatus ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Re-seed the draft when the parent re-fetches so we don't show stale
  // values after another lawyer edits the case in a different tab.
  useEffect(() => {
    if (!editing) {
      setDraft({
        courtCaseNumber: caseData.courtCaseNumber ?? "",
        courtName: caseData.courtName ?? "",
        relevantSections: caseData.relevantSections ?? "",
        bailAndAppearanceStatus: caseData.bailAndAppearanceStatus ?? "",
        stage: caseData.stage ?? "",
        compensationStatus: caseData.compensationStatus ?? "",
      });
    }
  }, [caseData, editing]);

  const has = (v?: string) => v !== undefined && v !== null && String(v).trim() !== "";
  const anything = has(caseData.courtCaseNumber) || has(caseData.courtName) ||
                   has(caseData.relevantSections) || has(caseData.bailAndAppearanceStatus) ||
                   has(caseData.stage) || has(caseData.compensationStatus);

  // Hide the card entirely when there's nothing to show and the viewer can't
  // edit — keeps community read-views uncluttered.
  if (!anything && !canEdit) return null;

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtCaseNumber: draft.courtCaseNumber.trim(),
          courtName: draft.courtName.trim(),
          relevantSections: draft.relevantSections.trim(),
          bailAndAppearanceStatus: draft.bailAndAppearanceStatus.trim(),
          stage: draft.stage.trim(),
          compensationStatus: draft.compensationStatus.trim(),
        }),
      });
      if (res.ok) {
        setEditing(false);
        onChanged();
      } else {
        const d = await res.json();
        setErr(d.error ?? "Failed to save case management details.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
          {t("Case Management — Court Details")}
        </span>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {anything ? t("Edit") : `+ ${t("Add details")}`}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {has(caseData.courtName) && <Line label={t("Court Name")}>{caseData.courtName}</Line>}
          {has(caseData.courtCaseNumber) && <Line label={t("Court Case / Registration No.")}>{caseData.courtCaseNumber}</Line>}
          {has(caseData.relevantSections) && <Line label={t("Relevant Sections")} wide>{caseData.relevantSections}</Line>}
          {has(caseData.stage) && <Line label={t("Stage of the Case")}>{caseData.stage}</Line>}
          {has(caseData.bailAndAppearanceStatus) && <Line label={t("Bail / Accused Appearance")}>{caseData.bailAndAppearanceStatus}</Line>}
          {has(caseData.compensationStatus) && <Line label={t("Compensation")} wide>{caseData.compensationStatus}</Line>}
          {!anything && (
            <p className="text-xs text-(--muted) italic sm:col-span-2">{t("No court details recorded yet.")}</p>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CmInput label={t("Court Name")} value={draft.courtName}
              onChange={v => setDraft(s => ({ ...s, courtName: v }))}
              placeholder={t("CJM Court, Patna")} />
            <CmInput label={t("Court Case / Registration No.")} value={draft.courtCaseNumber}
              onChange={v => setDraft(s => ({ ...s, courtCaseNumber: v }))}
              placeholder={t("GR 123/2026")} />
            <div className="sm:col-span-2">
              <CmInput label={t("Relevant Sections")} value={draft.relevantSections}
                onChange={v => setDraft(s => ({ ...s, relevantSections: v }))}
                placeholder={t("BNS 64, 351 r/w POCSO §6")} />
            </div>
            <CmInput label={t("Stage of the Case")} value={draft.stage}
              onChange={v => setDraft(s => ({ ...s, stage: v }))}
              placeholder={t("Evidence / Arguments / Judgment")} />
            <CmInput label={t("Bail / Accused Appearance")} value={draft.bailAndAppearanceStatus}
              onChange={v => setDraft(s => ({ ...s, bailAndAppearanceStatus: v }))}
              placeholder={t("Bail granted; accused appearing")} />
            <div className="sm:col-span-2">
              <CmInput label={t("Compensation status")} value={draft.compensationStatus}
                onChange={v => setDraft(s => ({ ...s, compensationStatus: v }))}
                placeholder={t("₹3,00,000 awarded; disbursement pending")} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {saving ? t("Saving…") : t("Save")}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CmInput({ label, value, onChange, placeholder, disabled, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; hint?: string;
}) {
  const t = useT();
  return (
    <div>
      <label className="block text-xs font-semibold text-(--muted) mb-1">
        {label}
        {disabled && (
          <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-normal text-(--muted)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3 h-3">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
            </svg>
            {t("locked")}
          </span>
        )}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} readOnly={disabled} title={disabled ? hint : undefined}
        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
        style={{ background: disabled ? "var(--bg-secondary)" : "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      {disabled && hint && <p className="text-[11px] text-(--muted) mt-1">{hint}</p>}
    </div>
  );
}

/* ── Single editable court appearance entry ─────────────────────────────── */
function AppearanceEntry({ caseId, ap, canEdit, onChanged }: {
  caseId: string; ap: CourtAppearance; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    date: ap.date ? new Date(ap.date).toISOString().slice(0, 10) : "",
    currentStatus: ap.currentStatus ?? "",
    dailyOrderBrief: ap.dailyOrderBrief,
    lastHearingDate: ap.lastHearingDate ? new Date(ap.lastHearingDate).toISOString().slice(0, 10) : "",
    nextHearingDate: ap.nextHearingDate ? new Date(ap.nextHearingDate).toISOString().slice(0, 10) : "",
    remarks: ap.remarks ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editing) setDraft({
      date: ap.date ? new Date(ap.date).toISOString().slice(0, 10) : "",
      currentStatus: ap.currentStatus ?? "",
      dailyOrderBrief: ap.dailyOrderBrief,
      lastHearingDate: ap.lastHearingDate ? new Date(ap.lastHearingDate).toISOString().slice(0, 10) : "",
      nextHearingDate: ap.nextHearingDate ? new Date(ap.nextHearingDate).toISOString().slice(0, 10) : "",
      remarks: ap.remarks ?? "",
    });
  }, [ap, editing]);

  async function save() {
    if (!draft.dailyOrderBrief.trim()) { setErr("Daily order brief is required."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editCourtAppearance: {
            appearanceId: ap._id,
            date: draft.date,
            currentStatus: draft.currentStatus.trim() || undefined,
            dailyOrderBrief: draft.dailyOrderBrief.trim(),
            lastHearingDate: draft.lastHearingDate || undefined,
            nextHearingDate: draft.nextHearingDate || undefined,
            remarks: draft.remarks.trim() || undefined,
          },
        }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border text-sm focus:outline-none";
  const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };

  if (!editing) {
    return (
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-4 py-2 border-b flex items-center justify-between"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
            {fmtDate(ap.date)}
          </span>
          <div className="flex items-center gap-2">
            {ap.currentStatus && (
              <span className="text-[12px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{ap.currentStatus}</span>
            )}
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                {t("Edit")}
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-(--text) leading-relaxed"><Translatable text={ap.dailyOrderBrief} /></p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-(--muted)">
            {ap.lastHearingDate && <span>{t("Last Date of Hearing")}: {fmtDate(ap.lastHearingDate)}</span>}
            {ap.nextHearingDate && <span className="font-semibold" style={{ color: "var(--accent)" }}>{t("Next Date of Hearing")}: {fmtDate(ap.nextHearingDate)}</span>}
          </div>
          {ap.remarks && (
            <p className="text-xs text-(--muted) italic border-t pt-2" style={{ borderColor: "var(--border)" }}>
              {t("Remarks")}: <Translatable text={ap.remarks} preLine={false} />
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--accent)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-(--text)">{t("Edit Appearance")}</p>
        <button type="button" onClick={() => setEditing(false)}
          className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
      </div>
      {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Date of Appearance")}</label>
          <input type="date" value={draft.date} onChange={e => setDraft(s => ({ ...s, date: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Current Status")}</label>
          <input value={draft.currentStatus} onChange={e => setDraft(s => ({ ...s, currentStatus: e.target.value }))}
            placeholder={t("e.g. Adjourned, Argued, Reserved")}
            className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Daily Order Brief *")}</label>
          <textarea value={draft.dailyOrderBrief} onChange={e => setDraft(s => ({ ...s, dailyOrderBrief: e.target.value }))} rows={3}
            className={`${inputCls} resize-y`} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Last Date of Hearing")}</label>
          <input type="date" value={draft.lastHearingDate} onChange={e => setDraft(s => ({ ...s, lastHearingDate: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Next Date of Hearing")}</label>
          <input type="date" value={draft.nextHearingDate} onChange={e => setDraft(s => ({ ...s, nextHearingDate: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Remarks")}</label>
          <input value={draft.remarks} onChange={e => setDraft(s => ({ ...s, remarks: e.target.value }))}
            placeholder={t("Optional comment")} className={inputCls} style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? t("Saving…") : t("Save")}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}

/* ── Court Appearances ──────────────────────────────────────────────────── */
function CourtAppearancesSection({
  caseId, appearances, canEdit, onChanged,
}: {
  caseId: string;
  appearances: CourtAppearance[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const sorted = [...appearances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-(--text)">{t("Case History")}</h2>
        <p className="text-xs text-(--muted)">{sorted.length} {sorted.length === 1 ? t("appearance logged") : t("appearances logged")}</p>
      </div>

      {sorted.length === 0 && !canEdit && (
        <p className="text-sm text-(--muted) italic px-1">{t("No court appearances logged yet.")}</p>
      )}

      {sorted.map(ap => (
        <AppearanceEntry key={ap._id} caseId={caseId} ap={ap} canEdit={canEdit} onChanged={onChanged} />
      ))}

      {canEdit && (
        <AddCourtAppearanceForm caseId={caseId} onSuccess={onChanged} />
      )}
    </div>
  );
}

function AddCourtAppearanceForm({ caseId, onSuccess }: { caseId: string; onSuccess: () => void }) {
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [currentStatus, setCurrentStatus] = useState("");
  const [dailyOrderBrief, setDailyOrderBrief] = useState("");
  const [lastHearingDate, setLastHearingDate] = useState("");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function reset() {
    setDate(today);
    setCurrentStatus("");
    setDailyOrderBrief("");
    setLastHearingDate("");
    setNextHearingDate("");
    setRemarks("");
    setErr("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dailyOrderBrief.trim()) { setErr("Daily order brief is required."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtAppearance: {
            date,
            currentStatus: currentStatus.trim() || undefined,
            dailyOrderBrief: dailyOrderBrief.trim(),
            lastHearingDate: lastHearingDate || undefined,
            nextHearingDate: nextHearingDate || undefined,
            remarks: remarks.trim() || undefined,
          },
        }),
      });
      if (res.ok) {
        reset();
        setOpen(false);
        onSuccess();
      } else {
        const d = await res.json();
        setErr(d.error ?? "Failed to log court appearance.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-dashed transition-colors hover:bg-(--bg-secondary)"
        style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
        + {t("Log Court Appearance")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-(--text)">{t("Log Court Appearance")}</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }}
          className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
      </div>
      {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Date of Appearance *")}</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Current Status")}</label>
          <input value={currentStatus} onChange={e => setCurrentStatus(e.target.value)}
            placeholder={t("e.g. Adjourned, Argued, Reserved")}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Daily Order Brief *")}</label>
          <textarea required value={dailyOrderBrief} onChange={e => setDailyOrderBrief(e.target.value)} rows={3}
            placeholder={t("What the court ordered today, what was argued, who appeared…")}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-y"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Last Date of Hearing")}</label>
          <input type="date" value={lastHearingDate} onChange={e => setLastHearingDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Next Date of Hearing")}</label>
          <input type="date" value={nextHearingDate} onChange={e => setNextHearingDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Remarks")}</label>
          <input value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder={t("Optional comment")}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
      </div>
      <button type="submit" disabled={saving || !dailyOrderBrief.trim()}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {saving ? t("Saving…") : t("Save Appearance")}
      </button>
    </form>
  );
}

/* ── Court-level control ────────────────────────────────────────────────────
 * The case's CURRENT court level plus the trail of levels it has passed
 * through. Editors can move the case to ANY level (up, down, or to fix a wrong
 * pick) — the change is recorded in escalations[] and does NOT wipe the
 * underlying criminal / civil / family workflow. */
const COURT_LEVELS: { key: "district" | "highcourt" | "supreme" | "other"; label: string; icon: string }[] = [
  { key: "district",  label: "Civil / District", icon: "🏛️" },
  { key: "highcourt", label: "High Court",        icon: "⚖️" },
  { key: "supreme",   label: "Supreme Court",     icon: "🏆" },
  { key: "other",     label: "Tribunal / Forum",  icon: "📋" },
];

function CourtLevelEditor({
  caseId, current, escalations, canEdit, onChanged,
}: {
  caseId: string;
  current?: "supreme" | "highcourt" | "district" | "other";
  escalations?: PopulatedCase["escalations"];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [picking, setPicking] = useState<null | "district" | "highcourt" | "supreme" | "other">(null);
  const [courtName, setCourtName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Levels the case has touched — current + every from/to in its history.
  const passed = new Set<string>();
  if (current) passed.add(current);
  (escalations ?? []).forEach((e) => {
    if (e?.fromCourtType) passed.add(String(e.fromCourtType));
    if (e?.toCourtType) passed.add(String(e.toCourtType));
  });

  async function setLevel(toCourtType: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setCourtLevel: { toCourtType, toCourtName: courtName.trim() || undefined, note: note.trim() || undefined } }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? t("Failed to change court level.")); return; }
      setPicking(null); setCourtName(""); setNote("");
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>
        {t("Court level")}
      </p>
      <div className="flex flex-wrap gap-2">
        {COURT_LEVELS.map((l) => {
          const isCurrent = current === l.key;
          const wasHere = passed.has(l.key) && !isCurrent;
          return (
            <button key={l.key} type="button"
              disabled={!canEdit || busy || isCurrent}
              onClick={() => setPicking(picking === l.key ? null : l.key)}
              title={isCurrent ? t("Current level") : canEdit ? t("Set as current level") : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:cursor-default"
              style={{
                background: isCurrent ? "var(--accent)" : picking === l.key ? "var(--accent-subtle)" : "var(--bg)",
                color: isCurrent ? "var(--accent-contrast)" : "var(--text)",
                borderColor: isCurrent ? "var(--accent)" : picking === l.key ? "var(--accent)" : "var(--border)",
              }}>
              <span>{l.icon}</span>
              <span>{t(l.label)}</span>
              {isCurrent && <span className="text-[11px] opacity-90">· {t("Current")}</span>}
              {wasHere && <span className="text-[12px]" style={{ color: "var(--success)" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {picking && canEdit && (
        <div className="mt-2 rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <p className="text-xs text-(--text)">
            {t("Move this case to")} <span className="font-semibold">{t(COURT_LEVELS.find((l) => l.key === picking)!.label)}</span>?
            <span className="text-(--muted)"> {t("The workflow is kept — only the court level changes.")}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={courtName} onChange={(e) => setCourtName(e.target.value)}
              placeholder={picking === "supreme" ? "Supreme Court of India" : t("Court name (optional)")}
              className="px-2.5 py-1.5 text-xs rounded-lg border bg-(--surface) focus:outline-none focus:border-(--accent)"
              style={{ borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t("Note (optional)")}
              className="px-2.5 py-1.5 text-xs rounded-lg border bg-(--surface) focus:outline-none focus:border-(--accent)"
              style={{ borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setLevel(picking)} disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {busy ? t("Saving…") : t("Confirm change")}
            </button>
            <button type="button" onClick={() => { setPicking(null); setCourtName(""); setNote(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Court / parties / subject card ─────────────────────────────────────── */
function CourtPartiesSubjectCard({
  caseId, caseData, canEdit, onChanged,
}: {
  caseId: string;
  caseData: PopulatedCase;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const has = (v?: string | string[]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
  const p = caseData.parties;
  const s = caseData.subject;
  const r = caseData.reportingStatus;
  const showCourt    = has(caseData.courtName) || caseData.courtType || has(caseData.state);
  const showParties  = has(p?.petitioners) || has(p?.respondents);
  const showSubject  = has(s?.courtThey) || has(s?.ourPoints);
  const showFiling   = caseData.filingStatus || r?.status;
  const showECourt   = has(caseData.eCourtLink);
  if (!showCourt && !showParties && !showSubject && !showFiling && !showECourt && !canEdit) return null;

  const filingLabel = caseData.filingStatus === "drafting" ? t("Drafting")
                    : caseData.filingStatus === "filing"   ? t("Filing")
                    : caseData.filingStatus === "filed"    ? t("Filed")
                    : null;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center gap-2"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--accent)" }}>{t("Court & Parties")}</span>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Court level — editable pills showing the current level + the trail
            of levels the case has passed through. */}
        {(showCourt || canEdit) && (
          <div className="space-y-3">
            <CourtLevelEditor
              caseId={caseId}
              current={caseData.courtType}
              escalations={caseData.escalations}
              canEdit={canEdit}
              onChanged={onChanged}
            />
            {(has(caseData.state) || has(caseData.courtName)) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {has(caseData.state) && <Line label={t("State")}><Translatable text={caseData.state} preLine={false} /></Line>}
                {has(caseData.courtName) && (
                  <div className="sm:col-span-3">
                    <Line label={t("Current location")} wide><Translatable text={caseData.courtName} preLine={false} /></Line>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Escalation history — the case's journey up the court hierarchy. */}
        {(caseData.escalations?.length ?? 0) > 0 && (
          <div className="pt-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>
              {t("Escalation history")}
            </p>
            <ol className="space-y-1.5">
              {caseData.escalations!.map((e, i) => {
                const label = e.toCourtType === "supreme" ? t("Supreme Court")
                  : e.toCourtType === "highcourt" ? t("High Court")
                  : e.toCourtType === "district" ? t("Civil / District Court") : t("Tribunal / Forum");
                return (
                  <li key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text)" }}>
                    <span style={{ color: "var(--accent)" }}>⬆</span>
                    <span>
                      <span className="font-semibold">{label}</span>
                      {e.toCourtName ? ` — ${e.toCourtName}` : ""}
                      <span style={{ color: "var(--muted)" }}> · {fmtDate(e.at)}</span>
                      {e.note ? <span style={{ color: "var(--muted)" }}> · {e.note}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Parties — read-only list + optional inline editor */}
        <PartiesEditor
          caseId={caseId}
          petitioners={p?.petitioners ?? []}
          respondents={p?.respondents ?? []}
          canEdit={canEdit}
          onChanged={onChanged}
        />

        {/* Subject — read view + inline editor (incl. "why we believe"). */}
        <SubjectEditor caseId={caseId} subject={s} canEdit={canEdit} onChanged={onChanged} />

        {/* Filing + e-Court row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 pt-3 border-t text-sm"
          style={{ borderColor: "var(--border)" }}>
          {showFiling && filingLabel && <Line label={t("Filing Status")}>{filingLabel}</Line>}
          {r?.status && (
            <Line label={t("Reporting")}>
              {r.status === "conflict" ? t("Defect") : r.status === "success" ? t("Cleared") : t("Pending")}
              {r.defectDeadline && (
                <span className="block text-[12px] text-(--muted) mt-0.5">
                  {t("Cure by")} {fmtDate(r.defectDeadline)}{r.defectNote ? ` · ${r.defectNote}` : ""}
                </span>
              )}
            </Line>
          )}
          {/* e-Court link — read + inline edit */}
          <ECourtLinkEditor
            caseId={caseId}
            value={caseData.eCourtLink}
            canEdit={canEdit}
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}

function PartiesEditor({
  caseId, petitioners, respondents, canEdit, onChanged,
}: {
  caseId: string;
  petitioners: string[];
  respondents: string[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [pets, setPets] = useState<string[]>(petitioners);
  const [resps, setResps] = useState<string[]>(respondents);
  const [petDraft, setPetDraft] = useState("");
  const [respDraft, setRespDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Re-seed when parent re-fetches
  useEffect(() => {
    if (!editing) { setPets(petitioners); setResps(respondents); }
  }, [petitioners, respondents, editing]);

  const hasParties = petitioners.length > 0 || respondents.length > 0;

  function commit(side: "pet" | "resp") {
    const draft = side === "pet" ? petDraft : respDraft;
    const v = draft.trim();
    if (!v) return;
    if (side === "pet") { if (!pets.includes(v)) setPets([...pets, v]); setPetDraft(""); }
    else { if (!resps.includes(v)) setResps([...resps, v]); setRespDraft(""); }
  }

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parties: { petitioners: pets, respondents: resps } }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  const chipStyle = { background: "var(--bg-secondary)", color: "var(--text)" };

  if (!editing) {
    return (
      <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{t("Parties")}</p>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)}
              className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
              {hasParties ? t("Edit") : `+ ${t("Add parties")}`}
            </button>
          )}
        </div>
        {hasParties ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {petitioners.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t("Petitioner(s)")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {petitioners.map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}><Translatable text={name} preLine={false} /></span>
                  ))}
                </div>
              </div>
            )}
            {respondents.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t("Respondent(s) / Defendant(s)")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {respondents.map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}><Translatable text={name} preLine={false} /></span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-(--muted) italic">{t("No parties recorded yet.")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-(--text)">{t("Edit Parties")}</p>
        <button type="button" onClick={() => { setEditing(false); setPets(petitioners); setResps(respondents); }}
          className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
      </div>
      {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChipField label={t("Petitioner(s)")} chips={pets} draft={petDraft}
          onDraftChange={setPetDraft} onCommit={() => commit("pet")}
          onRemove={i => setPets(pets.filter((_, idx) => idx !== i))} />
        <ChipField label={t("Respondent(s) / Defendant(s)")} chips={resps} draft={respDraft}
          onDraftChange={setRespDraft} onCommit={() => commit("resp")}
          onRemove={i => setResps(resps.filter((_, idx) => idx !== i))} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? t("Saving…") : t("Save")}
        </button>
        <button type="button" onClick={() => { setEditing(false); setPets(petitioners); setResps(respondents); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}

function ChipField({ label, chips, draft, onDraftChange, onCommit, onRemove }: {
  label: string; chips: string[]; draft: string;
  onDraftChange: (s: string) => void; onCommit: () => void; onRemove: (i: number) => void;
}) {
  const t = useT();
  return (
    <div>
      <label className="block text-xs font-semibold text-(--muted) mb-1">{label}</label>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {chips.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
              {v}
              <button type="button" onClick={() => onRemove(i)} className="hover:underline leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <input value={draft} onChange={e => onDraftChange(e.target.value)}
        placeholder={t("Type a name and press Enter")}
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onCommit(); } }}
        onBlur={() => { if (draft.trim()) onCommit(); }} />
    </div>
  );
}

function ECourtLinkEditor({ caseId, value, canEdit, onChanged }: {
  caseId: string; value?: string; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eCourtLink: draft.trim() || null }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
    } finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <Line label={t("e-Courts link")}>
        {value ? (
          <span className="flex items-center gap-2">
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="hover:underline truncate inline-block max-w-[160px]" style={{ color: "var(--accent)" }}>
              {t("Open ↗")}
            </a>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-[11px] hover:underline shrink-0" style={{ color: "var(--muted)" }}>
                {t("Edit")}
              </button>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-xs text-(--muted) italic">{t("Not set")}</span>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-[11px] hover:underline" style={{ color: "var(--accent)" }}>
                + {t("Add")}
              </button>
            )}
          </span>
        )}
      </Line>
    );
  }

  return (
    <div className="sm:col-span-3">
      <label className="block text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t("e-Courts link")}</label>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} type="url"
          placeholder={t("https://services.ecourts.gov.in/…")}
          className="flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <button type="button" onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? "…" : t("Save")}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}

/* ── Litigation team panel — multi-lawyer share ────────────────────────── */
function LitigationTeamPanel({
  caseId, caseData, canEdit, onChanged,
}: {
  caseId: string;
  caseData: PopulatedCase;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [adding, setAdding]   = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<LawyerRef[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [err, setErr]         = useState("");

  // Build the canonical team list. The lead always shows first, then the
  // shared members with the lead de-duplicated out.
  const lead    = caseData.litigationMember;
  const shared  = (caseData.litigationMembers ?? []).filter(m => !lead || m._id !== lead._id);
  const team    = lead ? [lead, ...shared] : shared;
  // Stable string key for the effect — `team` is rebuilt every render so it
  // can't be a dep directly (causes an infinite render loop).
  const teamIdsKey = team.map(m => m._id).join(",");

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=litigation,director`);
        const d = await r.json();
        const teamIds = new Set(teamIdsKey.split(",").filter(Boolean));
        setResults((d.users ?? []).filter((u: LawyerRef) => !teamIds.has(u._id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, teamIdsKey]);

  async function share(userId: string) {
    setBusyId(userId); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareWithLitigation: { userId } }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? "Failed to share.");
        return;
      }
      setQuery(""); setResults([]); setAdding(false);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }
  async function unshare(userId: string) {
    setBusyId(userId); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unshareLitigation: { userId } }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? "Failed to remove.");
        return;
      }
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (team.length === 0 && !canEdit) return null;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--info) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--info-text)" }}>
          {t("Litigation Team")} · {team.length}
        </span>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            + {t("Share with another lawyer")}
          </button>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        {err && (
          <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {err}
          </div>
        )}
        {team.length === 0 ? (
          <p className="text-xs text-(--muted) italic">{t("No lawyer assigned yet.")}</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {team.map((m, i) => (
              <li key={m._id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-(--text)">
                    {m.name}
                    {i === 0 && (
                      <span className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>{t("Lead")}</span>
                    )}
                  </p>
                  <p className="text-xs text-(--muted)">{m.email}</p>
                </div>
                {canEdit && i > 0 && (
                  <button type="button" disabled={busyId === m._id} onClick={() => unshare(m._id)}
                    className="text-xs hover:underline" style={{ color: "var(--error)" }}>
                    {busyId === m._id ? "…" : t("Remove")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding && (
          <div className="rounded-xl border p-3 space-y-2"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-(--text)">{t("Add a lawyer")}</p>
              <button type="button" onClick={() => { setAdding(false); setQuery(""); setResults([]); }}
                className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
            </div>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t("Search by name or email…")}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            {searching && <p className="text-[12px] text-(--muted)">{t("Searching…")}</p>}
            {results.length > 0 && (
              <div className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--border)" }}>
                {results.map(u => (
                  <button key={u._id} type="button" disabled={busyId === u._id}
                    onClick={() => share(u._id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-(--bg-secondary) flex items-center justify-between"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <span>
                      <span className="font-medium text-(--text)">{u.name}</span>
                      <span className="text-xs text-(--muted) ml-2">{u.email}</span>
                    </span>
                    <span className="text-xs" style={{ color: "var(--accent)" }}>
                      {busyId === u._id ? t("Sharing…") : t("Share")}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-[12px] text-(--muted)">{t("No matches for")} &quot;{query}&quot;.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Danger zone — permanent case deletion ──────────────────────────────── */
/** Hard-deletes the case. Only shown to director / superadmin or the person
 *  who created it. Requires the user to type the exact case number to confirm
 *  — the same string is sent to the server, which re-checks it before
 *  deleting (see DELETE /api/cases/[caseId]). */
function CaseDangerZone({ caseId, caseNumber, createdBy, backHref }: {
  caseId: string; caseNumber: string; createdBy?: string; backHref: string;
}) {
  const t = useT();
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then(d => { if (d.user) setMe({ id: String(d.user._id), role: d.user.role }); })
      .catch(() => {});
  }, []);

  if (!me) return null;
  const canDelete = me.role === "director" || me.role === "superadmin" || (createdBy != null && createdBy === me.id);
  if (!canDelete) return null;

  async function remove() {
    if (confirmText.trim() !== caseNumber) { setErr("The case number doesn't match."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCaseNumber: confirmText.trim() }),
      });
      if (res.ok) {
        router.push(backHref);
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "Failed to delete the case.");
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "color-mix(in srgb, var(--error) 35%, var(--border))", background: "var(--surface)" }}>
      <div className="px-4 py-2 border-b"
        style={{ background: "var(--error-bg)", borderColor: "color-mix(in srgb, var(--error) 25%, transparent)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--error-text)" }}>{t("Danger Zone")}</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-(--text)">
          {t("Permanently delete this case and everything attached to it (documents, diary, appearances, finances).")}
          <span className="font-semibold"> {t("This cannot be undone.")}</span>
        </p>

        {!open ? (
          <button type="button" onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
            {t("Delete this case")}
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-(--muted) mb-1">
                {t("Type")} <span className="font-mono font-bold text-(--text)">{caseNumber}</span> {t("to confirm")}
              </label>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                placeholder={caseNumber} autoComplete="off"
                className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            </div>
            {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
            <div className="flex items-center gap-2">
              <button type="button" onClick={remove} disabled={busy || confirmText.trim() !== caseNumber}
                className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "var(--error)", color: "#fff" }}>
                {busy ? t("Deleting…") : t("Delete permanently")}
              </button>
              <button type="button" onClick={() => { setOpen(false); setConfirmText(""); setErr(""); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Inline case-title editor (header) ──────────────────────────────────── */
function TitleEditor({ caseId, value, canEdit, onChanged }: {
  caseId: string; value: string; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  async function save() {
    const title = draft.trim();
    if (!title) { setErr("Title cannot be empty."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseTitle: title }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed to save."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <h1 className="text-xl sm:text-2xl font-bold text-(--text) leading-tight flex items-start gap-2">
        <Translatable text={value} preLine={false} className="min-w-0" />
        {canEdit && (
          <button type="button" onClick={() => setEditing(true)} title={t("Edit title")}
            className="shrink-0 mt-1 text-(--muted) hover:text-(--accent) transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"/>
            </svg>
          </button>
        )}
      </h1>
    );
  }

  return (
    <div className="space-y-2">
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} autoFocus
        className="w-full px-3 py-2 rounded-xl border text-lg font-bold focus:outline-none resize-y"
        style={{ background: "var(--bg)", borderColor: "var(--accent)", color: "var(--text)" }} />
      {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? t("Saving…") : t("Save")}
        </button>
        <button type="button" onClick={() => { setEditing(false); setDraft(value); setErr(""); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}

/* ── Inline status editor (header pill) ─────────────────────────────────── */
const STATUS_OPTIONS = ["Open", "Pending", "Escalated", "Disposal", "Withdrawn", "Closed", "Dismissed"] as const;
function StatusEditor({ caseId, value, canEdit, onChanged }: {
  caseId: string; value: string; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const st = STATUS_STYLE[value] ?? STATUS_STYLE.Closed;

  async function change(next: string) {
    if (next === value) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
    } finally { setSaving(false); }
  }

  if (canEdit && editing) {
    return (
      <select autoFocus defaultValue={value} disabled={saving}
        onChange={e => change(e.target.value)}
        onBlur={() => setEditing(false)}
        className="text-xs font-semibold px-2 py-1 rounded-full border focus:outline-none"
        style={{ background: st.bg, color: st.text, borderColor: "var(--border)" }}>
        {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <button type="button" disabled={!canEdit} onClick={() => setEditing(true)}
      title={canEdit ? t("Change status") : undefined}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      style={{ background: st.bg, color: st.text }}>
      {value}{canEdit && " ▾"}
    </button>
  );
}

/* ── "Mark as Disposed / Completed" — one-click finaliser ───────────────────
 * Statuses are also reachable from the dropdown, but disposal/completion is
 * the common end state (mutual settlement, compromise, bail granted) and
 * deserves an explicit, obvious button. It stamps a completion date and lets
 * the user record how the matter ended. Hidden once the case is already in a
 * final state. */
/* ── Opt-in to the bail track ──────────────────────────────────────────────
 * Most criminal cases don't need a bail workflow, so we don't show one by
 * default. When a bail application is actually filed, the team clicks this to
 * start (and reveal) the dedicated bail tree. */
function StartBailTrackButton({ caseId, onChanged }: { caseId: string; onChanged: () => void }) {
  const t = useT();
  const [saving, setSaving] = useState(false);
  async function start() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageTransition: { stage: "bail_applied", action: "advance" } }),
      });
      if (res.ok) onChanged();
      else {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? t("Failed to start the bail track."));
      }
    } finally { setSaving(false); }
  }
  return (
    <button type="button" onClick={start} disabled={saving}
      className="w-full rounded-2xl border border-dashed px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
      style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}>
      ＋ {saving ? t("Starting…") : t("Track a bail application")}
    </button>
  );
}

/* ── "Mark as Disposed / Completed" — one-click finaliser ───────────────────
 * Statuses are also reachable from the dropdown, but disposal/completion is
 * the common end state (mutual settlement, compromise, bail granted) and
 * deserves an explicit, obvious button. It stamps a completion date and lets
 * the user record how the matter ended. Hidden once the case is already in a
 * final state. */
const FINAL_CASE_STATUSES = ["Disposal", "Closed", "Dismissed", "Withdrawn"];
function DisposeButton({ caseId, status, canEdit, onChanged }: {
  caseId: string; status: string; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canEdit || FINAL_CASE_STATUSES.includes(status)) return null;

  async function dispose() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposeCase: { reason: reason.trim() } }),
      });
      if (res.ok) { setOpen(false); setReason(""); onChanged(); }
      else {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? t("Failed to mark the case disposed."));
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 inline-flex items-center gap-1"
        style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
        ✓ {t("Mark Disposed / Completed")}
      </button>
      {open && (
        <div className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-xl border p-3 shadow-lg"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text)" }}>
            {t("Mark this case as disposed / completed?")}
          </p>
          <p className="text-[12px] mb-2" style={{ color: "var(--muted)" }}>
            {t("This sets the status to Disposal and records a completion date. Any upcoming hearing on the calendar is removed.")}
          </p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder={t("How did it end? (optional — e.g. mutual settlement, bail granted)")}
            className="w-full text-xs rounded-lg border px-2 py-1.5 mb-2 focus:outline-none"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => { setOpen(false); setReason(""); }}
              className="text-xs px-2.5 py-1 rounded-lg" style={{ color: "var(--muted)" }}>
              {t("Cancel")}
            </button>
            <button type="button" disabled={saving} onClick={dispose}
              className="text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer hover:opacity-90"
              style={{ background: "var(--success-text)", color: "white" }}>
              {saving ? t("Saving…") : t("Mark Disposed")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Court-level changes now happen inline via <CourtLevelEditor> in the Court &
 * Parties card (bidirectional, workflow-preserving). The old one-way
 * MigrateButton has been retired. The migrateCase API branch remains for
 * back-compat but the UI no longer calls it. */

/* ── Subject editor — strategic notes (court they / our points / why) ───── */
function SubjectEditor({ caseId, subject, canEdit, onChanged }: {
  caseId: string;
  subject?: { courtThey?: string; ourPoints?: string; reason?: string };
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    courtThey: subject?.courtThey ?? "",
    ourPoints: subject?.ourPoints ?? "",
    reason: subject?.reason ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editing) setDraft({
      courtThey: subject?.courtThey ?? "",
      ourPoints: subject?.ourPoints ?? "",
      reason: subject?.reason ?? "",
    });
  }, [subject, editing]);

  const has = (v?: string) => v !== undefined && v !== null && String(v).trim() !== "";
  const anything = has(subject?.courtThey) || has(subject?.ourPoints) || has(subject?.reason);
  if (!anything && !canEdit) return null;

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: {
          courtThey: draft.courtThey.trim(),
          ourPoints: draft.ourPoints.trim(),
          reason: draft.reason.trim(),
        } }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{t("Subject")}</p>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)}
              className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
              {anything ? t("Edit") : `+ ${t("Add subject")}`}
            </button>
          )}
        </div>
        {has(subject?.courtThey) && (
          <Line label={t("Subject of the court")} wide><Translatable text={subject!.courtThey} className="block" /></Line>
        )}
        {has(subject?.ourPoints) && (
          <Line label={t("Our points")} wide><Translatable text={subject!.ourPoints} className="block" /></Line>
        )}
        {has(subject?.reason) && (
          <Line label={t("Why we believe we have a case")} wide><Translatable text={subject!.reason} className="block" /></Line>
        )}
        {!anything && <p className="text-xs text-(--muted) italic">{t("No subject notes yet.")}</p>}
      </div>
    );
  }

  const taCls = "w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-y";
  const taStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };
  return (
    <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-(--text)">{t("Edit Subject")}</p>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
      </div>
      {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      <div>
        <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Subject of the court (their line)")}</label>
        <textarea value={draft.courtThey} onChange={e => setDraft(s => ({ ...s, courtThey: e.target.value }))} rows={2} className={taCls} style={taStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Our points")}</label>
        <textarea value={draft.ourPoints} onChange={e => setDraft(s => ({ ...s, ourPoints: e.target.value }))} rows={2} className={taCls} style={taStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Why we believe we have a case")}</label>
        <textarea value={draft.reason} onChange={e => setDraft(s => ({ ...s, reason: e.target.value }))} rows={2} className={taCls} style={taStyle} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? t("Saving…") : t("Save")}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
      </div>
    </div>
  );
}

/* ── Verdict editor (criminal path) ─────────────────────────────────────── */
function VerdictEditor({ caseId, verdict, verdictDate, canEdit, onChanged }: {
  caseId: string; verdict?: string; verdictDate?: string; canEdit: boolean; onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(verdict ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!editing) setDraft(verdict ?? ""); }, [verdict, editing]);

  const has = verdict !== undefined && verdict !== null && String(verdict).trim() !== "";
  if (!has && !canEdit) return null;

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: draft.trim() }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--success) 8%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--success-text)" }}>
          {t("Verdict")}{verdictDate ? ` · ${fmtDate(verdictDate)}` : ""}
        </span>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {has ? t("Edit") : `+ ${t("Record verdict")}`}
          </button>
        )}
      </div>
      {!editing ? (
        <div className="px-5 py-4">
          {has
            ? <p className="text-sm text-(--text) leading-relaxed"><Translatable text={verdict} /></p>
            : <p className="text-xs text-(--muted) italic">{t("No verdict recorded yet.")}</p>}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
            placeholder={t("Summarise the verdict / final order…")}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-y"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {saving ? t("Saving…") : t("Save")}
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(verdict ?? ""); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Assign / change the community member or social worker ──────────────── */
/** Single-select people picker rendered as a party tile. Lets an editor
 *  assign, change, or clear the beneficiary community member or the social
 *  worker after the case is registered (both are often created later). */
function PersonAssignEditor({ caseId, label, field, role, person, canEdit, href, onChanged }: {
  caseId: string;
  label: string;
  field: "community" | "socialWorker";
  role: "community" | "socialworker";
  person?: { _id: string; name: string; email: string };
  canEdit: boolean;
  href?: string;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editing || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=${role}`);
        const d = await r.json();
        setResults(d.users ?? []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, editing, role]);

  async function assign(userId: string | null) {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: userId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? "Failed to update.");
        return;
      }
      setEditing(false); setQuery(""); setResults([]);
      onChanged();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const wrapperStyle = { background: "var(--bg)", borderColor: "var(--border)" };

  if (canEdit && editing) {
    return (
      <div className="rounded-xl p-3 border" style={wrapperStyle}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{t(label)}</p>
          <button type="button" onClick={() => { setEditing(false); setQuery(""); setResults([]); setErr(""); }}
            className="text-[11px] text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
        </div>
        {err && <p className="text-[12px] mb-1" style={{ color: "var(--error-text)" }}>{err}</p>}
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder={`${t("Search")} ${t(label)}…`}
          className="w-full px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
        {searching && <p className="text-[11px] text-(--muted) mt-1">{t("Searching…")}</p>}
        {results.length > 0 && (
          <div className="mt-1 rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {results.map(u => (
              <button key={u._id} type="button" disabled={busy} onClick={() => assign(u._id)}
                className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-(--bg-secondary)"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="font-medium text-(--text)">{u.name}</span>
                <span className="text-[12px] text-(--muted) ml-1.5">{u.email}</span>
              </button>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-[11px] text-(--muted) mt-1">{t("No matches")} — &quot;{query}&quot;.</p>
        )}
      </div>
    );
  }

  const inner = person
    ? <>
        <p className="text-sm font-semibold text-(--text)"><Translatable text={person.name} preLine={false} /></p>
        <p className="text-xs text-(--muted)">{person.email}</p>
      </>
    : <p className="text-xs text-(--muted) italic">{t("Not assigned")}</p>;

  // Read-only view for viewers who can't edit — preserve the clickable link
  // to the community-member page when a href is supplied (social-worker UI).
  if (!canEdit) {
    if (href && person) {
      return (
        <Link href={href} className="rounded-xl p-3 border transition-colors hover:border-(--accent)" style={wrapperStyle}>
          <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t(label)} →</p>
          {inner}
        </Link>
      );
    }
    return (
      <div className="rounded-xl p-3 border" style={wrapperStyle}>
        <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t(label)}</p>
        {inner}
      </div>
    );
  }

  // Editor view — tile with inline Assign / Change / Remove controls.
  return (
    <div className="rounded-xl p-3 border" style={wrapperStyle}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{t(label)}</p>
        <span className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setEditing(true)}
            className="text-[11px] hover:underline" style={{ color: "var(--accent)" }}>
            {person ? t("Change") : t("Assign")}
          </button>
          {person && (
            <button type="button" disabled={busy} onClick={() => assign(null)}
              className="text-[11px] hover:underline disabled:opacity-50" style={{ color: "var(--error)" }}>
              {t("Remove")}
            </button>
          )}
        </span>
      </div>
      {err && <p className="text-[12px] mb-1" style={{ color: "var(--error-text)" }}>{err}</p>}
      {href && person ? (
        <Link href={href} className="block hover:opacity-80">{inner}</Link>
      ) : inner}
    </div>
  );
}

/* ── Point of contact card ──────────────────────────────────────────────── */
function PointOfContactCard({ caseId, poc, canEdit, onChanged }: {
  caseId: string;
  poc?: { name?: string; phone?: string; address?: string };
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: poc?.name ?? "", phone: poc?.phone ?? "", address: poc?.address ?? "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editing) setDraft({ name: poc?.name ?? "", phone: poc?.phone ?? "", address: poc?.address ?? "" });
  }, [poc, editing]);

  const has = (v?: string) => !!(v && v.trim());
  const anything = has(poc?.name) || has(poc?.phone) || has(poc?.address);
  if (!anything && !canEdit) return null;

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointOfContact: { name: draft.name.trim(), phone: draft.phone.trim(), address: draft.address.trim() } }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  const inCls = "w-full px-3 py-2 rounded-xl border text-sm focus:outline-none";
  const inStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{t("Point of Contact")}</span>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {anything ? t("Edit") : `+ ${t("Add")}`}
          </button>
        )}
      </div>
      {!editing ? (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {has(poc?.name) && <Line label={t("Contact name")}>{poc!.name}</Line>}
          {has(poc?.phone) && <Line label={t("Contact phone")}><a href={`tel:${poc!.phone}`} className="hover:underline" style={{ color: "var(--accent)" }}>{poc!.phone}</a></Line>}
          {has(poc?.address) && <Line label={t("Contact address")} wide><span className="block whitespace-pre-line">{poc!.address}</span></Line>}
          {!anything && <p className="text-xs text-(--muted) italic sm:col-span-2">{t("Who should we contact about this case?")}</p>}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Contact name")}</label>
              <input value={draft.name} onChange={e => setDraft(s => ({ ...s, name: e.target.value }))} className={inCls} style={inStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Contact phone")}</label>
              <input value={draft.phone} onChange={e => setDraft(s => ({ ...s, phone: e.target.value }))} type="tel" className={inCls} style={inStyle} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Contact address")}</label>
              <textarea value={draft.address} onChange={e => setDraft(s => ({ ...s, address: e.target.value }))} rows={2} className={`${inCls} resize-y`} style={inStyle} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{saving ? t("Saving…") : t("Save")}</button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Project & phase card ───────────────────────────────────────────────── */
function ProjectPhaseCard({ caseId, project, phase, canChange, onChanged }: {
  caseId: string;
  project?: { _id: string; name: string; code: string; phases?: { name: string }[] } | null;
  phase?: string;
  canChange: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [projects, setProjects] = useState<Array<{ _id: string; name: string; code: string; phases?: { name: string }[] }>>([]);
  const [pid, setPid] = useState(project?._id ?? "");
  const [ph, setPh] = useState(phase ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editing) return;
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, [editing]);
  useEffect(() => { if (!editing) { setPid(project?._id ?? ""); setPh(phase ?? ""); } }, [project, phase, editing]);

  const selected = projects.find((p) => p._id === pid) ?? (project && project._id === pid ? project : undefined);
  const phaseOpts = (selected?.phases ?? []).map((x) => x.name);

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: pid || null, projectPhase: ph || null }),
      });
      if (res.ok) { setEditing(false); onChanged(); }
      else { const d = await res.json(); setErr(d.error ?? "Failed."); }
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  if (!project && !canChange) return null;
  const inStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };
  const inCls = "w-full px-3 py-2 rounded-xl border text-sm focus:outline-none";

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{t("Project & Phase")}</span>
        {canChange && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {project ? t("Change") : `+ ${t("Assign")}`}
          </button>
        )}
      </div>
      {!editing ? (
        <div className="px-5 py-4 text-sm">
          {project ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb,var(--accent) 12%,transparent)", color: "var(--accent)" }}>{project.code}</span>
              <span className="font-semibold text-(--text)">{project.name}</span>
              {phase && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{phase}</span>}
            </div>
          ) : (
            <p className="text-xs text-(--muted) italic">{t("Not assigned to a project yet.")}</p>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Project")}</label>
              <select value={pid} onChange={(e) => { setPid(e.target.value); setPh(""); }} className={inCls} style={inStyle}>
                <option value="">{t("— None —")}</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--muted) mb-1">{t("Phase")}</label>
              <select value={ph} onChange={(e) => setPh(e.target.value)} className={inCls} style={inStyle} disabled={!pid || phaseOpts.length === 0}>
                <option value="">{t("— None —")}</option>
                {phaseOpts.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{saving ? t("Saving…") : t("Save")}</button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
interface Props {
  caseId: string;
  canEdit: boolean;          // true for litigation members
  canManageCarePlan?: boolean; // true for social workers
  backHref: string;          // breadcrumb back link
  backLabel?: string;
  dashboardHref?: string;    // optional dashboard link shown before the back link
}

export default function CaseDetailPage({ caseId, canEdit: canEditProp, canManageCarePlan = false, backHref, backLabel = "Cases", dashboardHref }: Props) {
  const [caseData, setCaseData]   = useState<PopulatedCase | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [hearingDate, setHearingDate] = useState<string | undefined>();
  const [timelineKey, setTimelineKey] = useState(0);
  const [tab, setTab] = useState<"legal" | "icp" | "review" | "finance">("legal");
  const t = useT();
  // The current user — used to grant the case creator full edit rights on the
  // detail page regardless of their role (the server enforces the same rule).
  const [meId, setMeId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then(d => { if (d.user) { setMeId(String(d.user._id)); setMeRole(d.user.role ?? ""); } })
      .catch(() => {});
  }, []);

  async function fetchCase() {
    try {
      const res  = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load case."); return; }
      setCaseData(data.case);
      setHearingDate(data.case.nextHearingDate);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch only when the case id changes; fetchCase is stable enough for
  // this purpose and intentionally excluded from the dep list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCase(); }, [caseId]);

  if (loading) return (
    <div className="space-y-5">
      <Skeleton w={140} h={11} />
      <div className="rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <Skeleton w="60%" h={20} />
        <Skeleton w="35%" h={11} />
        <div className="flex gap-2 pt-2">
          <Skeleton w={70} h={22} rounded="full" />
          <Skeleton w={90} h={22} rounded="full" />
          <Skeleton w={60} h={22} rounded="full" />
        </div>
      </div>
      <SkeletonStats count={4} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={4} />
    </div>
  );

  if (error || !caseData) return (
    <div className="py-16 text-center rounded-2xl border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-sm" style={{ color: "var(--error-text)" }}>{error || t("Case not found.")}</p>
      <Link href={backHref} className="mt-3 inline-block text-sm hover:underline" style={{ color: "var(--accent)" }}>{t("← Back")}</Link>
    </div>
  );

  const c  = caseData;
  // Effective edit permission: the role-derived prop OR "I created this case".
  // The creator can edit everything on the page; the server enforces the same.
  const isCreator = meId != null && c.createdBy != null && String(c.createdBy) === meId;
  const canEdit = canEditProp || isCreator;
  // Bump on every successful mutation so collapsible children re-render
  // their internal state (e.g. close their own forms after a save).
  const refresh = () => { setTimelineKey(k => k + 1); fetchCase(); };
  void timelineKey; // referenced for layout consistency only

  return (
    <div className="space-y-6 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm flex-wrap">
        {dashboardHref && (
          <>
            <Link href={dashboardHref}
              className="font-medium underline underline-offset-2 transition-colors hover:opacity-80"
              style={{ color: "var(--accent)" }}>
              {t("Dashboard")}
            </Link>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0 text-(--muted)"><path d="M6 4l4 4-4 4"/></svg>
          </>
        )}
        <Link href={backHref}
          className="text-(--muted) hover:text-(--text) transition-colors">
          {backLabel}
        </Link>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0 text-(--muted)"><path d="M6 4l4 4-4 4"/></svg>
        <span className="font-mono font-semibold text-(--text)">{c.caseNumber}</span>
      </nav>

      {/* Main column + right rail (case discussion from chat). */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">

      {/* Header */}
      <div className="rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

        {/* Case number banner */}
        <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 25%,transparent)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }}>
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
              <polyline points="10 2 10 5 13 5"/>
            </svg>
            <span className="text-sm font-bold font-mono tracking-wide" style={{ color: "var(--accent)" }}>
              {c.caseNumber}
            </span>
          </div>
          {c.courtCaseNumber && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold"
              title={t("Court case number")}
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
              ⚖ {c.courtCaseNumber}
            </span>
          )}
          <StatusEditor caseId={c._id} value={c.status} canEdit={canEdit} onChanged={fetchCase} />
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
            {c.path === "criminal" ? `⚖ ${t("Criminal")}` : `🏛 ${t("High Court")}`}
          </span>
          {c.status === "Disposal" && c.disposedAt && (
            <span className="text-xs px-2.5 py-1 rounded-full"
              title={c.disposalReason ? `${t("Reason")}: ${c.disposalReason}` : undefined}
              style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
              ✓ {t("Completed")} {fmtDate(c.disposedAt)}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <TitleEditor caseId={c._id} value={c.caseTitle} canEdit={canEdit} onChanged={fetchCase} />
            <p className="text-xs text-(--muted) mt-1">{t("Filed")} {fmtDate(c.createdAt)} · {t("Last updated")} {fmtDate(c.updatedAt)}</p>
          </div>

          {hearingDate && (
            <div className="shrink-0 text-right rounded-xl p-3 border"
              style={{ background: "color-mix(in srgb,var(--accent) 8%,transparent)", borderColor: "color-mix(in srgb,var(--accent) 25%,transparent)" }}>
              <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{t("Next Hearing")}</p>
              <p className="text-base font-bold mt-0.5" style={{ color: "var(--accent)" }}>
                {new Date(hearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
              <p className="text-[11px] text-(--muted)">{new Date(hearingDate).getFullYear()}</p>
            </div>
          )}
        </div>

        {/* Parties row. Social workers (and director/superadmin viewing this
            via the SW UI) get a clickable Community tile that opens the full
            community-member detail page — profile, cases, care plans, history
            — without leaving the case context. Other roles see the same tile
            as plain text since they don't have access to that page. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Community + Social Worker can be assigned (or changed / cleared)
              after registration — both are often created/linked later. The
              lead litigation member is managed in the Litigation Team panel. */}
          <PersonAssignEditor
            caseId={c._id} label="Victim/Client" field="community" role="community"
            person={c.community} canEdit={canEdit}
            href={canManageCarePlan && c.community?._id ? `/socialworker/community/${c.community._id}` : undefined}
            onChanged={fetchCase} />
          <div className="rounded-xl p-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{t("Litigation Member")}</p>
            {c.litigationMember
              ? <>
                  <p className="text-sm font-semibold text-(--text)"><Translatable text={c.litigationMember.name} preLine={false} /></p>
                  <p className="text-xs text-(--muted)">{c.litigationMember.email}</p>
                </>
              : <p className="text-xs text-(--muted) italic">{t("Not assigned")}</p>}
          </div>
          <PersonAssignEditor
            caseId={c._id} label="Social Worker" field="socialWorker" role="socialworker"
            person={c.socialWorker} canEdit={canEdit} onChanged={fetchCase} />
        </div>

        {/* Hearing date editor (litigation only) */}
        {canEdit && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mb-2">{t("Update Next Hearing Date")}</p>
            <UpdateHearingForm
              caseId={c._id}
              current={hearingDate}
              onSuccess={(d) => setHearingDate(d + "T00:00:00.000Z")}
            />
          </div>
        )}
      </div>

      {/* The detail cards (court/parties, point of contact, project & funding,
          litigation team, cheatcodes, enquiry, case management) used to stack
          here and overwhelm the page. They now live inside the tabs below:
          legal-management cards under "Legal Progress", funding under "Finance". */}

      {/* Tab nav — graphic segmented control */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {([
          ["legal",   "⚖️", "Legal Progress"],
          ["icp",     "🧑‍⚕️", "Care Plan"],
          ["review",  "🗓️", "Review & Progress"],
          ["finance", "💰", "Finance"],
        ] as const).map(([k, icon, label]) => {
          const sel = tab === k;
          return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: sel ? "var(--accent)" : "transparent",
                color: sel ? "var(--accent-contrast)" : "var(--muted)",
                boxShadow: sel ? "var(--shadow-sm)" : "none",
              }}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-center leading-tight">{t(label)}</span>
            </button>
          );
        })}
      </div>

      {tab === "icp" ? (
        c.community?._id ? (
          <IcpForm caseId={c._id} canEdit={canManageCarePlan} caseNumber={c.caseNumber} caseTitle={c.caseTitle} />
        ) : (
          <p className="text-sm text-(--muted) px-1">{t("No community member linked to this case yet.")}</p>
        )
      ) : tab === "review" ? (
        <div className="space-y-4">
          <CaseReviewSection caseId={c._id} caseCreatedAt={c.createdAt} caseStatus={c.status} />
          <CaseReviewMeetings caseId={c._id} creatorId={c.createdBy ? String(c.createdBy) : undefined} />
        </div>
      ) : tab === "finance" ? (
        <div className="space-y-4">
          {/* Project & funding-phase this case is filed under. */}
          <ProjectPhaseCard
            caseId={c._id}
            project={c.project}
            phase={c.projectPhase}
            canChange={isCreator || ["director", "superadmin", "administrator"].includes(meRole)}
            onChanged={fetchCase}
          />
          <CaseFinanceTab caseId={c._id} />
        </div>
      ) : (
        <LegalProgressBlock />
      )}

      {/* Permanent deletion — only rendered for director / superadmin or the
          case creator (gated inside the component via /api/users/me). */}
      <CaseDangerZone caseId={c._id} caseNumber={c.caseNumber} createdBy={c.createdBy} backHref={backHref} />
        </div>

        {/* Right rail — case discussion (chat) with the cheatcode / strategy
            notes pinned right below it. */}
        <aside className="space-y-4">
          <CaseChatPanel caseId={caseId} />
          <CaseCheatcodes caseId={c._id} comments={c.caseComments ?? []} onChanged={fetchCase} />
        </aside>
      </div>
    </div>
  );

  function LegalProgressBlock() {
    // Build the ordered stage list for the stepper. Each entry surfaces
    // whether the stage is "done" so the stepper can compute current
    // position + which buttons to enable. We deliberately keep this list
    // in render scope so a state mutation (after PATCH + re-fetch) reflows
    // through naturally.
    const stages = c.path === "criminal"
      ? [
          { id: "fir",         label: "FIR Filed",         done: Boolean(c.criminalPath?.firFiled),
            at: c.criminalPath?.firDoc?.uploadedAt },
          { id: "chargesheet", label: "Chargesheet Filed", done: Boolean(c.criminalPath?.chargesheetFiled),
            at: c.criminalPath?.chargesheetDate },
          { id: "charges",     label: "Charges Framed",    done: Boolean(c.criminalPath?.chargesFramed) },
          { id: "verdict",     label: "Verdict",           done: Boolean(c.criminalPath?.verdictDate),
            at: c.criminalPath?.verdictDate },
        ]
      : [
          { id: "petitionFiled",       label: "Petition Filed",        done: Boolean(c.highCourtPath?.petitionFiled?.filed),
            at: c.highCourtPath?.petitionFiled?.filedAt },
          { id: "supportingAffidavit", label: "Supporting Affidavit",  done: Boolean(c.highCourtPath?.supportingAffidavit?.filed),
            at: c.highCourtPath?.supportingAffidavit?.filedAt },
          { id: "admission",           label: "Admission",             done: Boolean(c.highCourtPath?.admission?.filed),
            at: c.highCourtPath?.admission?.filedAt },
          { id: "counterAffidavit",    label: "Counter Affidavit",     done: Boolean(c.highCourtPath?.counterAffidavit?.filed),
            at: c.highCourtPath?.counterAffidavit?.filedAt },
          { id: "rejoinder",           label: "Rejoinder",             done: Boolean(c.highCourtPath?.rejoinder?.filed),
            at: c.highCourtPath?.rejoinder?.filedAt },
          { id: "pleaClose",           label: "Plea Close",            done: Boolean(c.highCourtPath?.pleaClose?.filed),
            at: c.highCourtPath?.pleaClose?.filedAt },
          { id: "inducement",          label: "Inducement",            done: Boolean(c.highCourtPath?.inducement?.filed),
            at: c.highCourtPath?.inducement?.filedAt },
        ];

    void stages; // stages computed for legacy reference; the workflow graph
                  // is now the single source of truth — clicking a stage
                  // node toggles the same boolean the stepper used to.

    const docCount        = (c.documents ?? []).length;
    const appearanceCount = (c.courtAppearances ?? []).length;
    const diaryCount      = (c.caseDiary ?? []).length;
    const auditCount      = (c.auditLog ?? []).length;

    return (
      <div className="space-y-4">
        {/* Case context cards — moved out of the always-visible header so the
            top of the page stays clean. They live here under Legal Progress. */}
        <CourtPartiesSubjectCard caseId={c._id} caseData={c} canEdit={canEdit} onChanged={fetchCase} />
        <PointOfContactCard caseId={c._id} poc={c.pointOfContact} canEdit={canEdit} onChanged={fetchCase} />
        <LitigationTeamPanel caseId={c._id} caseData={c} canEdit={canEdit} onChanged={fetchCase} />
        {/* Cheatcode / strategy notes now live in the right rail beside the case
            discussion (see the <aside> above), not here. */}
        <EnquirySummary caseId={c._id} enquiry={c.enquiry} district={c.district} causeTitle={c.causeTitle}
          canEdit={canEdit} onChanged={fetchCase} />
        <CaseManagementSection caseId={c._id} caseData={c} canEdit={canEdit} onChanged={fetchCase} />

        {/* FIR alert (chargesheet timer) — keep visible, it's a deadline. */}
        <FirAlert caseData={c} />

        {/* Workflow graph is the single source of truth for stages.
            Clicking any mappable node (FIR / Chargesheet / Charges / Verdict
            for criminal; each step for HC) toggles its done-ness. The old
            standalone stepper + duplicate timeline are gone. */}
        {(() => {
          // A bail matter is a dedicated Bail Application (BA / ABA) case type.
          // For those, the bail tree IS the case workflow.
          const isBailType = /^(BA|ABA)$/i.test(c.caseType ?? "") || /bail/i.test(c.caseType ?? "");
          const bailIsPrimary = c.path === "criminal" && isBailType;
          // On other criminal cases bail is OPTIONAL — only show the bail track
          // once it's actually been started (so cases that never need bail don't
          // get a stray tree). A small opt-in button below lets the team start
          // it when a bail application is filed.
          const bailStarted = !!c.criminalPath?.bailTrack?.bailApplied
            || !!c.criminalPath?.bailTrack?.bailDecision;
          const showSecondaryBail = c.path === "criminal" && !isBailType && bailStarted;
          const showStartBail = c.path === "criminal" && !isBailType && !bailStarted && canEdit;
          const crimProp = c.criminalPath as unknown as React.ComponentProps<typeof CaseWorkflowGraph>["criminalPath"];
          // Which of the four flows to render: stored `flow` wins, else derive
          // from the case type via the eCourts catalog, else fall back to path.
          const caseFlow: CaseFlow = (c as { flow?: CaseFlow }).flow
            ?? lookupECourtType(c.caseType ?? "")?.flow
            ?? (c.path === "criminal" ? "criminal" : "writ");
          return (
            <>
              <CaseWorkflowGraph
                path={c.path}
                flow={bailIsPrimary ? "criminal" : caseFlow}
                courtType={c.courtType}
                bailMatter={bailIsPrimary}
                criminalPath={crimProp}
                highCourtPath={c.highCourtPath as unknown as React.ComponentProps<typeof CaseWorkflowGraph>["highCourtPath"]}
                firFiled={c.criminalPath?.firFiled}
                createdAt={c.createdAt}
                canEdit={canEdit}
                caseId={c._id}
                stageMarks={(c as { stageMarks?: Record<string, string> }).stageMarks}
                pinnedNotes={(c.caseComments ?? []).filter(n => n.pinned).map(n => ({ _id: n._id, text: n.text, byName: n.byName }))}
                onChanged={refresh}
              />
              {showSecondaryBail && (
                <CaseWorkflowGraph
                  path="criminal"
                  flow="criminal"
                  bailMatter
                  criminalPath={crimProp}
                  firFiled={c.criminalPath?.firFiled}
                  createdAt={c.createdAt}
                  canEdit={canEdit}
                  caseId={c._id}
                  stageMarks={(c as { stageMarks?: Record<string, string> }).stageMarks}
                  onChanged={refresh}
                />
              )}
              {showStartBail && <StartBailTrackButton caseId={c._id} onChanged={refresh} />}
            </>
          );
        })()}

        {/* High Court 4-stage tracker + named document slots. Only the Writ /
            High Court flow uses these; criminal/family/civil flows are fully
            covered by their own workflow graph above. */}
        {(((c as { flow?: CaseFlow }).flow
            ?? lookupECourtType(c.caseType ?? "")?.flow
            ?? (c.path === "criminal" ? "criminal" : "writ")) === "writ") && (
          <HighCourtStagesAndDocs caseId={c._id} caseData={c} canEdit={canEdit} onChanged={refresh} />
        )}

        {/* Verdict — final order text for criminal matters. */}
        {c.path === "criminal" && (
          <VerdictEditor caseId={c._id} verdict={c.criminalPath?.verdict} verdictDate={c.criminalPath?.verdictDate}
            canEdit={canEdit} onChanged={refresh} />
        )}

        {/* Documents — visible to everyone; editors get upload + rename/delete. */}
        <CollapsibleSection
          title={t("Documents")}
          badge={docCount > 0 ? <CountPill n={docCount} /> : null}
          defaultOpen={docCount > 0}>
          <div className="space-y-4">
            <CaseDocsList
              caseId={c._id}
              docs={c.documents ?? []}
              canEdit={canEdit}
              onChanged={refresh}
            />
            {canEdit && (
              <CaseDocsUpload caseId={c._id} caseType={c.path} onUploaded={refresh} />
            )}
          </div>
        </CollapsibleSection>

        {/* Court appearances — per-hearing structured log. */}
        <CollapsibleSection
          title={t("Court appearances")}
          badge={appearanceCount > 0 ? <CountPill n={appearanceCount} /> : null}
          defaultOpen={true}>
          <CourtAppearancesSection
            caseId={c._id}
            appearances={c.courtAppearances ?? []}
            canEdit={canEdit}
            onChanged={refresh}
          />
        </CollapsibleSection>

        {/* Case Diary — chronological notes the field team adds while
            working a case. Editors get the inline AddDiaryForm; everyone
            else sees the entries read-only. */}
        <CollapsibleSection
          title={t("Case diary")}
          badge={diaryCount > 0 ? <CountPill n={diaryCount} /> : null}
          defaultOpen={true}>
          <DiaryList entries={c.caseDiary ?? []} />
          {canEdit && <AddDiaryForm caseId={c._id} onSuccess={refresh} />}
        </CollapsibleSection>

        {/* Activity / audit log — who changed what, when. Lets multiple
            people working on the case see each other's progress without
            cross-checking the change history manually. */}
        <CollapsibleSection
          title={t("Activity log")}
          badge={auditCount > 0 ? <CountPill n={auditCount} /> : null}
          defaultOpen={false}
          description={t("Every change to this case — stage flips, document uploads, status updates — is recorded here with the user who did it.")}>
          <CaseAuditLog entries={c.auditLog ?? []} />
        </CollapsibleSection>

        {/* Finaliser — sits at the very bottom of the case so it's the last
            action after reviewing everything above. Hidden once the case is
            already in a final state. */}
        {canEdit && !FINAL_CASE_STATUSES.includes(c.status) && (
          <div className="pt-2 flex justify-center items-center gap-3 flex-wrap">
            <DisposeButton caseId={c._id} status={c.status} canEdit={canEdit} onChanged={fetchCase} />
          </div>
        )}
      </div>
    );
  }
}

/** Small pill rendering a count badge in a section header. */
function CaseDocsList({
  caseId,
  docs,
  canEdit,
  onChanged,
}: {
  caseId: string;
  docs: DocMeta[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const t = useT();

  if (!docs.length) {
    return <p className="text-sm text-(--muted) px-1 pb-1">{t("No documents attached yet.")}</p>;
  }

  async function startEdit(doc: DocMeta) {
    setEditingId(doc._id ?? null);
    setEditLabel(doc.label);
    setErr("");
  }

  async function saveEdit(docId: string) {
    const label = editLabel.trim();
    if (!label) { setErr("Label cannot be empty."); return; }
    setSavingId(docId); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editDocument: { docId, label } }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Save failed."); return; }
      setEditingId(null);
      onChanged();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Delete this document from the case? This cannot be undone.")) return;
    setDeletingId(docId); setErr("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteDocument: { docId } }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Delete failed."); return; }
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      {docs.map((doc) => {
        const docId = doc._id ?? "";
        const isEditing = editingId === docId;
        const isSaving = savingId === docId;
        const isDeleting = deletingId === docId;
        return (
          <div key={docId}
            className="rounded-xl border px-3 py-2.5 flex items-start gap-3"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            {/* File icon */}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 mt-0.5 shrink-0 text-(--muted)">
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
              <polyline points="10 2 10 5 13 5"/>
            </svg>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(docId); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 px-2 py-1 rounded-lg border text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--accent)", color: "var(--text)" }}
                    maxLength={200}
                  />
                  <button onClick={() => saveEdit(docId)} disabled={isSaving}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    {isSaving ? "…" : t("Save")}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                    {t("Cancel")}
                  </button>
                </div>
              ) : (
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--accent)" }}>
                  {doc.label}
                </a>
              )}
              <p className="text-[12px] text-(--muted) mt-0.5">
                {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            {canEdit && !isEditing && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(doc)}
                  className="text-[12px] px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                  {t("Rename")}
                </button>
                <button onClick={() => deleteDoc(docId)} disabled={isDeleting}
                  className="text-[12px] px-2 py-1 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                  {isDeleting ? "…" : t("Delete")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CountPill({ n }: { n: number }) {
  return (
    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
      {n}
    </span>
  );
}

/** Read-only diary list — pulled out of the old Timeline so the case-diary
 *  section can stand on its own without the broader chronological view. */
function DiaryList({ entries }: { entries: Array<{ _id: string; date: string; findings: string }> }) {
  const t = useT();
  if (!entries.length) {
    return <p className="text-sm text-(--muted) px-1">{t("No diary entries yet.")}</p>;
  }
  // Newest first — matches the audit log convention.
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <ul className="space-y-2">
      {sorted.map((e) => (
        <li key={e._id}
          className="rounded-xl border px-3 py-2.5"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide">
            {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="text-sm text-(--text) mt-1 leading-relaxed"><Translatable text={e.findings} /></p>
        </li>
      ))}
    </ul>
  );
}
