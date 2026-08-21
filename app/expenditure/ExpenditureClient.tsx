"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import SubmitExpenseClaimForm from "@/components/finance/SubmitExpenseClaimForm";

type Decision = { by?: { name?: string }; at?: string; notes?: string };
type Claim = {
  _id: string;
  applicantName: string;
  designation: string;
  applicationDate?: string;
  project?: { code?: string; name?: string };
  projectOther?: string;
  approver?: { name?: string };
  approverOther?: string;
  submittedBy?: { name?: string; role?: string };
  lineItems: { incurredAt?: string; vendor?: string; head: string; amount: number; receiptUrls: string[] }[];
  totalAmount: number;
  status: "submitted" | "approved" | "paid" | "rejected";
  submittedAt?: string;
  approval?: Decision;
  payment?: Decision;
  rejection?: (Decision & { stage?: string });
};

type CurrentUser = { id: string; name: string; role: string };

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  submitted: { bg: "var(--warning-bg, #3a3410)", fg: "var(--warning-text, #ffd66b)", label: "Awaiting approval" },
  approved:  { bg: "var(--info-bg, #10283a)",    fg: "var(--info-text, #7cc4ff)",   label: "Approved · to pay" },
  paid:      { bg: "var(--success-bg, #16351f)", fg: "var(--success-text, #7ee2a8)", label: "Paid" },
  rejected:  { bg: "var(--error-bg)",            fg: "var(--error-text)",            label: "Rejected" },
};

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function ExpenditureClient({ currentUser }: { currentUser: CurrentUser }) {
  const t = useT();
  const canApprove = ["director", "superadmin"].includes(currentUser.role);
  const canPay = ["finance", "director", "superadmin"].includes(currentUser.role);

  type Tab = "submit" | "mine" | "approve" | "pay";
  const [tab, setTab] = useState<Tab>("submit");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (which: Tab) => {
    if (which === "submit") return;
    setLoading(true);
    try {
      const qs = which === "mine" ? "?mine=true" : which === "approve" ? "?queue=approver" : "?queue=finance";
      const res = await fetch(`/api/expense-claims${qs}`);
      const data = await res.json();
      setClaims(res.ok ? (data.claims ?? []) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function act(id: string, action: "approve" | "reject" | "mark_paid") {
    let notes: string | undefined;
    if (action === "reject") {
      notes = window.prompt(t("Reason for rejection (optional):")) ?? undefined;
    }
    const res = await fetch(`/api/expense-claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Action failed"); return; }
    load(tab);
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "submit", label: "New Application", show: true },
    { key: "mine",   label: "My Applications", show: true },
    { key: "approve", label: "To Approve", show: canApprove },
    { key: "pay",    label: "To Pay", show: canPay },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Expenditure")}</h1>
        <p className="text-sm text-(--muted)">{t("File a multi-line expense claim and track its approval.")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.filter(x => x.show).map(x => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={tab === x.key
              ? { background: "var(--accent)", color: "var(--accent-contrast)" }
              : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
            {t(x.label)}
          </button>
        ))}
      </div>

      {tab === "submit" ? (
        <SubmitExpenseClaimForm applicantName={currentUser.name} onCreated={() => setTab("mine")} />
      ) : loading ? (
        <p className="text-sm text-(--muted)">{t("Loading…")}</p>
      ) : claims.length === 0 ? (
        <p className="text-sm text-(--muted) rounded-xl border p-6 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{t("Nothing here yet.")}</p>
      ) : (
        <div className="space-y-4">
          {claims.map(c => (
            <ClaimCard key={c._id} claim={c} tab={tab} onAct={act} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim: c, tab, onAct }: {
  claim: Claim;
  tab: string;
  onAct: (id: string, action: "approve" | "reject" | "mark_paid") => void;
}) {
  const t = useT();
  const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.submitted;
  const projectLabel = c.project ? `${c.project.code} — ${c.project.name}` : c.projectOther || "—";
  const approverLabel = c.approver?.name || c.approverOther || "—";

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-(--text)">{c.applicantName}
            <span className="text-(--muted) font-normal"> · {t(c.designation.charAt(0).toUpperCase() + c.designation.slice(1))}</span>
          </p>
          <p className="text-[12px] text-(--muted)">
            {projectLabel} · {t("Approver")}: {approverLabel} · {fmtDate(c.applicationDate)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>{t(s.label)}</span>
          <p className="text-lg font-bold text-(--text) mt-1">₹{c.totalAmount.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-(--muted) text-left">
              <th className="py-1 pr-3 font-medium">{t("Date")}</th>
              <th className="py-1 pr-3 font-medium">{t("Vendor")}</th>
              <th className="py-1 pr-3 font-medium">{t("Head")}</th>
              <th className="py-1 pr-3 font-medium text-right">{t("Amount")}</th>
              <th className="py-1 font-medium">{t("Docs")}</th>
            </tr>
          </thead>
          <tbody>
            {c.lineItems.map((l, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-1.5 pr-3 text-(--text)">{fmtDate(l.incurredAt)}</td>
                <td className="py-1.5 pr-3 text-(--text)">{l.vendor || "—"}</td>
                <td className="py-1.5 pr-3 text-(--text)">{l.head}</td>
                <td className="py-1.5 pr-3 text-(--text) text-right">₹{l.amount.toLocaleString("en-IN")}</td>
                <td className="py-1.5">
                  {l.receiptUrls.length === 0 ? <span className="text-(--muted)">—</span> : (
                    <span className="flex flex-wrap gap-1.5">
                      {l.receiptUrls.map((u, k) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>📄{k + 1}</a>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(c.rejection?.notes || c.approval?.notes || c.payment?.notes) && (
        <div className="text-[12px] text-(--muted) space-y-0.5">
          {c.approval && <p>✔ {t("Approved by")} {c.approval.by?.name ?? t("director")}{c.approval.notes ? ` — ${c.approval.notes}` : ""}</p>}
          {c.payment && <p>💸 {t("Paid by")} {c.payment.by?.name ?? t("finance")}{c.payment.notes ? ` — ${c.payment.notes}` : ""}</p>}
          {c.rejection && <p style={{ color: "var(--error-text)" }}>✕ {t("Rejected")}{c.rejection.notes ? ` — ${c.rejection.notes}` : ""}</p>}
        </div>
      )}

      {(tab === "approve" && c.status === "submitted") && (
        <div className="flex gap-2">
          <button onClick={() => onAct(c._id, "approve")} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Approve")}</button>
          <button onClick={() => onAct(c._id, "reject")} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--error-text)" }}>{t("Reject")}</button>
        </div>
      )}
      {(tab === "pay" && c.status === "approved") && (
        <div className="flex gap-2">
          <button onClick={() => onAct(c._id, "mark_paid")} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Mark Paid")}</button>
          <button onClick={() => onAct(c._id, "reject")} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--error-text)" }}>{t("Reject")}</button>
        </div>
      )}
    </div>
  );
}
