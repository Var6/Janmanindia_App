"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

/* ── Types ──────────────────────────────────────────────────────────────── */
type UserRef = { _id: string; name: string; email?: string; role?: string } | null;
type Decision = { by: UserRef; at: string; notes?: string } | null;

type CaseExpense = {
  _id: string;
  category: "admin" | "training" | "exploration" | "staff" | "travel" | "legal" | "other";
  title: string;
  description?: string;
  amount: number;
  vendor?: string;
  receiptUrl?: string;
  incurredAt?: string;
  paidByOrg?: boolean;
  status: "submitted" | "hr_verified" | "director_approved" | "paid" | "rejected";
  submittedBy: UserRef;
  submittedRole?: string;
  submittedAt: string;
  hrVerification?: Decision;
  directorApproval?: Decision;
  payment?: Decision;
  rejection?: { stage: "hr" | "director"; by: UserRef; at: string; notes?: string } | null;
};

/* The two case-finance lanes. A *requisition* is org-funded (the org pays the
 * cost directly / in advance); a *reimbursement* is money a worker spent out
 * of pocket and is claiming back. The `paidByOrg` flag on each expense decides
 * which lane it lands in. */
type Lane = "requisition" | "reimbursement";

const CATEGORIES: { value: CaseExpense["category"]; label: string }[] = [
  { value: "legal",       label: "Legal / Court" },
  { value: "travel",      label: "Travel" },
  { value: "staff",       label: "Staff Cost" },
  { value: "admin",       label: "Admin / Office" },
  { value: "exploration", label: "Exploration" },
  { value: "training",    label: "Training" },
  { value: "other",       label: "Other" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  admin: "🛠", training: "🎓", exploration: "🧭", staff: "👥", travel: "🚗", legal: "⚖️", other: "📦",
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  submitted:         { bg: "var(--warning-bg)", text: "var(--warning-text)", label: "Awaiting verification" },
  hr_verified:       { bg: "var(--info-bg)",    text: "var(--info-text)",    label: "Awaiting director" },
  director_approved: { bg: "var(--info-bg)",    text: "var(--info-text)",    label: "Awaiting payment" },
  paid:              { bg: "var(--success-bg)", text: "var(--success-text)", label: "Paid" },
  rejected:          { bg: "var(--error-bg)",   text: "var(--error-text)",   label: "Rejected" },
};

// Mirror of the server-side gates in /api/expenses.
const APPROVER_ROLES = ["hr", "finance", "director", "superadmin"];
const PAYER_ROLES     = ["finance", "director", "superadmin"];
const SUBMITTER_ROLES = ["administrator", "hr", "director", "superadmin", "socialworker", "litigation", "finance"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function CaseFinanceTab({ caseId }: { caseId: string }) {
  const t = useT();
  const [role, setRole] = useState<string>("");
  const [expenses, setExpenses] = useState<CaseExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lane, setLane] = useState<Lane>("requisition");

  async function load() {
    try {
      const res = await fetch(`/api/expenses?case=${caseId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("Failed to load case finances.")); return; }
      setExpenses(data.expenses ?? []);
    } catch {
      setError(t("Network error."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/users/me").then(r => r.json()).then(d => setRole(d.user?.role ?? "")).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const canAdd = SUBMITTER_ROLES.includes(role);

  // requisition lane = org-funded (paidByOrg true); reimbursement = self-paid.
  const inLane = expenses.filter(x => (lane === "requisition" ? x.paidByOrg : !x.paidByOrg));
  const totalApproved = inLane
    .filter(x => x.status === "paid" || x.status === "director_approved")
    .reduce((s, x) => s + x.amount, 0);

  return (
    <div className="space-y-4">
      {/* Lane sub-tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {([
          ["requisition",   "Requisition"],
          ["reimbursement", "Reimbursement"],
        ] as const).map(([k, label]) => {
          const sel = lane === k;
          const count = expenses.filter(x => (k === "requisition" ? x.paidByOrg : !x.paidByOrg)).length;
          return (
            <button key={k} type="button" onClick={() => setLane(k)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: sel ? "var(--accent)" : "transparent", color: sel ? "var(--accent-contrast)" : "var(--muted)" }}>
              {t(label)}{count > 0 ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-(--muted) px-1">
        {lane === "requisition"
          ? t("Costs the organisation pays directly for this case (advance / requisition).")
          : t("Money paid out of pocket on this case, claimed back from the organisation.")}
        {totalApproved > 0 && (
          <span className="ml-1 font-semibold text-(--text)">
            · ₹{totalApproved.toLocaleString("en-IN")} {t("approved/paid")}
          </span>
        )}
      </p>

      {canAdd && <AddCaseExpenseForm caseId={caseId} paidByOrg={lane === "requisition"} onCreated={load} />}

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-(--muted) px-1">{t("Loading…")}</p>
      ) : inLane.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-2xl mb-1">🧾</p>
          <p className="text-sm text-(--muted)">
            {lane === "requisition" ? t("No requisitions for this case yet.") : t("No reimbursement claims for this case yet.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inLane.map(x => (
            <ExpenseCard key={x._id} expense={x} role={role} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add form ───────────────────────────────────────────────────────────── */
function AddCaseExpenseForm({ caseId, paidByOrg, onCreated }: {
  caseId: string; paidByOrg: boolean; onCreated: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orgPays, setOrgPays] = useState(paidByOrg);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the toggle in sync with whichever lane the user opened the form from.
  useEffect(() => { if (!open) setOrgPays(paidByOrg); }, [paidByOrg, open]);

  async function uploadReceipt(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setReceiptUrl(data.url);
      else alert(data.error ?? t("Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      caseId,
      paidByOrg: orgPays,
      category: fd.get("category"),
      title: fd.get("title"),
      description: fd.get("description") || undefined,
      amount: Number(fd.get("amount")),
      vendor: fd.get("vendor") || undefined,
      incurredAt: fd.get("incurredAt") || undefined,
      receiptUrl: receiptUrl || undefined,
    };
    try {
      const res = await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("Failed")); return; }
      (e.target as HTMLFormElement).reset();
      setReceiptUrl("");
      setOpen(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        + {paidByOrg ? t("Add Requisition") : t("Add Reimbursement")}
      </button>
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm";
  const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <form onSubmit={submit} className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-(--text)">{t("Add case expense")}</h3>
        <button type="button" onClick={() => { setOpen(false); setReceiptUrl(""); setError(""); }}
          className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}

      {/* Paid-by-organisation toggle — picks requisition vs reimbursement. */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          [true,  "Paid by organisation (Requisition)"],
          [false, "Paid by me — claim back (Reimbursement)"],
        ] as const).map(([val, label]) => {
          const sel = orgPays === val;
          return (
            <button key={String(val)} type="button" onClick={() => setOrgPays(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={sel
                ? { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "var(--accent)" }
                : { background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }}>
              {t(label)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select name="category" required defaultValue="legal" className={inputCls} style={inputStyle}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
        </select>
        <input name="amount" required type="number" min={1} step="0.01" placeholder={t("Amount (₹)")}
          className={inputCls} style={inputStyle} />
      </div>

      <input name="title" required maxLength={200} placeholder={t("Short title (e.g. Court filing fee)")}
        className={inputCls} style={inputStyle} />
      <textarea name="description" rows={2} placeholder={t("What the cost was for (optional)")}
        className={`${inputCls} resize-none`} style={inputStyle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="vendor" placeholder={t("Paid to / vendor (optional)")} className={inputCls} style={inputStyle} />
        <input name="incurredAt" type="date" className={inputCls} style={inputStyle} />
      </div>

      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); e.target.value = ""; }} />
        {receiptUrl ? (
          <div className="flex items-center gap-2 text-xs">
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>📎 {t("receipt attached")}</a>
            <button type="button" onClick={() => setReceiptUrl("")}
              className="px-2 py-0.5 rounded text-[12px]" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Remove")}</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            {uploading ? t("Uploading…") : `📎 ${t("Attach receipt")}`}
          </button>
        )}
      </div>

      <button type="submit" disabled={busy}
        className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {busy ? t("Submitting…") : t("Submit for Approval")}
      </button>
      <p className="text-[12px] text-(--muted)">
        {t("Routing: HR verifies → Director approves → Finance marks it paid.")}
      </p>
    </form>
  );
}

/* ── Single expense card + inline approval actions ──────────────────────── */
function ExpenseCard({ expense: x, role, onChanged }: {
  expense: CaseExpense; role: string; onChanged: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Which forward action (if any) this viewer can take at the current stage.
  const action: "hr_verify" | "director_approve" | "mark_paid" | null =
    x.status === "submitted"          && APPROVER_ROLES.includes(role) ? "hr_verify"
    : x.status === "hr_verified"       && APPROVER_ROLES.includes(role) ? "director_approve"
    : x.status === "director_approved" && PAYER_ROLES.includes(role)    ? "mark_paid"
    : null;
  const canReject = (x.status === "submitted" || x.status === "hr_verified") && APPROVER_ROLES.includes(role);

  const stat = STATUS_STYLE[x.status] ?? STATUS_STYLE.submitted;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/${x._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { setRejecting(false); setReason(""); setNotes(""); onChanged(); }
      else { const d = await res.json(); alert(d.error ?? t("Failed")); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{CATEGORY_EMOJI[x.category] ?? "📦"}</span>
            <p className="text-sm font-bold text-(--text)">{x.title}</p>
          </div>
          <p className="text-xs text-(--muted) mt-0.5">
            <span className="capitalize">{x.category}</span>
            {" · "}{t("filed by")} {x.submittedBy?.name ?? "—"} <span className="text-[11px]">({x.submittedRole})</span>
            {" · "}{fmtDate(x.submittedAt)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-(--text)">₹{x.amount.toLocaleString("en-IN")}</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block"
            style={{ background: stat.bg, color: stat.text }}>{t(stat.label)}</span>
        </div>
      </div>

      {x.description && <p className="text-sm text-(--text)">{x.description}</p>}

      <div className="flex items-center gap-3 flex-wrap text-xs text-(--muted)">
        <span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
          {x.paidByOrg ? t("Requisition (org-funded)") : t("Reimbursement (self-paid)")}
        </span>
        {x.vendor && <span>{t("Paid to:")} <span className="text-(--text) font-medium">{x.vendor}</span></span>}
        {x.incurredAt && <span>{t("Incurred:")} {fmtDate(x.incurredAt)}</span>}
        {x.receiptUrl && (
          <a href={x.receiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>📎 {t("receipt")}</a>
        )}
      </div>

      {(x.hrVerification || x.directorApproval || x.payment) && (
        <div className="rounded-xl border p-3 space-y-1 text-xs" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          {x.hrVerification && <Step label={t("Verified")} decision={x.hrVerification} />}
          {x.directorApproval && <Step label={t("Director approved")} decision={x.directorApproval} />}
          {x.payment && <Step label={t("Paid")} decision={x.payment} />}
        </div>
      )}

      {x.rejection && (
        <div className="rounded-xl p-3 text-xs"
          style={{ background: "var(--error-bg)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
          <p className="font-semibold text-(--error-text)">
            {x.rejection.stage === "hr" ? t("Rejected at verification stage") : t("Rejected at director stage")}
            {x.rejection.by?.name ? ` ${t("by")} ${x.rejection.by.name}` : ""}
          </p>
          {x.rejection.notes && <p className="text-(--text) mt-0.5">{t("Reason:")} {x.rejection.notes}</p>}
        </div>
      )}

      {action && (
        rejecting ? (
          <form onSubmit={(e) => { e.preventDefault(); patch({ action: "reject", notes: reason }); }}
            className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            <p className="text-xs font-semibold text-(--text)">{t("Reason")}</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={5} rows={2}
              className="w-full px-3 py-1.5 rounded-lg border text-sm resize-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={busy || !reason.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("Reject")}</button>
              <button type="button" onClick={() => { setRejecting(false); setReason(""); }}
                className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel")}</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <input value={notes} onChange={e => setNotes(e.target.value)} maxLength={300}
              placeholder={t("Optional notes for this approval")}
              className="w-full px-3 py-1.5 rounded-lg border text-xs"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => patch({ action, notes })} disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: "var(--success)", color: "#fff" }}>
                {action === "hr_verify" ? `✓ ${t("Verify")}` : action === "director_approve" ? `✓ ${t("Director Approve")}` : `✓ ${t("Mark Paid")}`}
              </button>
              {canReject && (
                <button onClick={() => setRejecting(true)} disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
                  {t("Reject")}
                </button>
              )}
            </div>
          </div>
        )
      )}
    </article>
  );
}

function Step({ label, decision }: { label: string; decision: NonNullable<CaseExpense["hrVerification"]> }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-(--text)">
        ✓ {label}{decision?.by?.name ? ` — ${decision.by.name}` : ""}
        {decision?.notes ? ` · ${decision.notes}` : ""}
      </span>
      {decision?.at && <span className="text-(--muted)">{fmtDate(decision.at)}</span>}
    </p>
  );
}
