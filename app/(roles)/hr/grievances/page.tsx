"use client";

import { useEffect, useState, useCallback } from "react";

interface Grievance {
  _id: string;
  category: string;
  subject: string;
  description: string;
  incidentDate?: string;
  incidentLocation?: string;
  involvedPersons?: string;
  status: "open" | "in_review" | "responded" | "closed";
  anonymous?: boolean;
  hrResponse?: string;
  respondedAt?: string;
  createdAt: string;
  submittedBy: { _id: string; name: string; email: string; role: string; employeeId?: string } | null;
  respondedBy?: { name: string; role: string } | null;
}

const STATUS_TABS: { key: "all" | Grievance["status"]; label: string }[] = [
  { key: "all",       label: "All"        },
  { key: "open",      label: "Open"       },
  { key: "in_review", label: "In Review"  },
  { key: "responded", label: "Responded"  },
  { key: "closed",    label: "Closed"     },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "var(--info-bg, #dbeafe)",       color: "var(--info-text, #1e40af)",    label: "Open"      },
  in_review: { bg: "var(--warning-bg, #fef3c7)",    color: "var(--warning-text, #92400e)", label: "In review" },
  responded: { bg: "var(--success-bg, #dcfce7)",    color: "var(--success-text, #15803d)", label: "Responded" },
  closed:    { bg: "var(--bg-secondary, #f3f4f6)",  color: "var(--muted)",                 label: "Closed"    },
};

export default function HrGrievancesPage() {
  const [items, setItems] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Grievance["status"]>("all");
  const [responding, setResponding] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grievances");
      const d = await res.json();
      setItems(d.grievances ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/grievances/${id}`, {
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
    acc[t.key] = t.key === "all" ? items.length : items.filter((i) => i.status === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Grievance Inbox</h1>
        <p className="text-sm text-(--muted) mt-1">
          Confidential reports submitted by employees. Respond promptly — anonymous submissions hide the submitter from HR.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t.key ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
            }`}
            style={filter === t.key ? { background: "var(--accent)" } : undefined}>
            {t.label} ({counts[t.key] ?? 0})
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
          {filtered.map((g) => {
            const st = STATUS_STYLE[g.status] ?? STATUS_STYLE.open;
            const isResponding = responding === g._id;
            return (
              <article key={g._id} className="rounded-2xl border border-(--border) bg-(--surface) p-5">
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {g.category}
                      </span>
                      {g.anonymous && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-(--border) text-(--muted)">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-(--text)">{g.subject}</p>
                    <p className="text-[11px] text-(--muted) mt-0.5">
                      {g.submittedBy
                        ? <>By {g.submittedBy.name} · {g.submittedBy.role}{g.submittedBy.employeeId ? ` · ${g.submittedBy.employeeId}` : ""} · {g.submittedBy.email}</>
                        : <>Submitter hidden (anonymous)</>}
                    </p>
                    <p className="text-[11px] text-(--muted)">
                      Submitted {new Date(g.createdAt).toLocaleString("en-IN")}
                      {g.incidentDate ? ` · Incident ${new Date(g.incidentDate).toLocaleDateString("en-IN")}` : ""}
                      {g.incidentLocation ? ` · ${g.incidentLocation}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </header>

                <p className="text-sm text-(--text) whitespace-pre-wrap mb-3">{g.description}</p>

                {g.involvedPersons && (
                  <p className="text-xs text-(--muted) mb-3">
                    <span className="font-semibold text-(--text)">Persons involved:</span> {g.involvedPersons}
                  </p>
                )}

                {g.hrResponse && (
                  <div className="mt-2 mb-3 rounded-lg border-l-4 px-3 py-2"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-subtle)" }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-(--accent) mb-1">
                      Response · {g.respondedBy?.name ?? "HR"}{g.respondedAt ? ` · ${new Date(g.respondedAt).toLocaleDateString("en-IN")}` : ""}
                    </p>
                    <p className="text-sm text-(--text) whitespace-pre-wrap">{g.hrResponse}</p>
                  </div>
                )}

                {isResponding ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const text = String(fd.get("response") ?? "").trim();
                    if (!text) { alert("Response cannot be empty"); return; }
                    patch(g._id, { hrResponse: text });
                  }} className="space-y-2 pt-3 border-t border-(--border)">
                    <textarea name="response" required rows={3}
                      defaultValue={g.hrResponse ?? ""}
                      placeholder="Write your response to the employee…"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setResponding(null)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--text)">
                        Cancel
                      </button>
                      <button type="submit" disabled={busyId === g._id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--accent-contrast) disabled:opacity-60"
                        style={{ background: "var(--accent)" }}>
                        {busyId === g._id ? "Sending…" : "Send response"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2 flex-wrap pt-3 border-t border-(--border)">
                    <button onClick={() => setResponding(g._id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--accent-contrast)"
                      style={{ background: "var(--accent)" }}>
                      {g.hrResponse ? "Edit response" : "Respond"}
                    </button>
                    {g.status === "open" && (
                      <button onClick={() => patch(g._id, { status: "in_review" })} disabled={busyId === g._id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--text) disabled:opacity-50">
                        Mark in review
                      </button>
                    )}
                    {g.status !== "closed" && (
                      <button onClick={() => patch(g._id, { status: "closed" })} disabled={busyId === g._id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-(--border) text-(--muted) disabled:opacity-50">
                        Close
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
