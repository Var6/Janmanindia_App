"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import CaseSearchInput, { type CaseRef } from "@/components/shared/CaseSearchInput";

type CaseRow = {
  case?: { _id: string } | string;
  caseNumber?: string;
  clientCode?: string;
  caseType?: string;
  modeOfContact?: string;
  workDoneToday?: string;
  schemeLinkage?: string;
  rehabSupport?: string;
  counsellingSupport?: string;
  legalAidCoordination?: string;
  networkingReferral?: string;
  riskSafety?: string;
  outcomeNextAction?: string;
};

type EscalationRow = {
  case?: { _id: string } | string;
  caseNumber?: string;
  issue?: string;
  riskLevel?: "low" | "medium" | "high" | "immediate";
  actionRequested?: string;
  deadline?: string;
  status?: string;
};

type Report = {
  _id?: string;
  preparedBy?: { _id: string; name: string; employeeId?: string; socialWorkerProfile?: { district?: string } };
  reportDate: string;
  districtBlock?: string;
  summary: Record<string, number>;
  caseRows: CaseRow[];
  supportChecklist: { legalAid: string[]; schemeLinkage: string[]; rehabilitation: string[]; counsellingProtection: string[] };
  escalations: EscalationRow[];
  narrativeNotes?: string;
  signatureUrl?: string;
  status: "draft" | "submitted" | "reviewed";
  submittedAt?: string;
  supervisor?: { _id: string; name: string };
  reviewedAt?: string;
  supervisorRemarks?: string;
};

const CONTACT_MODES: [string, string][] = [
  ["", "—"], ["home_visit", "Home visit"], ["phone", "Phone"], ["office", "Office"],
  ["court", "Court"], ["police", "Police"], ["hospital", "Hospital"],
  ["department", "Department"], ["other", "Other"],
];

const CHECKLIST = {
  legalAid: [
    "FIR/complaint follow-up", "Lawyer/legal aid meeting", "Court-date coordination",
    "Police/prosecution follow-up", "Statement/evidence/document support",
    "Compensation/victim compensation follow-up",
  ],
  schemeLinkage: [
    "Identity documents", "Ration/social security pension", "Disability certificate/UDID",
    "Labour/livelihood scheme", "Education scholarship/admission", "Health insurance/medical support",
  ],
  rehabilitation: [
    "Shelter/safe accommodation", "Medical treatment/referral", "Livelihood or skill linkage",
    "Education continuation", "Family/community reintegration", "Long-term rehabilitation plan",
  ],
  counsellingProtection: [
    "Individual counselling", "Family counselling", "Safety planning",
    "Crisis intervention", "Referral to OSC/CWC/DCPU/NGO", "Follow-up with counsellor/psychologist",
  ],
};

const EMPTY_CASE_ROW: CaseRow = { modeOfContact: "" };
const EMPTY_ESCALATION: EscalationRow = {};

interface Props {
  /** Existing report id when editing; undefined when creating today's report. */
  initialReport?: Report;
  /** SW can edit. Supervisors get a read-only view + a "Mark Reviewed" button. */
  canEdit: boolean;
  isSupervisor?: boolean;
  /** Called after a successful save. */
  onSaved?: (r: Report) => void;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function makeBlankReport(): Report {
  return {
    reportDate: todayISO(),
    summary: {},
    caseRows: [{ ...EMPTY_CASE_ROW }],
    supportChecklist: { legalAid: [], schemeLinkage: [], rehabilitation: [], counsellingProtection: [] },
    escalations: [],
    status: "draft",
  };
}

/**
 * Daily Social Worker Report — section-by-section form mirroring the printed
 * PDF. Counters in Section B are *auto-derived* from Section C activity rows
 * unless the SW manually overrides them. Case fields use a dynamic typeahead
 * so an SW only types a few characters of the case number / title.
 */
export default function DailyReportForm({ initialReport, canEdit, isSupervisor, onSaved }: Props) {
  const [report, setReport] = useState<Report>(() => initialReport ?? makeBlankReport());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [supervisorRemarks, setSupervisorRemarks] = useState(initialReport?.supervisorRemarks ?? "");

  useEffect(() => { if (initialReport) setReport(initialReport); }, [initialReport]);

  const ro = !canEdit;

  /* ── auto-derived counters ──────────────────────────────────────────── */
  const derived = useMemo(() => {
    const rows = report.caseRows ?? [];
    const cnt = (pred: (r: CaseRow) => boolean) => rows.filter(pred).length;
    const has = (s?: string) => Boolean(s && s.trim());
    return {
      totalCases:                  rows.filter(r => r.case || r.caseNumber || has(r.workDoneToday)).length,
      homeFieldVisits:             cnt(r => r.modeOfContact === "home_visit"),
      phoneFollowUps:              cnt(r => r.modeOfContact === "phone"),
      schemeApps:                  cnt(r => has(r.schemeLinkage)),
      counsellingSessions:         cnt(r => has(r.counsellingSupport)),
      legalAidFollowUps:           cnt(r => has(r.legalAidCoordination)),
      networkingMeetings:          cnt(r => has(r.networkingReferral)),
      documentsCollectedSubmitted: cnt(r => has(r.legalAidCoordination) && /document/i.test(r.legalAidCoordination ?? "")),
      rehabActions:                cnt(r => has(r.rehabSupport)),
      urgentFlagged:               cnt(r => has(r.riskSafety)),
      needSupervisorReview:        (report.escalations ?? []).filter(e => e.issue || e.case || e.caseNumber).length,
    };
  }, [report.caseRows, report.escalations]);

  function setField<K extends keyof Report>(k: K, v: Report[K]) {
    setReport(r => ({ ...r, [k]: v }));
  }
  function setSummary(k: string, v?: number) {
    setReport(r => ({ ...r, summary: { ...(r.summary ?? {}), [k]: v ?? 0 } }));
  }
  function updateCaseRow(i: number, patch: Partial<CaseRow>) {
    setReport(r => ({ ...r, caseRows: r.caseRows.map((row, j) => j === i ? { ...row, ...patch } : row) }));
  }
  function addCaseRow()    { setReport(r => ({ ...r, caseRows: [...r.caseRows, { ...EMPTY_CASE_ROW }] })); }
  function removeCaseRow(i: number) { setReport(r => ({ ...r, caseRows: r.caseRows.filter((_, j) => j !== i) })); }
  function updateEscalation(i: number, patch: Partial<EscalationRow>) {
    setReport(r => ({ ...r, escalations: r.escalations.map((row, j) => j === i ? { ...row, ...patch } : row) }));
  }
  function addEscalation()    { setReport(r => ({ ...r, escalations: [...r.escalations, { ...EMPTY_ESCALATION }] })); }
  function removeEscalation(i: number) { setReport(r => ({ ...r, escalations: r.escalations.filter((_, j) => j !== i) })); }

  function toggleChecklist(group: keyof Report["supportChecklist"], item: string) {
    setReport(r => {
      const cur = r.supportChecklist[group] ?? [];
      const has = cur.includes(item);
      return { ...r, supportChecklist: { ...r.supportChecklist, [group]: has ? cur.filter(x => x !== item) : [...cur, item] } };
    });
  }

  async function save(opts: { submit?: boolean } = {}) {
    setSaving(true); setError("");
    try {
      // Persist the auto-derived counters as the snapshot the printed copy will show
      const snapshotSummary = { ...derived, ...(report.summary ?? {}) };
      const body: any = {
        ...report,
        summary: snapshotSummary,
        caseRows: report.caseRows.map(r => ({
          ...r,
          case: typeof r.case === "object" ? (r.case as any)._id : r.case,
        })),
        escalations: report.escalations.map(r => ({
          ...r,
          case: typeof r.case === "object" ? (r.case as any)._id : r.case,
        })),
      };
      if (opts.submit) body.status = "submitted";

      const res = await fetch("/api/daily-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setReport(data.report);
      setSavedAt(new Date());
      onSaved?.(data.report);
    } finally {
      setSaving(false);
    }
  }

  async function review() {
    if (!report._id) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/daily-reports/${report._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", supervisorRemarks }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setReport(data.report);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() { if (typeof window !== "undefined") window.print(); }

  return (
    <div className="daily-report space-y-6">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: #fff !important; }
          aside, nav, header,
          [class*="topbar"], [class*="TopBar"],
          [class*="sidebar"], [class*="SidebarNav"],
          .no-print, .dr-controls { display: none !important; }
          .daily-report { color: #000 !important; }
          .dr-section { page-break-inside: avoid; border-color: #999 !important; box-shadow: none !important; background: #fff !important; }
          .dr-section input, .dr-section textarea, .dr-section select {
            border-color: #ccc !important; background: #fff !important; color: #000 !important;
          }
          .dr-table th, .dr-table td { border: 1px solid #999 !important; padding: 4px 6px; vertical-align: top; }
          .dr-pill { border: 1px solid #999 !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="dr-controls flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>Daily Social Worker Report</p>
          <p className="text-xs text-(--muted) mt-1">
            Status: <span className="capitalize">{report.status}</span>
            {report.submittedAt && ` · submitted ${new Date(report.submittedAt).toLocaleString("en-IN")}`}
            {savedAt && ` · saved ${savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            🖨 Print / Save as PDF
          </button>
          {canEdit && (
            <>
              <button onClick={() => save()} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button onClick={() => save({ submit: true })} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--success)", color: "#fff" }}>
                Submit for Review
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}

      {/* Header banner — reads as the printed cover */}
      <header className="dr-section rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h1 className="text-base font-bold text-(--text)">Daily Social Worker Report — Survivor / Victim legal aid, rehabilitation and follow-up</h1>
        <p className="text-[11px] text-(--muted) italic mt-1">
          Confidential. Use Case ID / Client Code wherever possible. Avoid unnecessary disclosure of survivor/victim identity.
        </p>
      </header>

      {/* Section A */}
      <Section title="A. Reporting details">
        <Grid cols={2}>
          <Field label="Date of report">
            <input type="date" value={report.reportDate ?? ""} disabled={ro}
              onChange={e => setField("reportDate", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </Field>
          <Field label="District / Block">
            <input value={report.districtBlock ?? ""} disabled={ro}
              onChange={e => setField("districtBlock", e.target.value)}
              placeholder="e.g. Patna / Phulwari Sharif"
              className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-100"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </Field>
        </Grid>
      </Section>

      {/* Section B — auto-derived with manual override */}
      <Section title="B. Daily summary"
        subtitle="Counters auto-fill from the Case-wise table below as you type. Adjust any cell by hand if needed.">
        <Grid cols={3}>
          <Counter label="Total cases followed up"      value={report.summary?.totalCases}                  fallback={derived.totalCases}                  onChange={v => setSummary("totalCases", v)}                ro={ro} />
          <Counter label="New cases received"           value={report.summary?.newCases}                    fallback={0}                                   onChange={v => setSummary("newCases", v)}                  ro={ro} />
          <Counter label="Home / field visits"          value={report.summary?.homeFieldVisits}             fallback={derived.homeFieldVisits}             onChange={v => setSummary("homeFieldVisits", v)}           ro={ro} />
          <Counter label="Phone follow-ups"             value={report.summary?.phoneFollowUps}              fallback={derived.phoneFollowUps}              onChange={v => setSummary("phoneFollowUps", v)}            ro={ro} />
          <Counter label="Scheme applications / referrals" value={report.summary?.schemeApps}               fallback={derived.schemeApps}                  onChange={v => setSummary("schemeApps", v)}                ro={ro} />
          <Counter label="Urgent cases flagged"         value={report.summary?.urgentFlagged}               fallback={derived.urgentFlagged}               onChange={v => setSummary("urgentFlagged", v)}             ro={ro} />
          <Counter label="Counselling sessions"         value={report.summary?.counsellingSessions}         fallback={derived.counsellingSessions}         onChange={v => setSummary("counsellingSessions", v)}       ro={ro} />
          <Counter label="Legal aid / court follow-ups" value={report.summary?.legalAidFollowUps}           fallback={derived.legalAidFollowUps}           onChange={v => setSummary("legalAidFollowUps", v)}         ro={ro} />
          <Counter label="Networking meetings"          value={report.summary?.networkingMeetings}          fallback={derived.networkingMeetings}          onChange={v => setSummary("networkingMeetings", v)}        ro={ro} />
          <Counter label="Documents collected / submitted" value={report.summary?.documentsCollectedSubmitted} fallback={derived.documentsCollectedSubmitted} onChange={v => setSummary("documentsCollectedSubmitted", v)} ro={ro} />
          <Counter label="Rehabilitation actions"       value={report.summary?.rehabActions}                fallback={derived.rehabActions}                onChange={v => setSummary("rehabActions", v)}              ro={ro} />
          <Counter label="Cases requiring supervisor review" value={report.summary?.needSupervisorReview}   fallback={derived.needSupervisorReview}        onChange={v => setSummary("needSupervisorReview", v)}      ro={ro} />
        </Grid>
      </Section>

      {/* Section C */}
      <Section title="C. Case-wise daily activity report"
        subtitle="One row per case handled today. Search by case number or title in the first column.">
        <div className="overflow-x-auto">
          <table className="dr-table w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="text-left">
                {["Case", "Client / Survivor code", "Case type / issue", "Mode of contact", "Work done today", "Scheme / entitlement linkage", "Rehabilitation support", "Counselling / psycho-social", "Legal aid coordination", "Networking / referral", "Risk / safety", "Outcome / next action", ""].map(h => (
                  <th key={h} className="py-2 pr-2 font-semibold text-(--muted) align-bottom">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.caseRows.map((row, i) => {
                const caseValue: CaseRef | null = row.case && typeof row.case === "object"
                  ? { _id: (row.case as any)._id, caseNumber: row.caseNumber ?? "", caseTitle: "" }
                  : (row.caseNumber ? { _id: typeof row.case === "string" ? row.case : "", caseNumber: row.caseNumber, caseTitle: "" } : null);
                return (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1 pr-2 align-top min-w-[220px]">
                      <CaseSearchInput compact disabled={ro} value={caseValue}
                        onChange={c => updateCaseRow(i, c
                          ? { case: { _id: c._id }, caseNumber: c.caseNumber, caseType: row.caseType }
                          : { case: undefined, caseNumber: undefined })} />
                    </td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} value={row.clientCode}        onChange={v => updateCaseRow(i, { clientCode: v })} placeholder="Code (optional)" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} value={row.caseType}          onChange={v => updateCaseRow(i, { caseType: v })}  placeholder="e.g. POCSO / FIR" /></td>
                    <td className="py-1 pr-2 align-top">
                      <select value={row.modeOfContact ?? ""} disabled={ro}
                        onChange={e => updateCaseRow(i, { modeOfContact: e.target.value })}
                        className="w-full px-2 py-1 rounded border text-xs disabled:opacity-100"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                        {CONTACT_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.workDoneToday}        onChange={v => updateCaseRow(i, { workDoneToday: v })}        placeholder="Brief work summary" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.schemeLinkage}        onChange={v => updateCaseRow(i, { schemeLinkage: v })}        placeholder="Scheme, dept, app no., status" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.rehabSupport}         onChange={v => updateCaseRow(i, { rehabSupport: v })}         placeholder="Shelter, compensation, education…" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.counsellingSupport}   onChange={v => updateCaseRow(i, { counsellingSupport: v })}   placeholder="Sessions, type, outcome" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.legalAidCoordination} onChange={v => updateCaseRow(i, { legalAidCoordination: v })} placeholder="Lawyer, court date, FIR, statement, documents" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.networkingReferral}   onChange={v => updateCaseRow(i, { networkingReferral: v })}   placeholder="Whom referred, partner org" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.riskSafety}           onChange={v => updateCaseRow(i, { riskSafety: v })}           placeholder="Threat, pressure, urgency" /></td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.outcomeNextAction}    onChange={v => updateCaseRow(i, { outcomeNextAction: v })}    placeholder="Result + next follow-up date / person" /></td>
                    <td className="py-1 align-top">
                      {!ro && (
                        <button type="button" onClick={() => removeCaseRow(i)}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!ro && (
          <button type="button" onClick={addCaseRow}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            + Add another case row
          </button>
        )}
      </Section>

      {/* Section D — checklist */}
      <Section title="D. Support category checklist">
        <Grid cols={4}>
          {(Object.entries(CHECKLIST) as [keyof Report["supportChecklist"], string[]][]).map(([key, items]) => (
            <div key={key} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <p className="text-xs font-bold text-(--text) mb-2 capitalize">
                {key === "legalAid" ? "Legal aid / Justice process"
                : key === "schemeLinkage" ? "Scheme & entitlement linkage"
                : key === "rehabilitation" ? "Rehabilitation support"
                : "Counselling & protection"}
              </p>
              <ul className="space-y-1.5">
                {items.map(item => {
                  const checked = (report.supportChecklist?.[key] ?? []).includes(item);
                  return (
                    <li key={item}>
                      <label className="flex items-start gap-2 text-xs cursor-pointer">
                        <input type="checkbox" disabled={ro} checked={checked}
                          onChange={() => toggleChecklist(key, item)} className="mt-0.5" />
                        <span className="text-(--text) leading-snug">{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Grid>
      </Section>

      {/* Section E */}
      <Section title="E. Urgent escalation / supervisor review">
        <div className="overflow-x-auto">
          <table className="dr-table w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="text-left">
                {["Case", "Issue", "Risk level", "Action requested", "Deadline", "Status", ""].map(h => (
                  <th key={h} className="py-2 pr-2 font-semibold text-(--muted) align-bottom">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.escalations.length === 0 && (
                <tr><td colSpan={7} className="py-3 text-center text-(--muted) text-xs italic">No escalations.</td></tr>
              )}
              {report.escalations.map((row, i) => {
                const caseValue: CaseRef | null = row.case && typeof row.case === "object"
                  ? { _id: (row.case as any)._id, caseNumber: row.caseNumber ?? "", caseTitle: "" }
                  : (row.caseNumber ? { _id: typeof row.case === "string" ? row.case : "", caseNumber: row.caseNumber, caseTitle: "" } : null);
                return (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1 pr-2 align-top min-w-[220px]">
                      <CaseSearchInput compact disabled={ro} value={caseValue}
                        onChange={c => updateEscalation(i, c
                          ? { case: { _id: c._id }, caseNumber: c.caseNumber }
                          : { case: undefined, caseNumber: undefined })} />
                    </td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.issue} onChange={v => updateEscalation(i, { issue: v })} placeholder="What requires escalation" /></td>
                    <td className="py-1 pr-2 align-top">
                      <select value={row.riskLevel ?? ""} disabled={ro}
                        onChange={e => updateEscalation(i, { riskLevel: (e.target.value || undefined) as EscalationRow["riskLevel"] })}
                        className="px-2 py-1 rounded border text-xs disabled:opacity-100"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                        <option value="">—</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="immediate">Immediate</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} multi value={row.actionRequested} onChange={v => updateEscalation(i, { actionRequested: v })} placeholder="From supervisor / lawyer" /></td>
                    <td className="py-1 pr-2 align-top">
                      <input type="date" value={row.deadline ? new Date(row.deadline).toISOString().slice(0, 10) : ""}
                        disabled={ro} onChange={e => updateEscalation(i, { deadline: e.target.value || undefined })}
                        className="w-full px-2 py-1 rounded border text-xs disabled:opacity-100"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                    </td>
                    <td className="py-1 pr-2 align-top"><Cell ro={ro} value={row.status} onChange={v => updateEscalation(i, { status: v })} placeholder="Open / in progress / closed" /></td>
                    <td className="py-1 align-top">
                      {!ro && <button type="button" onClick={() => removeEscalation(i)} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>✕</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!ro && (
          <button type="button" onClick={addEscalation}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            + Add escalation
          </button>
        )}
      </Section>

      {/* Section F */}
      <Section title="F. Narrative notes / field observations">
        <textarea value={report.narrativeNotes ?? ""} disabled={ro} rows={6}
          onChange={e => setField("narrativeNotes", e.target.value)}
          placeholder="Brief field observations, survivor concerns, family / community dynamics, institutional response, barriers, learnings."
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none disabled:opacity-100"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </Section>

      {/* Section G */}
      <Section title="G. Declaration & signature">
        <Grid cols={2}>
          <Field label="Prepared by">
            <Read>{report.preparedBy?.name ?? "—"}{report.preparedBy?.employeeId ? ` · ${report.preparedBy.employeeId}` : ""}</Read>
          </Field>
          <Field label="Date & time of submission">
            <Read>{report.submittedAt ? new Date(report.submittedAt).toLocaleString("en-IN") : "Not submitted"}</Read>
          </Field>
          <Field label="Reviewed by supervisor">
            <Read>{report.supervisor?.name ? `${report.supervisor.name} · ${new Date(report.reviewedAt!).toLocaleDateString("en-IN")}` : "—"}</Read>
          </Field>
          <Field label="Status">
            <Read className="capitalize">{report.status}</Read>
          </Field>

          <div className="sm:col-span-full">
            <p className="text-xs font-semibold text-(--text) mb-1.5">Supervisor remarks</p>
            {isSupervisor ? (
              <>
                <textarea value={supervisorRemarks} onChange={e => setSupervisorRemarks(e.target.value)} rows={3}
                  placeholder="Brief remarks before marking the report reviewed."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                <button type="button" onClick={review} disabled={saving || report.status === "reviewed" || !report._id}
                  className="mt-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "var(--success)", color: "#fff" }}>
                  {report.status === "reviewed" ? "Already reviewed" : (saving ? "Saving…" : "Mark Reviewed")}
                </button>
              </>
            ) : (
              <Read>{report.supervisorRemarks || "—"}</Read>
            )}
          </div>
        </Grid>
      </Section>

      <p className="text-[11px] text-(--muted) italic text-center pb-12">
        Confidentiality reminder: store this report securely. Use Case ID and Client / Survivor Code instead of names where disclosure is not required. Avoid unnecessary detail of trauma history or identity markers.
      </p>
    </div>
  );
}

/* ── small atoms ──────────────────────────────────────────────── */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="dr-section rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <h2 className="text-base font-bold text-(--text)">{title}</h2>
        {subtitle && <p className="text-xs text-(--muted) mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
function Grid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const cls = cols === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2";
  return <div className={`grid ${cls} gap-3`}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="font-semibold text-(--text) block mb-1">{label}</span>
      {children}
    </label>
  );
}
function Read({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`px-3 py-2 rounded-lg border text-sm ${className ?? ""}`} style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>{children}</p>;
}
function Cell({ value, onChange, placeholder, ro, multi }: { value?: string; onChange: (v?: string) => void; placeholder?: string; ro?: boolean; multi?: boolean }) {
  if (multi) {
    return (
      <textarea value={value ?? ""} disabled={ro} rows={2}
        onChange={e => onChange(e.target.value || undefined)} placeholder={placeholder}
        className="w-full px-2 py-1 rounded border text-xs resize-none min-w-[140px] disabled:opacity-100"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
    );
  }
  return (
    <input value={value ?? ""} disabled={ro} placeholder={placeholder}
      onChange={e => onChange(e.target.value || undefined)}
      className="w-full px-2 py-1 rounded border text-xs disabled:opacity-100"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
  );
}
function Counter({ label, value, fallback, onChange, ro }: { label: string; value?: number; fallback: number; onChange: (v?: number) => void; ro?: boolean }) {
  const display = value ?? fallback;
  const isAuto = value === undefined || value === null;
  return (
    <div className="dr-pill rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <p className="text-[11px] font-semibold text-(--muted) leading-tight">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <input type="number" min={0} value={display} disabled={ro}
          onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-16 px-2 py-1 rounded-lg border text-base font-bold disabled:opacity-100"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
        {isAuto && fallback > 0 && (
          <span className="text-[10px] text-(--muted) italic">auto</span>
        )}
      </div>
    </div>
  );
}
