"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

interface ExpenseRow {
  _id: string;
  description?: string;
  amount: number;
  status: "submitted" | "hr_verified" | "director_approved" | "paid" | "rejected";
  /** true/undefined → requisition (org pays vendor); false → reimbursement. */
  paidByOrg?: boolean;
  createdAt: string;
  submittedBy?: { _id: string; name: string; role?: string } | null;
  project?: { _id: string; name: string; code?: string } | null;
  case?: { _id: string; caseNumber?: string; caseTitle?: string } | null;
}

const STATUS_META: Record<ExpenseRow["status"], { label: string; bg: string; text: string }> = {
  submitted:         { label: "Submitted",  bg: "var(--info-bg)",      text: "var(--info-text)" },
  hr_verified:       { label: "HR verified", bg: "var(--warning-bg)",  text: "var(--warning-text)" },
  director_approved: { label: "Approved",   bg: "var(--accent-3-bg)",  text: "var(--accent-3)" },
  paid:              { label: "Paid",       bg: "var(--success-bg)",   text: "var(--success-text)" },
  rejected:          { label: "Rejected",   bg: "var(--error-bg)",     text: "var(--error-text)" },
};

const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

/**
 * Org-wide requisition & reimbursement report for the reviewer group.
 * Live-fetched, filterable by type / status / scope, includes case-scoped
 * expenses (which the per-project views drop), and carries inline actions so
 * an approver can move an expense along without leaving the report.
 */
export default function ExpenseReport({ role }: { role: string }) {
  const t = useT();
  const [rows, setRows] = useState<ExpenseRow[] | null>(null);
  const [type, setType] = useState<"all" | "requisition" | "reimbursement">("all");
  const [status, setStatus] = useState<string>("all");
  const [scope, setScope] = useState<"all" | "project" | "case">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const canApprove = ["director", "superadmin"].includes(role);
  const canVerify  = ["hr", "finance", "director", "superadmin"].includes(role);
  const canPay     = ["finance", "director", "superadmin"].includes(role);

  const load = useCallback(() => {
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : { expenses: [] }))
      .then((d) => setRows(d.expenses ?? []))
      .catch(() => setRows([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? t("Action failed."));
      }
      load();
    } finally { setBusyId(null); }
  }

  const view = useMemo(() => {
    return (rows ?? []).filter((e) => {
      if (type === "requisition" && e.paidByOrg === false) return false;
      if (type === "reimbursement" && e.paidByOrg !== false) return false;
      if (status !== "all" && e.status !== status) return false;
      if (scope === "project" && !e.project) return false;
      if (scope === "case" && !e.case) return false;
      return true;
    });
  }, [rows, type, status, scope]);

  const totals = useMemo(() => {
    const sum = (f: (e: ExpenseRow) => boolean) => view.filter(f).reduce((a, e) => a + (e.amount ?? 0), 0);
    return {
      pending:  sum((e) => e.status === "submitted" || e.status === "hr_verified"),
      approved: sum((e) => e.status === "director_approved"),
      paid:     sum((e) => e.status === "paid"),
    };
  }, [view]);

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("Awaiting decision"), value: totals.pending,  color: "var(--warning-text)", bg: "var(--warning-bg)" },
          { label: t("Approved (committed)"), value: totals.approved, color: "var(--accent-3)",  bg: "var(--accent-3-bg)" },
          { label: t("Paid out"), value: totals.paid, color: "var(--success-text)", bg: "var(--success-bg)" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border p-4" style={{ background: c.bg, borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: c.color }}>{inr(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          {([["all", "All"], ["requisition", "🏢 Requisition"], ["reimbursement", "👤 Reimbursement"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setType(k)}
              className="px-3 py-1.5 text-xs font-bold"
              style={{ background: type === k ? "var(--accent)" : "var(--bg)", color: type === k ? "var(--accent-contrast)" : "var(--muted)" }}>
              {t(l)}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border text-xs" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          <option value="all">{t("All statuses")}</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{t(m.label)}</option>)}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value as never)}
          className="px-2.5 py-1.5 rounded-xl border text-xs" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          <option value="all">{t("Projects + cases")}</option>
          <option value="project">{t("Project expenses")}</option>
          <option value="case">{t("Case expenses")}</option>
        </select>
        <p className="text-xs text-(--muted) ml-auto">{view.length} {t("of")} {(rows ?? []).length}</p>
      </div>

      {/* Rows */}
      {rows === null ? (
        <div className="space-y-2"><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" /></div>
      ) : view.length === 0 ? (
        <div className="py-14 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-2xl mb-1">🧾</p>
          <p className="text-sm text-(--muted)">{t("No expenses match these filters.")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {view.map((e) => {
            const st = STATUS_META[e.status];
            const isReimb = e.paidByOrg === false;
            return (
              <div key={e._id} className="px-4 py-3 flex items-center gap-3 flex-wrap"
                style={{ borderColor: "var(--border)", borderLeft: `4px solid ${st.text}` }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ background: isReimb ? "var(--accent-2-bg)" : "var(--accent-subtle)", color: isReimb ? "var(--accent-2)" : "var(--accent)" }}>
                      {isReimb ? t("Reimbursement") : t("Requisition")}
                    </span>
                    {e.project && (
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                        {e.project.code ?? e.project.name}
                      </span>
                    )}
                    {e.case && (
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                        ⚖️ {e.case.caseNumber ?? t("Case")}
                      </span>
                    )}
                    <span className="text-[11px] text-(--muted)">
                      {e.submittedBy?.name ?? "—"} · {new Date(e.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm text-(--text) mt-0.5 truncate">{e.description || t("(no description)")}</p>
                </div>
                <p className="text-base font-bold tabular-nums shrink-0">{inr(e.amount)}</p>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: st.bg, color: st.text }}>
                  {t(st.label)}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {e.status === "submitted" && canVerify && (
                    <button onClick={() => act(e._id, "hr_verify")} disabled={busyId === e._id}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg disabled:opacity-50"
                      style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>{t("Verify")}</button>
                  )}
                  {e.status === "hr_verified" && canApprove && (
                    <button onClick={() => act(e._id, "director_approve")} disabled={busyId === e._id}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Approve")}</button>
                  )}
                  {e.status === "director_approved" && canPay && (
                    <button onClick={() => act(e._id, "mark_paid")} disabled={busyId === e._id}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg disabled:opacity-50"
                      style={{ background: "var(--success)", color: "#fff" }}>{t("Mark paid")}</button>
                  )}
                  {(e.status === "submitted" || e.status === "hr_verified") && canApprove && (
                    <button onClick={() => act(e._id, "reject")} disabled={busyId === e._id}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg disabled:opacity-50"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("Reject")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
