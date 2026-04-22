"use client";

import { useEffect, useState, useCallback } from "react";
import StatusChart from "./StatusChart";
import KanbanBoard from "./KanbanBoard";

interface Activity {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "planned" | "in_progress" | "done" | "cancelled";
  dueDate?: string;
  notes?: string;
  assignee:  { _id: string; name: string; role: string; employeeId?: string } | null;
  createdBy: { _id: string; name: string; role: string } | null;
  createdAt: string;
}

interface StaffOption { _id: string; name: string; role: string; employeeId?: string }

interface Props {
  currentUserId: string;
  currentRole: string;
}

const CATEGORIES = [
  { v: "fieldwork",     l: "Fieldwork"     },
  { v: "meeting",       l: "Meeting"       },
  { v: "court",         l: "Court"         },
  { v: "training",      l: "Training"      },
  { v: "documentation", l: "Documentation" },
  { v: "outreach",      l: "Outreach"      },
  { v: "research",      l: "Research"      },
  { v: "admin",         l: "Admin"         },
  { v: "other",         l: "Other"         },
];

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  low:    { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)" },
  medium: { bg: "var(--info-bg, #dbeafe)",      color: "var(--info-text, #1e40af)" },
  high:   { bg: "var(--error-bg)",              color: "var(--error-text)" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "var(--info-bg, #dbeafe)",      color: "var(--info-text, #1e40af)",    label: "Planned"     },
  in_progress: { bg: "var(--warning-bg, #fef3c7)",   color: "var(--warning-text, #92400e)", label: "In progress" },
  done:        { bg: "var(--success-bg, #dcfce7)",   color: "var(--success-text, #15803d)", label: "Done"        },
  cancelled:   { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)",                 label: "Cancelled"   },
};

const ASSIGNABLE_ROLES = ["director", "superadmin", "administrator", "hr"];

export default function ActivityPlanner({ currentUserId, currentRole }: Props) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine" | "created">("all");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canAssign = ASSIGNABLE_ROLES.includes(currentRole);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities");
      const d = await res.json();
      setItems(d.activities ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canAssign) return;
    fetch("/api/users?role=socialworker,litigation,hr,finance,administrator,director")
      .then((r) => r.json())
      .then((d) => setStaff(d.users ?? []))
      .catch(() => {});
  }, [canAssign]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      category: String(fd.get("category") ?? "other"),
      priority: String(fd.get("priority") ?? "medium"),
      assignee: String(fd.get("assignee") ?? ""),
      dueDate:  String(fd.get("dueDate") ?? "") || undefined,
    };
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed to create");
      return;
    }
    form.reset();
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed");
      }
      await load();
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this activity?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed");
      }
      await load();
    } finally { setBusyId(null); }
  }

  // Filtering
  const filtered = items.filter((a) => {
    if (filter === "mine")    return a.assignee?._id === currentUserId;
    if (filter === "created") return a.createdBy?._id === currentUserId;
    return true;
  });

  // Chart counts
  const counts = {
    planned:     filtered.filter((a) => a.status === "planned").length,
    in_progress: filtered.filter((a) => a.status === "in_progress").length,
    done:        filtered.filter((a) => a.status === "done").length,
    cancelled:   filtered.filter((a) => a.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <StatusChart counts={counts} />

      {/* Create form */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) p-5">
        <h2 className="font-semibold text-(--text) mb-3">Plan an activity</h2>
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_120px] gap-2">
            <input name="title" required maxLength={200} placeholder="What needs doing?"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
            <select name="category" defaultValue="other"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            <select name="priority" defaultValue="medium"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <textarea name="description" rows={2} placeholder="Details (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
            {canAssign ? (
              <select name="assignee" defaultValue=""
                className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
                <option value="">Assign to: myself</option>
                {staff.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role}{u.employeeId ? ` · ${u.employeeId}` : ""})
                  </option>
                ))}
              </select>
            ) : <input type="hidden" name="assignee" value="" />}
            <input name="dueDate" type="date" placeholder="Due date"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast)"
              style={{ background: "var(--accent)" }}>
              Add
            </button>
          </div>
        </form>
      </section>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
          {([
            { k: "all",     l: `All (${items.length})` },
            { k: "mine",    l: `Assigned to me (${items.filter((i) => i.assignee?._id === currentUserId).length})` },
            { k: "created", l: `Created by me (${items.filter((i) => i.createdBy?._id === currentUserId).length})` },
          ] as const).map((t) => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === t.k ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
              }`}
              style={filter === t.k ? { background: "var(--accent)" } : undefined}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl">
          {(["list", "kanban"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                view === v ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
              }`}
              style={view === v ? { background: "var(--accent)" } : undefined}>
              {v === "kanban" ? "🗂 Kanban" : "☰ List"}
            </button>
          ))}
        </div>
      </div>

      {/* List or Kanban */}
      {loading ? (
        <div className="py-10 text-center text-sm text-(--muted)">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm text-(--muted)">No activities in this view.</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard items={filtered} onStatus={(id, status) => patch(id, { status })} busyId={busyId} />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const st = STATUS_STYLE[a.status];
            const ps = PRIORITY_STYLE[a.priority];
            const overdue = a.dueDate && a.status !== "done" && a.status !== "cancelled" && new Date(a.dueDate) < new Date(new Date().toDateString());
            return (
              <article key={a._id} className="rounded-xl border border-(--border) bg-(--surface) p-4">
                <header className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: ps.bg, color: ps.color }}>{a.priority}</span>
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded text-(--muted) border border-(--border)">
                        {a.category}
                      </span>
                      {overdue && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ background: "var(--error, #dc2626)" }}>
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-(--text)">{a.title}</p>
                    {a.description && <p className="text-xs text-(--muted) mt-0.5">{a.description}</p>}
                    <p className="text-[11px] text-(--muted) mt-1">
                      Assignee: {a.assignee?.name ?? "—"}{a.assignee?.employeeId ? ` (${a.assignee.employeeId})` : ""}
                      {" · "}Created by: {a.createdBy?.name ?? "—"}
                      {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </header>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-(--border)">
                  {a.status !== "in_progress" && a.status !== "done" && (
                    <button onClick={() => patch(a._id, { status: "in_progress" })} disabled={busyId === a._id}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded text-white disabled:opacity-50"
                      style={{ background: "var(--warning, #f59e0b)" }}>
                      Start
                    </button>
                  )}
                  {a.status !== "done" && (
                    <button onClick={() => patch(a._id, { status: "done" })} disabled={busyId === a._id}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded text-white disabled:opacity-50"
                      style={{ background: "var(--success, #16a34a)" }}>
                      Done
                    </button>
                  )}
                  {a.status !== "cancelled" && (
                    <button onClick={() => patch(a._id, { status: "cancelled" })} disabled={busyId === a._id}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded border border-(--border) text-(--muted) disabled:opacity-50">
                      Cancel
                    </button>
                  )}
                  {(a.createdBy?._id === currentUserId || canAssign) && (
                    <button onClick={() => remove(a._id)} disabled={busyId === a._id}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded ml-auto disabled:opacity-50"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
