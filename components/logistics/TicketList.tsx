"use client";

import { useEffect, useState, useCallback } from "react";

export interface Ticket {
  _id: string;
  category: string;
  urgency: "normal" | "high" | "critical";
  status: "open" | "in_progress" | "fulfilled" | "rejected" | "closed";
  title: string;
  description: string;
  beneficiary?: string;
  district?: string;
  location?: string;
  response?: string;
  rejectedReason?: string;
  fulfilledAt?: string;
  createdAt: string;
  raisedBy:   { _id: string; name: string; role: string; employeeId?: string; email?: string } | null;
  assignedTo: { name: string; role: string } | null;
}

interface Props {
  /** "mine" → /api/logistics returns own; "admin" → admin/director sees all */
  mode: "mine" | "admin";
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:        { bg: "var(--info-bg, #dbeafe)",      color: "var(--info-text, #1e40af)",    label: "Open"        },
  in_progress: { bg: "var(--warning-bg, #fef3c7)",   color: "var(--warning-text, #92400e)", label: "In progress" },
  fulfilled:   { bg: "var(--success-bg, #dcfce7)",   color: "var(--success-text, #15803d)", label: "Fulfilled"   },
  rejected:    { bg: "var(--error-bg)",              color: "var(--error-text)",            label: "Rejected"    },
  closed:      { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)",                 label: "Closed"      },
};

const URGENCY_STYLE: Record<string, { bg: string; color: string }> = {
  normal:   { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)" },
  high:     { bg: "var(--warning-bg, #fef3c7)",   color: "var(--warning-text, #92400e)" },
  critical: { bg: "var(--error-bg)",              color: "var(--error-text)" },
};

const STATUS_TABS = ["all", "open", "in_progress", "fulfilled", "rejected", "closed"] as const;

export default function TicketList({ mode }: Props) {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_TABS[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logistics");
      const d = await res.json();
      setItems(d.tickets ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/logistics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed");
      } else {
        await load();
        setResponding(null);
      }
    } finally { setBusyId(null); }
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t] = t === "all" ? items.length : items.filter((i) => i.status === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              filter === t ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
            }`}
            style={filter === t ? { background: "var(--accent)" } : undefined}>
            {t.replace("_", " ")} ({counts[t] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-(--muted)">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm text-(--muted)">Nothing in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const st = STATUS_STYLE[t.status];
            const us = URGENCY_STYLE[t.urgency];
            const isResponding = responding === t._id;
            return (
              <article key={t._id} className="rounded-2xl border border-(--border) bg-(--surface) p-5">
                <header className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {t.category}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: us.bg, color: us.color }}>
                        {t.urgency}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-(--text)">{t.title}</p>
                    <p className="text-[11px] text-(--muted) mt-0.5">
                      Raised by {t.raisedBy?.name ?? "—"}
                      {t.raisedBy?.role ? ` (${t.raisedBy.role}` : ""}
                      {t.raisedBy?.employeeId ? ` · ${t.raisedBy.employeeId})` : t.raisedBy?.role ? ")" : ""}
                      {" · "}{new Date(t.createdAt).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-(--muted)">
                      {t.beneficiary ? `For: ${t.beneficiary} · ` : ""}
                      {t.district ? `${t.district}` : ""}{t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </header>

                <p className="text-sm text-(--text) whitespace-pre-wrap mb-3">{t.description}</p>

                {t.response && (
                  <div className="rounded-lg border-l-4 px-3 py-2 mb-3"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-subtle)" }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-(--accent) mb-1">
                      Administrator response{t.assignedTo ? ` · ${t.assignedTo.name}` : ""}
                    </p>
                    <p className="text-sm text-(--text) whitespace-pre-wrap">{t.response}</p>
                  </div>
                )}
                {t.rejectedReason && (
                  <div className="rounded-lg border-l-4 px-3 py-2 mb-3"
                    style={{ borderColor: "var(--error, #dc2626)", background: "var(--error-bg)" }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--error-text)" }}>
                      Rejected
                    </p>
                    <p className="text-sm text-(--text) whitespace-pre-wrap">{t.rejectedReason}</p>
                  </div>
                )}

                {mode === "admin" && (
                  isResponding ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const text = String(fd.get("response") ?? "").trim();
                      const status = String(fd.get("status") ?? "in_progress");
                      patch(t._id, { response: text, status });
                    }} className="space-y-2 pt-2 border-t border-(--border)">
                      <textarea name="response" required rows={2} defaultValue={t.response ?? ""}
                        placeholder="Response to the requester (when, how, by whom)…"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />
                      <div className="flex flex-wrap gap-2 items-center">
                        <select name="status" defaultValue="in_progress"
                          className="px-3 py-1.5 text-xs rounded-lg border border-(--border) bg-(--bg) text-(--text)">
                          <option value="in_progress">In progress</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button type="button" onClick={() => setResponding(null)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--text)">
                          Cancel
                        </button>
                        <button type="submit" disabled={busyId === t._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--accent-contrast) disabled:opacity-60"
                          style={{ background: "var(--accent)" }}>
                          {busyId === t._id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border)">
                      <button onClick={() => setResponding(t._id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--accent-contrast)"
                        style={{ background: "var(--accent)" }}>
                        Respond / change status
                      </button>
                      {t.status === "open" && (
                        <button onClick={() => patch(t._id, { status: "in_progress" })} disabled={busyId === t._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--text) disabled:opacity-50">
                          Mark in-progress
                        </button>
                      )}
                      {t.status !== "fulfilled" && (
                        <button onClick={() => patch(t._id, { status: "fulfilled" })} disabled={busyId === t._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                          style={{ background: "var(--success, #16a34a)" }}>
                          Mark fulfilled
                        </button>
                      )}
                      {t.status !== "closed" && (
                        <button onClick={() => patch(t._id, { status: "closed" })} disabled={busyId === t._id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--muted) disabled:opacity-50">
                          Close
                        </button>
                      )}
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
