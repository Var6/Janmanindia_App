"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Pending = {
  _id: string;
  date: string;
  summary: string;
  hoursWorked: number;
  expenses: { description: string; amount: number; receiptUrl?: string }[];
  invoiceUrl?: string;
  submittedBy: { _id: string; name: string; email: string; district?: string } | null;
  hrNotes?: string;
};
type Recent = {
  _id: string;
  status: string;
  summary: string;
  submitter: string;
  updatedAt: string;
  amount: number;
  rejectionReason?: string;
};

interface Props {
  pending: Pending[];
  recent: Recent[];
}

export default function InvoiceApprovalList({ pending, recent }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function decide(id: string, action: "approve" | "reject", notes?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/eod-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (res.ok) {
        setRejectingId(null);
        setReason("");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section>
        <h2 className="font-semibold text-(--text) mb-3">Awaiting your approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">📥</p>
            <p className="text-sm text-(--muted)">No invoices in your queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              const total = r.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <article key={r._id} className="rounded-2xl border p-5 space-y-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-(--text)">{r.submittedBy?.name ?? "—"}</p>
                      <p className="text-xs text-(--muted)">
                        {r.submittedBy?.email}{r.submittedBy?.district ? ` · ${r.submittedBy.district}` : ""}
                        {" · "}{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-(--text)">₹{total.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-(--muted)">{r.hoursWorked}h worked · {r.expenses.length} expense line{r.expenses.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>

                  <p className="text-sm text-(--text)">{r.summary}</p>

                  {r.hrNotes && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                      <span className="font-semibold">HR note: </span>{r.hrNotes}
                    </p>
                  )}

                  {r.expenses.length > 0 && (
                    <div className="rounded-xl border divide-y" style={{ borderColor: "var(--border)" }}>
                      {r.expenses.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-(--text) truncate">{ex.description}</span>
                            {ex.receiptUrl && (
                              <a href={ex.receiptUrl} target="_blank" rel="noopener noreferrer"
                                className="text-(--accent) hover:underline">receipt</a>
                            )}
                          </div>
                          <span className="font-medium text-(--text)">₹{ex.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rejectingId === r._id ? (
                    <form onSubmit={(e) => { e.preventDefault(); decide(r._id, "reject", reason); }}
                      className="rounded-xl border p-3 space-y-2"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <p className="text-xs font-semibold text-(--text)">Reason for rejection</p>
                      <textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={5} rows={2}
                        placeholder="Brief reason — they'll see this and can resubmit."
                        className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={busyId === r._id || !reason.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                          Reject
                        </button>
                        <button type="button" onClick={() => { setRejectingId(null); setReason(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => decide(r._id, "approve")} disabled={busyId === r._id}
                        className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                        style={{ background: "var(--success)", color: "#fff" }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => setRejectingId(r._id)} disabled={busyId === r._id}
                        className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                        style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Recent decisions</h2>
          <div className="rounded-2xl border divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {recent.map(r => (
              <div key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-(--text) truncate">{r.summary}</p>
                  <p className="text-xs text-(--muted)">{r.submitter} · ₹{r.amount.toLocaleString("en-IN")} · {new Date(r.updatedAt).toLocaleDateString("en-IN")}</p>
                  {r.rejectionReason && <p className="text-[11px] text-(--error-text) mt-0.5">Reason: {r.rejectionReason}</p>}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{
                  background: r.status === "approved" ? "var(--success-bg)" : "var(--error-bg)",
                  color:      r.status === "approved" ? "var(--success-text)" : "var(--error-text)",
                }}>{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
