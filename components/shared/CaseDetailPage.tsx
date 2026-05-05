"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CaseDocsUpload from "@/components/shared/CaseDocsUpload";
import IcpForm from "@/components/icp/IcpForm";
import CaseWorkflowGraph from "@/components/shared/CaseWorkflowGraph";
import CaseAuditLog from "@/components/shared/CaseAuditLog";
import CaseCheatcodes from "@/components/shared/CaseCheatcodes";
import HighCourtStagesAndDocs from "@/components/shared/HighCourtStagesAndDocs";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { Skeleton, SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";

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
  district?: string;
  causeTitle?: string;
  courtCaseNumber?: string;
  courtName?: string;
  relevantSections?: string;
  bailAndAppearanceStatus?: string;
  stage?: string;
  compensationStatus?: string;
  // Court-type-aware fields populated by CreateLitigationCaseForm.
  courtType?: "supreme" | "highcourt" | "district" | "other";
  state?: string;
  parties?: { petitioners?: string[]; respondents?: string[] };
  subject?: { courtThey?: string; ourPoints?: string; reason?: string };
  eCourtLink?: string;
  filingStatus?: "drafting" | "filing" | "filed";
  reportingStatus?: { status: "pending" | "success" | "conflict"; defectNote?: string; defectDeadline?: string };
  community?: { _id: string; name: string; email: string; phone?: string };
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
function fmtTimelineTitle(d: string | Date) {
  const date = new Date(d);
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}\n${date.getFullYear()}`;
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

const OCR_STYLE: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "var(--bg-secondary)", text: "var(--muted)"         },
  processing: { bg: "var(--warning-bg)",   text: "var(--warning-text)"  },
  processed:  { bg: "var(--success-bg)",   text: "var(--success-text)"  },
  failed:     { bg: "var(--error-bg)",     text: "var(--error-text)"    },
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

function DocLink({ doc }: { doc: DocMeta }) {
  const ocr = OCR_STYLE[doc.ocrStatus ?? "pending"] ?? OCR_STYLE.pending;
  // Derive a sensible filename for the browser to suggest on download.
  const downloadName = (() => {
    try {
      const tail = decodeURIComponent(new URL(doc.url, "http://x").pathname.split("/").pop() ?? "");
      return tail || doc.label;
    } catch {
      return doc.label;
    }
  })();
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-t first:border-0"
      style={{ borderColor: "var(--border)" }}>
      <a href={doc.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm font-medium hover:underline underline-offset-2 min-w-0 truncate"
        style={{ color: "var(--accent)" }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5 shrink-0">
          <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
          <polyline points="10 2 10 5 13 5"/>
        </svg>
        <span className="truncate">{doc.label}</span>
      </a>
      <div className="flex items-center gap-1.5 shrink-0">
        <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Preview"
          aria-label="Preview document"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors hover:bg-(--bg-secondary)"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z"/>
            <circle cx="8" cy="8" r="2"/>
          </svg>
        </a>
        <a href={doc.url} download={downloadName} title="Download"
          aria-label="Download document"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors hover:bg-(--bg-secondary)"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3"/>
            <path d="M2.5 12.5v1A1.5 1.5 0 004 15h8a1.5 1.5 0 001.5-1.5v-1"/>
          </svg>
        </a>
        {doc.ocrStatus && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: ocr.bg, color: ocr.text }}>
            OCR: {doc.ocrStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function StepBadge({ filed, date }: { filed: boolean; date?: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={filed
        ? { background: "var(--success-bg)", color: "var(--success-text)" }
        : { background: "var(--bg-secondary)", color: "var(--muted)" }}>
      {filed ? (date ? `Filed ${fmtDate(date)}` : "Filed") : "Pending"}
    </span>
  );
}

/* The old buildTimeline + Aceternity Timeline render were removed — the
 * workflow graph is now the single chronological view. Document uploads,
 * court appearances, and case-diary entries each live in their own
 * dedicated collapsible section, and the audit log captures every change
 * across them. EventCard / DocLink are kept for the FIR alert and HC
 * step rendering. */

/* ── Add diary form ─────────────────────────────────────────────────────── */
function AddDiaryForm({ caseId, onSuccess }: { caseId: string; onSuccess: () => void }) {
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
    <EventCard color="var(--accent)" label="Add Diary Entry">
      <form onSubmit={submit} className="space-y-3">
        <textarea value={findings} onChange={e => setFindings(e.target.value)} required rows={3}
          placeholder="Write today's case findings, observations, or proceedings…"
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
            {saving ? "Saving…" : "Add Entry"}
          </button>
        </div>
        {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
      </form>
    </EventCard>
  );
}

/* ── Update hearing form ─────────────────────────────────────────────────── */
function UpdateHearingForm({ caseId, current, onSuccess }: { caseId: string; current?: string; onSuccess: (date: string) => void }) {
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
        {saving ? "Saving…" : "Save & Sync Calendar"}
      </button>
      {err && <p className="text-xs" style={{ color: "var(--error-text)" }}>{err}</p>}
    </form>
  );
}

/* ── Progress stepper ────────────────────────────────────────────────────── */
function CaseProgressStepper({ caseData }: { caseData: PopulatedCase }) {
  if (caseData.path === "criminal" && caseData.criminalPath) {
    const cp = caseData.criminalPath;
    const steps = [
      { label: "FIR",         done: cp.firFiled },
      { label: "Chargesheet", done: cp.chargesheetFiled },
      { label: "Cognizance",  done: !!cp.cognizanceOrderDoc },
      { label: "Charges",     done: cp.chargesFramed },
      { label: "Trial",       done: (cp.trial?.prosecutionWitnesses?.length ?? 0) > 0 },
      { label: "Verdict",     done: !!cp.verdict },
    ];
    return <StepperRow steps={steps} />;
  }
  if (caseData.path === "highcourt" && caseData.highCourtPath) {
    const hcp = caseData.highCourtPath;
    const steps = [
      { label: "Petition",      done: hcp.petitionFiled.filed },
      { label: "Affidavit",     done: hcp.supportingAffidavit.filed },
      { label: "Admission",     done: hcp.admission.filed },
      { label: "Counter Aff.",  done: hcp.counterAffidavit.filed },
      { label: "Rejoinder",     done: hcp.rejoinder.filed },
      { label: "Plea Close",    done: hcp.pleaClose.filed },
      { label: "Inducement",    done: hcp.inducement.filed },
    ];
    return <StepperRow steps={steps} />;
  }
  return null;
}

function StepperRow({ steps }: { steps: { label: string; done: boolean }[] }) {
  const doneCount = steps.filter(s => s.done).length;
  return (
    <div className="rounded-2xl border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-(--text)">Progress</p>
        <p className="text-xs text-(--muted)">{doneCount}/{steps.length} steps</p>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-4" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%`, background: "var(--accent)" }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={s.done
              ? { background: "var(--success-bg)", color: "var(--success-text)" }
              : { background: "var(--bg-secondary)", color: "var(--muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: s.done ? "var(--success)" : "var(--muted)" }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── FIR alert ──────────────────────────────────────────────────────────── */
function FirAlert({ caseData }: { caseData: PopulatedCase }) {
  if (caseData.path !== "criminal" || !caseData.criminalPath?.firFiled || !caseData.criminalPath.firDoc) return null;
  const firDate = new Date(caseData.criminalPath.firDoc.uploadedAt);
  const days    = Math.floor((Date.now() - firDate.getTime()) / 86_400_000);
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
function EnquirySummary({ enquiry, district, causeTitle }: { enquiry?: Enquiry; district?: string; causeTitle?: string }) {
  // Skip the whole block if there's truly nothing to show — keeps cases that
  // were filed before the structured intake form was rolled out from showing
  // an empty card.
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
  if (!anything) return null;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center gap-2"
        style={{ background: "color-mix(in srgb, var(--info) 8%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--info)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--info-text)" }}>Case Enquiry — Intake Facts</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {has(enquiry?.victimName) && (
          <Line label="Victim">
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
          <Line label="Filer">
            {enquiry!.filerName}
            {has(enquiry?.filerPhone) && (
              <span className="text-xs text-(--muted)"> · {enquiry!.filerPhone}</span>
            )}
            {has(enquiry?.relationshipWithVictim) && (
              <span className="block text-xs text-(--muted) mt-0.5">Relation to victim: {enquiry!.relationshipWithVictim}</span>
            )}
          </Line>
        )}
        {has(district) && <Line label="District">{district}</Line>}
        {has(causeTitle) && <Line label="Cause Title">{causeTitle}</Line>}
        {has(enquiry?.policeStation) && <Line label="Police Station">{enquiry!.policeStation}</Line>}
        {has(enquiry?.firNumber) && <Line label="FIR No.">{enquiry!.firNumber}</Line>}
        {has(enquiry?.placeOfOccurrence) && <Line label="Place of Occurrence">{enquiry!.placeOfOccurrence}</Line>}
        {has(enquiry?.incidentDateTime) && (
          <Line label="Date / time of incident">{fmtDateTime(enquiry!.incidentDateTime!)}</Line>
        )}
        {has(enquiry?.accusedNames) && (
          <Line label="Accused" wide>
            {enquiry!.accusedNames}
            {has(enquiry?.accusedCount) && (
              <span className="text-xs text-(--muted)"> · {enquiry!.accusedCount} total</span>
            )}
          </Line>
        )}
        {has(enquiry?.issues) && (
          <Line label="Issues" wide>
            <span className="flex flex-wrap gap-1.5">
              {enquiry!.issues!.map(i => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{i}</span>
              ))}
            </span>
          </Line>
        )}
        {has(enquiry?.factsOfTheCase) && (
          <Line label="Facts of the case" wide>
            <span className="block whitespace-pre-line text-(--text)">{enquiry!.factsOfTheCase}</span>
          </Line>
        )}
      </div>
    </div>
  );
}

function Line({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide">{label}</p>
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
          Case Management — Court Details
        </span>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {anything ? "Edit" : "+ Add details"}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {has(caseData.courtName) && <Line label="Court Name">{caseData.courtName}</Line>}
          {has(caseData.courtCaseNumber) && <Line label="Court Case / Registration No.">{caseData.courtCaseNumber}</Line>}
          {has(caseData.relevantSections) && <Line label="Relevant Sections" wide>{caseData.relevantSections}</Line>}
          {has(caseData.stage) && <Line label="Stage of the Case">{caseData.stage}</Line>}
          {has(caseData.bailAndAppearanceStatus) && <Line label="Bail / Accused Appearance">{caseData.bailAndAppearanceStatus}</Line>}
          {has(caseData.compensationStatus) && <Line label="Compensation" wide>{caseData.compensationStatus}</Line>}
          {!anything && (
            <p className="text-xs text-(--muted) italic sm:col-span-2">No court details recorded yet.</p>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CmInput label="Court Name" value={draft.courtName}
              onChange={v => setDraft(s => ({ ...s, courtName: v }))}
              placeholder="CJM Court, Patna" />
            <CmInput label="Court Case / Registration No." value={draft.courtCaseNumber}
              onChange={v => setDraft(s => ({ ...s, courtCaseNumber: v }))}
              placeholder="GR 123/2026" />
            <div className="sm:col-span-2">
              <CmInput label="Relevant Sections" value={draft.relevantSections}
                onChange={v => setDraft(s => ({ ...s, relevantSections: v }))}
                placeholder="BNS 64, 351 r/w POCSO §6" />
            </div>
            <CmInput label="Stage of the Case" value={draft.stage}
              onChange={v => setDraft(s => ({ ...s, stage: v }))}
              placeholder="Evidence / Arguments / Judgment" />
            <CmInput label="Bail / Accused Appearance" value={draft.bailAndAppearanceStatus}
              onChange={v => setDraft(s => ({ ...s, bailAndAppearanceStatus: v }))}
              placeholder="Bail granted; accused appearing" />
            <div className="sm:col-span-2">
              <CmInput label="Compensation status" value={draft.compensationStatus}
                onChange={v => setDraft(s => ({ ...s, compensationStatus: v }))}
                placeholder="₹3,00,000 awarded; disbursement pending" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CmInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-(--muted) mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
    </div>
  );
}

/* ── Single editable court appearance entry ─────────────────────────────── */
function AppearanceEntry({ caseId, ap, canEdit, onChanged }: {
  caseId: string; ap: CourtAppearance; canEdit: boolean; onChanged: () => void;
}) {
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
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{ap.currentStatus}</span>
            )}
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-(--text) whitespace-pre-line leading-relaxed">{ap.dailyOrderBrief}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-(--muted)">
            {ap.lastHearingDate && <span>Last hearing: {fmtDate(ap.lastHearingDate)}</span>}
            {ap.nextHearingDate && <span className="font-semibold" style={{ color: "var(--accent)" }}>Next hearing: {fmtDate(ap.nextHearingDate)}</span>}
          </div>
          {ap.remarks && (
            <p className="text-xs text-(--muted) italic border-t pt-2" style={{ borderColor: "var(--border)" }}>
              Remarks: {ap.remarks}
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
        <p className="text-sm font-semibold text-(--text)">Edit Appearance</p>
        <button type="button" onClick={() => setEditing(false)}
          className="text-xs text-(--muted) hover:text-(--text)">Cancel</button>
      </div>
      {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Date of Appearance</label>
          <input type="date" value={draft.date} onChange={e => setDraft(s => ({ ...s, date: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Current Status</label>
          <input value={draft.currentStatus} onChange={e => setDraft(s => ({ ...s, currentStatus: e.target.value }))}
            placeholder="e.g. Adjourned, Argued, Reserved"
            className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">Daily Order Brief *</label>
          <textarea value={draft.dailyOrderBrief} onChange={e => setDraft(s => ({ ...s, dailyOrderBrief: e.target.value }))} rows={3}
            className={`${inputCls} resize-y`} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Last Date of Hearing</label>
          <input type="date" value={draft.lastHearingDate} onChange={e => setDraft(s => ({ ...s, lastHearingDate: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Next Date of Hearing</label>
          <input type="date" value={draft.nextHearingDate} onChange={e => setDraft(s => ({ ...s, nextHearingDate: e.target.value }))}
            className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">Remarks</label>
          <input value={draft.remarks} onChange={e => setDraft(s => ({ ...s, remarks: e.target.value }))}
            placeholder="Optional comment" className={inputCls} style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          Cancel
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
  const sorted = [...appearances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-(--text)">Case History</h2>
        <p className="text-xs text-(--muted)">{sorted.length} appearance{sorted.length === 1 ? "" : "s"} logged</p>
      </div>

      {sorted.length === 0 && !canEdit && (
        <p className="text-sm text-(--muted) italic px-1">No court appearances logged yet.</p>
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
        + Log Court Appearance
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-(--text)">Log Court Appearance</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }}
          className="text-xs text-(--muted) hover:text-(--text)">Cancel</button>
      </div>
      {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Date of Appearance *</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Current Status</label>
          <input value={currentStatus} onChange={e => setCurrentStatus(e.target.value)}
            placeholder="e.g. Adjourned, Argued, Reserved"
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">Daily Order Brief *</label>
          <textarea required value={dailyOrderBrief} onChange={e => setDailyOrderBrief(e.target.value)} rows={3}
            placeholder="What the court ordered today, what was argued, who appeared…"
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-y"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Last Date of Hearing</label>
          <input type="date" value={lastHearingDate} onChange={e => setLastHearingDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) mb-1">Next Date of Hearing</label>
          <input type="date" value={nextHearingDate} onChange={e => setNextHearingDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-(--muted) mb-1">Remarks</label>
          <input value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Optional comment"
            className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>
      </div>
      <button type="submit" disabled={saving || !dailyOrderBrief.trim()}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {saving ? "Saving…" : "Save Appearance"}
      </button>
    </form>
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

  const courtTypeLabel = caseData.courtType === "supreme"   ? "Supreme Court"
                       : caseData.courtType === "highcourt" ? "High Court"
                       : caseData.courtType === "district"  ? "Civil / District Court"
                       : caseData.courtType === "other"     ? "Tribunal / Forum"
                       : null;
  const filingLabel = caseData.filingStatus === "drafting" ? "Drafting"
                    : caseData.filingStatus === "filing"   ? "Filing"
                    : caseData.filingStatus === "filed"    ? "Filed"
                    : null;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center gap-2"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--accent)" }}>Court &amp; Parties</span>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Court row */}
        {showCourt && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {courtTypeLabel && <Line label="Court Type">{courtTypeLabel}</Line>}
            {has(caseData.state) && <Line label="State">{caseData.state}</Line>}
            {has(caseData.courtName) && (
              <div className="sm:col-span-3">
                <Line label="Court / Forum" wide>{caseData.courtName}</Line>
              </div>
            )}
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

        {/* Subject */}
        {showSubject && (
          <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide">Subject</p>
            {has(s?.courtThey) && (
              <Line label="Subject of the court" wide>
                <span className="block whitespace-pre-line">{s!.courtThey}</span>
              </Line>
            )}
            {has(s?.ourPoints) && (
              <Line label="Our points" wide>
                <span className="block whitespace-pre-line">{s!.ourPoints}</span>
              </Line>
            )}
          </div>
        )}

        {/* Filing + e-Court row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 pt-3 border-t text-sm"
          style={{ borderColor: "var(--border)" }}>
          {showFiling && filingLabel && <Line label="Filing Status">{filingLabel}</Line>}
          {r?.status && (
            <Line label="Reporting">
              {r.status === "conflict" ? "Defect" : r.status === "success" ? "Cleared" : "Pending"}
              {r.defectDeadline && (
                <span className="block text-[11px] text-(--muted) mt-0.5">
                  Cure by {fmtDate(r.defectDeadline)}{r.defectNote ? ` · ${r.defectNote}` : ""}
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
          <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide">Parties</p>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)}
              className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
              {hasParties ? "Edit" : "+ Add parties"}
            </button>
          )}
        </div>
        {hasParties ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {petitioners.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">Petitioner(s)</p>
                <div className="flex flex-wrap gap-1.5">
                  {petitioners.map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}>{name}</span>
                  ))}
                </div>
              </div>
            )}
            {respondents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">Respondent(s) / Defendant(s)</p>
                <div className="flex flex-wrap gap-1.5">
                  {respondents.map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}>{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-(--muted) italic">No parties recorded yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-(--text)">Edit Parties</p>
        <button type="button" onClick={() => { setEditing(false); setPets(petitioners); setResps(respondents); }}
          className="text-xs text-(--muted) hover:text-(--text)">Cancel</button>
      </div>
      {err && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChipField label="Petitioner(s)" chips={pets} draft={petDraft}
          onDraftChange={setPetDraft} onCommit={() => commit("pet")}
          onRemove={i => setPets(pets.filter((_, idx) => idx !== i))} />
        <ChipField label="Respondent(s) / Defendant(s)" chips={resps} draft={respDraft}
          onDraftChange={setRespDraft} onCommit={() => commit("resp")}
          onRemove={i => setResps(resps.filter((_, idx) => idx !== i))} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => { setEditing(false); setPets(petitioners); setResps(respondents); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ChipField({ label, chips, draft, onDraftChange, onCommit, onRemove }: {
  label: string; chips: string[]; draft: string;
  onDraftChange: (s: string) => void; onCommit: () => void; onRemove: (i: number) => void;
}) {
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
        placeholder="Type a name and press Enter"
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
      <Line label="e-Courts link">
        {value ? (
          <span className="flex items-center gap-2">
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="hover:underline truncate inline-block max-w-[160px]" style={{ color: "var(--accent)" }}>
              Open ↗
            </a>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-[10px] hover:underline shrink-0" style={{ color: "var(--muted)" }}>
                Edit
              </button>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-xs text-(--muted) italic">Not set</span>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-[10px] hover:underline" style={{ color: "var(--accent)" }}>
                + Add
              </button>
            )}
          </span>
        )}
      </Line>
    );
  }

  return (
    <div className="sm:col-span-3">
      <label className="block text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">e-Courts link</label>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} type="url"
          placeholder="https://services.ecourts.gov.in/…"
          className="flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <button type="button" onClick={save} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {saving ? "…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
          Cancel
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

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=litigation,director`);
        const d = await r.json();
        const teamIds = new Set(team.map(m => m._id));
        setResults((d.users ?? []).filter((u: LawyerRef) => !teamIds.has(u._id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, team]);

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
          Litigation Team · {team.length}
        </span>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            + Share with another lawyer
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
          <p className="text-xs text-(--muted) italic">No lawyer assigned yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {team.map((m, i) => (
              <li key={m._id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-(--text)">
                    {m.name}
                    {i === 0 && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>Lead</span>
                    )}
                  </p>
                  <p className="text-xs text-(--muted)">{m.email}</p>
                </div>
                {canEdit && i > 0 && (
                  <button type="button" disabled={busyId === m._id} onClick={() => unshare(m._id)}
                    className="text-xs hover:underline" style={{ color: "var(--error)" }}>
                    {busyId === m._id ? "…" : "Remove"}
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
              <p className="text-xs font-semibold text-(--text)">Add a lawyer</p>
              <button type="button" onClick={() => { setAdding(false); setQuery(""); setResults([]); }}
                className="text-xs text-(--muted) hover:text-(--text)">Cancel</button>
            </div>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            {searching && <p className="text-[11px] text-(--muted)">Searching…</p>}
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
                      {busyId === u._id ? "Sharing…" : "Share"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-[11px] text-(--muted)">No matches for "{query}".</p>
            )}
          </div>
        )}
      </div>
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

export default function CaseDetailPage({ caseId, canEdit, canManageCarePlan = false, backHref, backLabel = "Cases", dashboardHref }: Props) {
  const [caseData, setCaseData]   = useState<PopulatedCase | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [hearingDate, setHearingDate] = useState<string | undefined>();
  const [timelineKey, setTimelineKey] = useState(0);
  const [tab, setTab] = useState<"legal" | "icp">("legal");

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
      <p className="text-sm" style={{ color: "var(--error-text)" }}>{error || "Case not found."}</p>
      <Link href={backHref} className="mt-3 inline-block text-sm hover:underline" style={{ color: "var(--accent)" }}>← Back</Link>
    </div>
  );

  const c  = caseData;
  const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
  // Bump on every successful mutation so collapsible children re-render
  // their internal state (e.g. close their own forms after a save).
  const refresh = () => { setTimelineKey(k => k + 1); fetchCase(); };
  void timelineKey; // referenced for layout consistency only

  return (
    <div className="space-y-6 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-(--muted)">
        {dashboardHref && (
          <>
            <Link href={dashboardHref} className="hover:text-(--text) transition-colors">Dashboard</Link>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M6 4l4 4-4 4"/></svg>
          </>
        )}
        <Link href={backHref} className="hover:text-(--text) transition-colors">{backLabel}</Link>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M6 4l4 4-4 4"/></svg>
        <span className="font-mono font-semibold text-(--text)">{c.caseNumber}</span>
      </nav>

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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: st.bg, color: st.text }}>{c.status}</span>
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
            {c.path === "criminal" ? "⚖ Criminal" : "🏛 High Court"}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-(--text) leading-tight">{c.caseTitle}</h1>
            <p className="text-xs text-(--muted) mt-1">Filed {fmtDate(c.createdAt)} · Last updated {fmtDate(c.updatedAt)}</p>
          </div>

          {hearingDate && (
            <div className="shrink-0 text-right rounded-xl p-3 border"
              style={{ background: "color-mix(in srgb,var(--accent) 8%,transparent)", borderColor: "color-mix(in srgb,var(--accent) 25%,transparent)" }}>
              <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide">Next Hearing</p>
              <p className="text-base font-bold mt-0.5" style={{ color: "var(--accent)" }}>
                {new Date(hearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
              <p className="text-[10px] text-(--muted)">{new Date(hearingDate).getFullYear()}</p>
            </div>
          )}
        </div>

        {/* Parties row. Social workers (and director/superadmin viewing this
            via the SW UI) get a clickable Community tile that opens the full
            community-member detail page — profile, cases, care plans, history
            — without leaving the case context. Other roles see the same tile
            as plain text since they don't have access to that page. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: "Community",          person: c.community,         href: canManageCarePlan && c.community?._id ? `/socialworker/community/${c.community._id}` : undefined },
            { role: "Litigation Member", person: c.litigationMember,   href: undefined },
            { role: "Social Worker",    person: c.socialWorker,        href: undefined },
          ].map(({ role, person, href }) => {
            const inner = person
              ? <>
                  <p className="text-sm font-semibold text-(--text)">{person.name}</p>
                  <p className="text-xs text-(--muted)">{person.email}</p>
                </>
              : <p className="text-xs text-(--muted) italic">Not assigned</p>;
            const wrapperStyle = { background: "var(--bg)", borderColor: "var(--border)" };
            if (href && person) {
              return (
                <Link key={role} href={href} className="rounded-xl p-3 border transition-colors hover:border-(--accent)"
                  style={wrapperStyle}>
                  <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{role} →</p>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={role} className="rounded-xl p-3 border" style={wrapperStyle}>
                <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{role}</p>
                {inner}
              </div>
            );
          })}
        </div>

        {/* Hearing date editor (litigation only) */}
        {canEdit && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mb-2">Update Next Hearing Date</p>
            <UpdateHearingForm
              caseId={c._id}
              current={hearingDate}
              onSuccess={(d) => setHearingDate(d + "T00:00:00.000Z")}
            />
          </div>
        )}
      </div>

      {/* Court / parties / subject captured at creation by the lawyer. Only
          rendered when at least one of these new fields is set so older
          cases (pre court-type-aware flow) don't show empty headers. */}
      <CourtPartiesSubjectCard caseId={c._id} caseData={c} canEdit={canEdit} onChanged={fetchCase} />

      {/* Multi-lawyer share panel — lead + shared members + add/remove. */}
      <LitigationTeamPanel
        caseId={c._id}
        caseData={c}
        canEdit={canEdit}
        onChanged={fetchCase}
      />

      {/* Cheatcode notes — pinned strategy reminders. Anyone with case
          access can add / reply; only the author can edit / delete. */}
      <CaseCheatcodes caseId={c._id} comments={c.caseComments ?? []} onChanged={fetchCase} />

      {/* Intake facts captured by the Case Enquiry form. Visible to anyone with
          access to the case so SW + lawyers see the same paper-form data. */}
      <EnquirySummary enquiry={c.enquiry} district={c.district} causeTitle={c.causeTitle} />

      {/* Court-side metadata managed by the assigned lawyer. */}
      <CaseManagementSection
        caseId={c._id}
        caseData={c}
        canEdit={canEdit}
        onChanged={fetchCase}
      />

      {/* Tab nav */}
      <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {([
          ["legal", "Legal Progress"],
          ["icp",   "Individual Care Plan"],
        ] as const).map(([k, label]) => {
          const sel = tab === k;
          return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: sel ? "var(--accent)" : "transparent",
                color: sel ? "var(--accent-contrast)" : "var(--muted)",
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "icp" ? (
        c.community?._id ? (
          <IcpForm caseId={c._id} canEdit={canManageCarePlan} caseNumber={c.caseNumber} caseTitle={c.caseTitle} />
        ) : (
          <p className="text-sm text-(--muted) px-1">No community member linked to this case yet.</p>
        )
      ) : (
        <LegalProgressBlock />
      )}
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
        {/* FIR alert (chargesheet timer) — keep visible, it's a deadline. */}
        <FirAlert caseData={c} />

        {/* Workflow graph is the single source of truth for stages.
            Clicking any mappable node (FIR / Chargesheet / Charges / Verdict
            for criminal; each step for HC) toggles its done-ness. The old
            standalone stepper + duplicate timeline are gone. */}
        <CaseWorkflowGraph
          path={c.path}
          criminalPath={c.criminalPath as any}
          highCourtPath={c.highCourtPath as any}
          firFiled={c.criminalPath?.firFiled}
          createdAt={c.createdAt}
          canEdit={canEdit}
          caseId={c._id}
          onChanged={refresh}
        />

        {/* High Court 4-stage tracker + named document slots. Only renders
            for HC matters; criminal cases are covered by the workflow graph. */}
        {c.path === "highcourt" && (
          <HighCourtStagesAndDocs caseId={c._id} caseData={c} canEdit={canEdit} onChanged={refresh} />
        )}

        {/* Documents — collapsible. Open by default for editors so the
            upload widget is one click away; closed for read-only viewers. */}
        {canEdit && (
          <CollapsibleSection
            title="Documents"
            badge={docCount > 0 ? <CountPill n={docCount} /> : null}
            defaultOpen={false}
            description="Upload FIR / chargesheet / charge / evidence files. Linked to the right milestone automatically.">
            <CaseDocsUpload caseId={c._id} caseType={c.path} onUploaded={refresh} />
          </CollapsibleSection>
        )}

        {/* Court appearances — per-hearing structured log. */}
        <CollapsibleSection
          title="Court appearances"
          badge={appearanceCount > 0 ? <CountPill n={appearanceCount} /> : null}
          defaultOpen={appearanceCount > 0}>
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
          title="Case diary"
          badge={diaryCount > 0 ? <CountPill n={diaryCount} /> : null}
          defaultOpen={false}>
          <DiaryList entries={c.caseDiary ?? []} />
          {canEdit && <AddDiaryForm caseId={c._id} onSuccess={refresh} />}
        </CollapsibleSection>

        {/* Activity / audit log — who changed what, when. Lets multiple
            people working on the case see each other's progress without
            cross-checking the change history manually. */}
        <CollapsibleSection
          title="Activity log"
          badge={auditCount > 0 ? <CountPill n={auditCount} /> : null}
          defaultOpen={false}
          description="Every change to this case — stage flips, document uploads, status updates — is recorded here with the user who did it.">
          <CaseAuditLog entries={c.auditLog ?? []} />
        </CollapsibleSection>
      </div>
    );
  }
}

/** Small pill rendering a count badge in a section header. */
function CountPill({ n }: { n: number }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
      {n}
    </span>
  );
}

/** Read-only diary list — pulled out of the old Timeline so the case-diary
 *  section can stand on its own without the broader chronological view. */
function DiaryList({ entries }: { entries: Array<{ _id: string; date: string; findings: string }> }) {
  if (!entries.length) {
    return <p className="text-sm text-(--muted) px-1">No diary entries yet.</p>;
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
          <p className="text-sm text-(--text) mt-1 whitespace-pre-line leading-relaxed">{e.findings}</p>
        </li>
      ))}
    </ul>
  );
}
