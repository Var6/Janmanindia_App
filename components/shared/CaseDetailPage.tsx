"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Timeline, type TimelineEntry } from "@/components/ui/timeline";
import CarePlansPanel from "@/components/shared/CarePlansPanel";
import CaseDocsUpload from "@/components/shared/CaseDocsUpload";

/* ── Types ──────────────────────────────────────────────────────────────── */
type DocMeta = { _id?: string; label: string; url: string; uploadedAt: string; ocrStatus?: string; ocrText?: string };
type HighCourtStep = { filed: boolean; filedAt?: string; doc?: DocMeta; notes?: string };

type PopulatedCase = {
  _id: string;
  caseTitle: string;
  caseNumber: string;
  status: "Open" | "Closed" | "Escalated" | "Pending" | "Dismissed";
  path: "criminal" | "highcourt";
  community?: { _id: string; name: string; email: string; phone?: string };
  litigationMember?: { _id: string; name: string; email: string };
  socialWorker?: { _id: string; name: string; email: string };
  nextHearingDate?: string;
  documents: DocMeta[];
  caseDiary: Array<{ _id: string; date: string; findings: string; writtenBy: string }>;
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
  };
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
  Open:      { bg: "var(--info-bg)",      text: "var(--info-text)"     },
  Escalated: { bg: "var(--error-bg)",     text: "var(--error-text)"    },
  Pending:   { bg: "var(--warning-bg)",   text: "var(--warning-text)"  },
  Closed:    { bg: "var(--bg-secondary)", text: "var(--muted)"         },
  Dismissed: { bg: "var(--error-bg)",     text: "var(--error-text)"    },
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
      {doc.ocrStatus && (
        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: ocr.bg, color: ocr.text }}>
          OCR: {doc.ocrStatus}
        </span>
      )}
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

/* ── Timeline builder ───────────────────────────────────────────────────── */
function buildTimeline(c: PopulatedCase, canEdit: boolean, onDiaryAdded: () => void): TimelineEntry[] {
  type Ev = { date: Date; entry: TimelineEntry };
  const events: Ev[] = [];

  const push = (date: string | Date, title: string, content: React.ReactNode) =>
    events.push({ date: new Date(date), entry: { title: fmtTimelineTitle(date), content } });

  /* Case Created */
  push(c.createdAt, "Case Filed",
    <EventCard color="var(--accent)" label="Case Filed">
      <p className="text-sm font-semibold text-(--text) mb-0.5">{c.caseTitle}</p>
      <p className="text-xs text-(--muted)">
        #{c.caseNumber} &middot; {c.path === "criminal" ? "Criminal" : "High Court"} &middot; Opened {fmtDate(c.createdAt)}
      </p>
      {c.community && <p className="text-xs text-(--muted) mt-1">Community: <span className="font-medium text-(--text)">{c.community.name}</span> &middot; {c.community.email}</p>}
    </EventCard>
  );

  /* Criminal path milestones */
  if (c.criminalPath) {
    const cp = c.criminalPath;
    if (cp.firFiled && cp.firDoc) {
      push(cp.firDoc.uploadedAt, "FIR",
        <EventCard color="var(--warning)" label="FIR Filed">
          <p className="text-xs text-(--muted) mb-2">First Information Report lodged with police</p>
          <DocLink doc={cp.firDoc} />
        </EventCard>
      );
    }
    if (cp.chargesheetFiled && cp.chargesheetDate) {
      push(cp.chargesheetDate, "Chargesheet",
        <EventCard color="var(--info)" label="Chargesheet Filed">
          <p className="text-xs text-(--muted)">Chargesheet submitted to court on {fmtDate(cp.chargesheetDate)}</p>
          {cp.chargesheetDueDate && <p className="text-xs text-(--muted)">Was due: {fmtDate(cp.chargesheetDueDate)}</p>}
        </EventCard>
      );
    }
    if (cp.cognizanceOrderDoc) {
      push(cp.cognizanceOrderDoc.uploadedAt, "Cognizance",
        <EventCard color="var(--info)" label="Cognizance Order">
          <DocLink doc={cp.cognizanceOrderDoc} />
        </EventCard>
      );
    }
    if (cp.chargesFramed) {
      const lastChargeDoc = cp.chargeDocs?.[cp.chargeDocs.length - 1];
      const chargeDate = lastChargeDoc?.uploadedAt ?? c.updatedAt;
      push(chargeDate, "Charges",
        <EventCard color="var(--warning)" label="Charges Framed">
          <p className="text-xs text-(--muted) mb-2">Charges formally framed by court</p>
          {cp.chargeDocs?.map((d, i) => <DocLink key={i} doc={d} />)}
        </EventCard>
      );
    }
    /* Trial evidence */
    for (const doc of [...(cp.trial?.evidenceDocs ?? []), ...(cp.trial?.forensicDocs ?? [])]) {
      push(doc.uploadedAt, "Evidence",
        <EventCard color="var(--info)" label="Evidence / Forensics">
          <DocLink doc={doc} />
        </EventCard>
      );
    }
    /* Witnesses depositions */
    const allWitnesses = [
      ...(cp.trial?.prosecutionWitnesses ?? []).map(w => ({ ...w, side: "Prosecution" })),
      ...(cp.trial?.defenseWitnesses ?? []).map(w => ({ ...w, side: "Defence" })),
    ].filter(w => w.deposedAt);
    for (const w of allWitnesses) {
      push(w.deposedAt!, "Witness",
        <EventCard color="var(--muted)" label={`${w.side} Witness`}>
          <p className="text-sm font-medium text-(--text)">{w.name}</p>
          <p className="text-xs text-(--muted)">Deposed: {fmtDate(w.deposedAt!)}</p>
          {w.depositionUrl && <a href={w.depositionUrl} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>View deposition</a>}
        </EventCard>
      );
    }
    if (cp.verdict && cp.verdictDate) {
      push(cp.verdictDate, "Verdict",
        <EventCard color="var(--success)" label="Verdict">
          <p className="text-sm font-semibold text-(--text)">{cp.verdict}</p>
          <p className="text-xs text-(--muted) mt-1">Delivered {fmtDate(cp.verdictDate)}</p>
        </EventCard>
      );
    }
  }

  /* High Court steps */
  if (c.highCourtPath) {
    const hcp = c.highCourtPath;
    const steps: [string, HighCourtStep][] = [
      ["Petition Filed", hcp.petitionFiled],
      ["Supporting Affidavit", hcp.supportingAffidavit],
      ["Admission", hcp.admission],
      ["Counter Affidavit", hcp.counterAffidavit],
      ["Rejoinder", hcp.rejoinder],
      ["Plea Close", hcp.pleaClose],
      ["Inducement", hcp.inducement],
    ];
    for (const [label, step] of steps) {
      if (step.filed && step.filedAt) {
        push(step.filedAt, label,
          <EventCard color="var(--success)" label={label}>
            {step.notes && <p className="text-xs text-(--muted) mb-2">{step.notes}</p>}
            {step.doc && <DocLink doc={step.doc} />}
          </EventCard>
        );
      }
    }
  }

  /* Documents (main array) */
  for (const doc of c.documents ?? []) {
    push(doc.uploadedAt, "Document",
      <EventCard color="var(--info)" label="Document Uploaded">
        <DocLink doc={doc} />
        {doc.ocrText && (
          <p className="text-xs text-(--muted) mt-2 line-clamp-3 italic">"{doc.ocrText}"</p>
        )}
      </EventCard>
    );
  }

  /* Case Diary */
  for (const entry of c.caseDiary ?? []) {
    push(entry.date, "Diary",
      <EventCard color="var(--muted)" label="Case Diary Entry">
        <p className="text-sm text-(--text) whitespace-pre-line leading-relaxed">{entry.findings}</p>
        <p className="text-xs text-(--muted) mt-2">{fmtDateTime(entry.date)}</p>
      </EventCard>
    );
  }

  /* Sort chronologically */
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  /* Append "Add Diary Entry" event for editors */
  if (canEdit) {
    events.push({
      date: new Date(),
      entry: {
        title: "Now",
        content: <AddDiaryForm caseId={c._id} onSuccess={onDiaryAdded} />,
      },
    });
  }

  return events.map(e => e.entry);
}

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

/* ── Main component ─────────────────────────────────────────────────────── */
interface Props {
  caseId: string;
  canEdit: boolean;          // true for litigation members
  canManageCarePlan?: boolean; // true for social workers
  backHref: string;          // breadcrumb back link
  backLabel?: string;
}

export default function CaseDetailPage({ caseId, canEdit, canManageCarePlan = false, backHref, backLabel = "Cases" }: Props) {
  const [caseData, setCaseData]   = useState<PopulatedCase | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [hearingDate, setHearingDate] = useState<string | undefined>();
  const [timelineKey, setTimelineKey] = useState(0);

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
    <div className="flex items-center justify-center py-20 text-(--muted)">
      <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
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
  const timelineEntries = buildTimeline(c, canEdit, () => { setTimelineKey(k => k + 1); fetchCase(); });

  return (
    <div className="space-y-6 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-(--muted)">
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

        {/* Parties row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: "Community",          person: c.community },
            { role: "Litigation Member", person: c.litigationMember },
            { role: "Social Worker",    person: c.socialWorker },
          ].map(({ role, person }) => (
            <div key={role} className="rounded-xl p-3 border"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">{role}</p>
              {person
                ? <>
                    <p className="text-sm font-semibold text-(--text)">{person.name}</p>
                    <p className="text-xs text-(--muted)">{person.email}</p>
                  </>
                : <p className="text-xs text-(--muted) italic">Not assigned</p>
              }
            </div>
          ))}
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

      {/* FIR alert */}
      <FirAlert caseData={c} />

      {/* Progress stepper */}
      <CaseProgressStepper caseData={c} />

      {/* Individual Care Plans (counselling, shelter, medical referrals — SW-led) */}
      {c.community?._id && (
        <CarePlansPanel caseId={c._id} communityId={c.community._id} canManage={canManageCarePlan} />
      )}

      {/* Document upload (litigation members manage milestones + add evidence) */}
      {canEdit && (
        <CaseDocsUpload caseId={c._id} caseType={c.path} onUploaded={() => { setTimelineKey(k => k + 1); fetchCase(); }} />
      )}

      {/* Timeline heading */}
      <div>
        <h2 className="text-lg font-bold text-(--text)">Case Timeline</h2>
        <p className="text-sm text-(--muted) mt-0.5">Full chronological history of events, documents, and diary entries.</p>
      </div>

      {/* Aceternity-style Timeline */}
      <div key={timelineKey}>
        <Timeline data={timelineEntries} />
      </div>

      {/* Empty state */}
      {timelineEntries.length === 0 && (
        <div className="py-16 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-(--muted)">No events recorded yet.</p>
        </div>
      )}
    </div>
  );
}
