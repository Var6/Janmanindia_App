"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  _id: string;
  date: string;
  summary: string;
  hoursWorked: number;
  expenses: { description: string; amount: number; receiptUrl?: string }[];
  invoiceUrl?: string;
  submitterName: string;
  submitterEmail: string;
  submitterRole: string;
  submitterDistrict?: string;
  status: string;
  hrNotes?: string;
  rejectionReason?: string;
  amount: number;
};

interface Props {
  pending: Item[];
  forwarded: Item[];
  recent: Item[];
}

export default function HrInvoiceQueue({ pending, forwarded, recent }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function act(id: string, action: "hr_verify" | "reject", notes?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/eod-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (res.ok) {
        setRejectingId(null); setReason("");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section>
        <h2 className="font-semibold text-(--text) mb-3">Pending verification ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">📥</p>
            <p className="text-sm text-(--muted)">Inbox empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              const isLitigation = r.submitterRole === "litigation";
              return (
                <article key={r._id} className="rounded-2xl border p-5 space-y-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-(--text)">{r.submitterName}</p>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
                          {r.submitterRole}
                        </span>
                        {r.submitterDistrict && (
                          <span className="text-[10px] text-(--muted)">· {r.submitterDistrict}</span>
                        )}
                      </div>
                      <p className="text-xs text-(--muted) mt-0.5">
                        {r.submitterEmail} · {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-(--text)">₹{r.amount.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-(--muted)">{r.hoursWorked}h · {r.expenses.length} line{r.expenses.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>

                  <p className="text-sm text-(--text)">{r.summary}</p>

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
                    <form onSubmit={(e) => { e.preventDefault(); act(r._id, "reject", reason); }}
                      className="rounded-xl border p-3 space-y-2"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <p className="text-xs font-semibold text-(--text)">Reason for rejection</p>
                      <textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={5} rows={2}
                        placeholder="They'll see this and can resubmit."
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
                      <button onClick={() => act(r._id, "hr_verify")} disabled={busyId === r._id}
                        className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                        style={{ background: "var(--success)", color: "#fff" }}>
                        {isLitigation ? "Verify & Forward to Lawyer" : "Verify & Approve"}
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

      {forwarded.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Forwarded — awaiting head lawyer / director ({forwarded.length})</h2>
          <div className="rounded-2xl border divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {forwarded.map(r => (
              <div key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--text)">{r.submitterName} <span className="text-[10px] text-(--muted)">· {r.submitterRole}</span></p>
                  <p className="text-xs text-(--muted)">
                    {r.submitterDistrict ?? "no district"} · {new Date(r.date).toLocaleDateString("en-IN")} · ₹{r.amount.toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>HR Verified</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Recent decisions</h2>
          <div className="rounded-2xl border divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {recent.map(r => (
              <div key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--text)">{r.submitterName}</p>
                  <p className="text-xs text-(--muted)">{new Date(r.date).toLocaleDateString("en-IN")} · ₹{r.amount.toLocaleString("en-IN")}</p>
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
