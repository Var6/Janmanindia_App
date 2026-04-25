"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRef = { _id: string; name: string; email?: string; role?: string } | null;
type Decision = { by: UserRef; at: string; notes?: string } | null;

export type ExpenseItem = {
  _id: string;
  category: "admin" | "training" | "exploration" | "staff" | "travel" | "legal" | "other";
  title: string;
  description?: string;
  amount: number;
  vendor?: string;
  receiptUrl?: string;
  incurredAt?: string;
  status: "submitted" | "hr_verified" | "director_approved" | "paid" | "rejected";
  project: { _id: string; code: string; name: string } | null;
  submittedBy: UserRef;
  submittedRole?: string;
  submittedAt: string;
  hrVerification?: Decision;
  directorApproval?: Decision;
  payment?: Decision;
  rejection?: { stage: "hr" | "director"; by: UserRef; at: string; notes?: string } | null;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  submitted:         { bg: "var(--warning-bg)",   text: "var(--warning-text)", label: "Awaiting HR" },
  hr_verified:       { bg: "var(--info-bg)",      text: "var(--info-text)",    label: "Awaiting Director" },
  director_approved: { bg: "var(--info-bg)",      text: "var(--info-text)",    label: "Awaiting Finance" },
  paid:              { bg: "var(--success-bg)",   text: "var(--success-text)", label: "Paid" },
  rejected:          { bg: "var(--error-bg)",     text: "var(--error-text)",   label: "Rejected" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  admin: "🛠", training: "🎓", exploration: "🧭", staff: "👥", travel: "🚗", legal: "⚖️", other: "📦",
};

interface Props {
  items: ExpenseItem[];
  /** Action to surface as the primary button per item. */
  action?: "hr_verify" | "director_approve" | "mark_paid" | null;
  /** Whether the queue should also expose a Reject button. */
  allowReject?: boolean;
  /** Empty-state message when items.length === 0. */
  empty?: string;
  /** Optional title shown above the list. */
  title?: string;
}

export default function ExpenseQueue({ items, action, allowReject, empty, title }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setRejectingId(null); setReason(""); router.refresh(); }
      else {
        const d = await res.json();
        alert(d.error ?? "Failed");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      {title && <h2 className="font-semibold text-(--text) mb-3">{title} ({items.length})</h2>}
      {items.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-(--muted)">{empty ?? "Nothing here yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(x => {
            const stat = STATUS_STYLE[x.status] ?? STATUS_STYLE.submitted;
            return (
              <article key={x._id} className="rounded-2xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{CATEGORY_EMOJI[x.category] ?? "📦"}</span>
                      <p className="text-sm font-bold text-(--text)">{x.title}</p>
                    </div>
                    <p className="text-xs text-(--muted) mt-0.5">
                      <span className="font-mono font-bold">{x.project?.code ?? "—"}</span>
                      {" · "}{x.project?.name ?? "—"}
                      {" · "}<span className="capitalize">{x.category}</span>
                      {" · "}filed by {x.submittedBy?.name ?? "—"} <span className="text-[10px]">({x.submittedRole})</span>
                      {" · "}{new Date(x.submittedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-(--text)">₹{x.amount.toLocaleString("en-IN")}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block"
                      style={{ background: stat.bg, color: stat.text }}>
                      {stat.label}
                    </span>
                  </div>
                </div>

                {x.description && <p className="text-sm text-(--text)">{x.description}</p>}

                <div className="flex items-center gap-3 flex-wrap text-xs text-(--muted)">
                  {x.vendor && <span>Vendor: <span className="text-(--text) font-medium">{x.vendor}</span></span>}
                  {x.incurredAt && <span>Incurred: {new Date(x.incurredAt).toLocaleDateString("en-IN")}</span>}
                  {x.receiptUrl && (
                    <a href={x.receiptUrl} target="_blank" rel="noopener noreferrer"
                      className="hover:underline" style={{ color: "var(--accent)" }}>
                      📎 receipt
                    </a>
                  )}
                </div>

                {(x.hrVerification || x.directorApproval || x.payment) && (
                  <div className="rounded-xl border p-3 space-y-1 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    {x.hrVerification && <Step label="HR verified" decision={x.hrVerification} />}
                    {x.directorApproval && <Step label="Director approved" decision={x.directorApproval} />}
                    {x.payment && <Step label="Paid" decision={x.payment} />}
                  </div>
                )}

                {x.rejection && (
                  <div className="rounded-xl p-3 text-xs"
                    style={{ background: "var(--error-bg)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
                    <p className="font-semibold text-(--error-text)">
                      Rejected at {x.rejection.stage === "hr" ? "HR" : "Director"} stage
                      {x.rejection.by?.name ? ` by ${x.rejection.by.name}` : ""}
                    </p>
                    {x.rejection.notes && <p className="text-(--text) mt-0.5">Reason: {x.rejection.notes}</p>}
                  </div>
                )}

                {action && (
                  rejectingId === x._id ? (
                    <form onSubmit={(e) => { e.preventDefault(); patch(x._id, { action: "reject", notes: reason }); }}
                      className="rounded-xl border p-3 space-y-2"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <p className="text-xs font-semibold text-(--text)">Reason</p>
                      <textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={5} rows={2}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm resize-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={busy === x._id || !reason.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>Reject</button>
                        <button type="button" onClick={() => { setRejectingId(null); setReason(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <input value={actionNotes[x._id] ?? ""} onChange={e => setActionNotes(s => ({ ...s, [x._id]: e.target.value }))}
                        placeholder="Optional notes for this approval" maxLength={300}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => patch(x._id, { action, notes: actionNotes[x._id] })} disabled={busy === x._id}
                          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                          style={{ background: "var(--success)", color: "#fff" }}>
                          {action === "hr_verify" ? "✓ HR Verify" : action === "director_approve" ? "✓ Director Approve" : "✓ Mark Paid"}
                        </button>
                        {allowReject && (
                          <button onClick={() => setRejectingId(x._id)} disabled={busy === x._id}
                            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                            style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Step({ label, decision }: { label: string; decision: NonNullable<ExpenseItem["hrVerification"]> }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-(--text)">
        ✓ {label}{decision?.by?.name ? ` — ${decision.by.name}` : ""}
        {decision?.notes ? ` · ${decision.notes}` : ""}
      </span>
      {decision?.at && <span className="text-(--muted)">{new Date(decision.at).toLocaleDateString("en-IN")}</span>}
    </p>
  );
}
