"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Pending = { _id: string; name: string; email: string; phone?: string; motivation?: string; requestedAt?: string; district?: string };
type Approved = { _id: string; name: string; email: string; decidedAt?: string; district?: string };

interface Props {
  pending: Pending[];
  approved: Approved[];
}

export default function PlvRequestsList({ pending, approved }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function decide(id: string, decision: "approved" | "rejected", rejectionReason?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}/plv-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: rejectionReason }),
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
        <h2 className="font-semibold text-(--text) mb-3">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-(--muted)">No PLV requests in the queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <article key={r._id} className="rounded-2xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-(--text)">{r.name}</p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {r.email}{r.phone ? ` · ${r.phone}` : ""}{r.district ? ` · ${r.district}` : ""}
                    </p>
                  </div>
                  {r.requestedAt && (
                    <p className="text-[11px] text-(--muted) shrink-0">
                      Requested {new Date(r.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>

                {r.motivation && (
                  <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
                    <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">Motivation</p>
                    <p className="text-sm text-(--text) whitespace-pre-line leading-relaxed">{r.motivation}</p>
                  </div>
                )}

                {rejectingId === r._id ? (
                  <form onSubmit={(e) => { e.preventDefault(); decide(r._id, "rejected", reason); }}
                    className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <p className="text-xs font-semibold text-(--text)">Why are you declining?</p>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={5} rows={2}
                      placeholder="Brief, kind reason — they can re-apply later."
                      className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={busyId === r._id || !reason.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                        style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                        Send Rejection
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
                    <button onClick={() => decide(r._id, "approved")} disabled={busyId === r._id}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "var(--success)", color: "#fff" }}>
                      ✓ Approve as PLV
                    </button>
                    <button onClick={() => setRejectingId(r._id)} disabled={busyId === r._id}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {approved.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Recently approved PLVs ({approved.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {approved.map(a => (
              <div key={a._id} className="rounded-xl border p-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <p className="text-sm font-medium text-(--text)">{a.name}</p>
                <p className="text-xs text-(--muted)">
                  {a.email}{a.district ? ` · ${a.district}` : ""}{a.decidedAt ? ` · approved ${new Date(a.decidedAt).toLocaleDateString("en-IN")}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
