"use client";

import { useEffect, useState, useCallback } from "react";
import StatusChart from "./StatusChart";
import KanbanBoard from "./KanbanBoard";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { localInputToISO } from "@/lib/datetime";

interface Activity {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "planned" | "in_progress" | "done" | "cancelled";
  dueDate?: string;
  endsAt?: string;
  notes?: string;
  assignee:    { _id: string; name: string; role: string; employeeId?: string } | null;
  coAssignees: { _id: string; name: string; role: string; employeeId?: string }[];
  createdBy:   { _id: string; name: string; role: string } | null;
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
  // Form state for the create panel — kept controlled so the co-assignee
  // checklist can react to the primary selection.
  const [primaryAssignee, setPrimaryAssignee] = useState("");
  const [coAssignees, setCoAssignees] = useState<string[]>([]);
  const [coOpen, setCoOpen] = useState(false);
  // The time-slot fields are opt-in: most tasks are simple to-dos that
  // don't need a Google Calendar entry. Users click "Add a time slot" to
  // reveal Date / Time / Ends.
  //
  // Date and time live in *separate* inputs because the native
  // datetime-local picker on most browsers is too wide and clumsy. We merge
  // them back into one ISO instant on submit.
  const [timeOpen, setTimeOpen] = useState(false);
  const [whenDate, setWhenDate] = useState("");
  const [whenStart, setWhenStart] = useState("");
  const [whenEnd, setWhenEnd]   = useState("");
  // The whole create form is collapsed behind a "+ New activity" button by
  // default — this page is overwhelmingly used for viewing tasks, not
  // creating them, and a folded form keeps the layout calm.
  const [formOpen, setFormOpen] = useState(false);
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
    // Drop the primary from coAssignees so a person never gets listed twice.
    const cleanedCo = coAssignees.filter((id) => id && id !== primaryAssignee);
    // The schedule panel uses three small inputs (date / start time / end
    // time) instead of a single wide datetime-local picker. We merge them
    // into ISO instants here, parsed in the browser's local timezone so the
    // time the user typed is the time that ends up on Google Calendar.
    const startStr = whenDate && whenStart
      ? localInputToISO(`${whenDate}T${whenStart}`)
      : undefined;
    const endStr = whenDate && whenEnd
      ? localInputToISO(`${whenDate}T${whenEnd}`)
      : undefined;
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      category: String(fd.get("category") ?? "other"),
      priority: String(fd.get("priority") ?? "medium"),
      assignee: primaryAssignee,
      coAssignees: cleanedCo,
      dueDate: startStr,
      endsAt:  endStr,
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
    setPrimaryAssignee("");
    setCoAssignees([]);
    setCoOpen(false);
    setTimeOpen(false);
    setFormOpen(false);
    setWhenDate(""); setWhenStart(""); setWhenEnd("");
    await load();
  }

  function toggleCoAssignee(id: string) {
    setCoAssignees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
  const isMine = (a: Activity) =>
    a.assignee?._id === currentUserId ||
    (a.coAssignees ?? []).some((c) => c._id === currentUserId);
  const filtered = items.filter((a) => {
    if (filter === "mine")    return isMine(a);
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
      {/* Status chart up top — a quick read on where the team is. */}
      <StatusChart counts={counts} />

      {/* Action bar — collapsed by default. The page is overwhelmingly used
          for browsing the existing list, so we don't want a 600px-tall form
          stealing the fold on every visit. */}
      {!formOpen ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--text)">Plan an activity</p>
            <p className="text-xs text-(--muted) mt-0.5">
              Assign work to yourself, a teammate, or a group — with optional Google Calendar scheduling.
            </p>
          </div>
          <button type="button" onClick={() => setFormOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
            style={{ background: "var(--accent)", boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="3" y1="8" x2="13" y2="8"/>
              <line x1="8" y1="3" x2="8" y2="13"/>
            </svg>
            New activity
          </button>
        </div>
      ) : (
        // Constrained-width form — narrower than before so individual inputs
        // don't stretch across the page. Each row uses flexbox / grid with
        // intentional widths instead of full-bleed fields.
        <section className="mx-auto w-full max-w-2xl rounded-2xl border border-(--border) bg-(--surface) overflow-hidden"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b"
            style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-(--text) text-sm">New activity</h2>
            <button type="button" onClick={() => setFormOpen(false)}
              className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-(--bg-secondary)"
              style={{ color: "var(--muted)" }}>
              Close
            </button>
          </header>

          <form onSubmit={onCreate} className="px-5 py-4 space-y-3">
            {/* Title (wider) + Priority (narrow) on one row */}
            <div className="flex gap-2">
              <input name="title" required maxLength={200}
                placeholder="What needs doing?"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm placeholder:text-(--muted)/60 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
              <select name="priority" defaultValue="medium" title="Priority"
                className="w-28 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Category + Primary assignee on one row */}
            <div className="flex gap-2">
              <select name="category" defaultValue="other" title="Category"
                className="w-44 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
              {canAssign ? (
                <select value={primaryAssignee} title="Assign to"
                  onChange={(e) => {
                    const v = e.target.value;
                    setPrimaryAssignee(v);
                    if (v) setCoAssignees((prev) => prev.filter((id) => id !== v));
                  }}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                  <option value="">Assign to: myself</option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} · {u.role}
                    </option>
                  ))}
                </select>
              ) : (
                <input disabled placeholder="Assigned to me"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-(--border) bg-(--bg-secondary) text-(--muted) text-sm" />
              )}
            </div>

            {/* Description — kept compact at 2 rows */}
            <textarea name="description" rows={2}
              placeholder="Details (optional)"
              className="w-full px-3 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm resize-none placeholder:text-(--muted)/60 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />

            {/* Co-assignees — collapsible inline strip */}
            {canAssign && staff.length > 0 && (
              <div className="rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <button type="button" onClick={() => setCoOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-(--muted) hover:text-(--text) transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="text-(--muted)">+</span>
                    {coAssignees.length === 0
                      ? <span>Co-assignees</span>
                      : <span className="font-semibold text-(--text)">{coAssignees.length} co-assignee{coAssignees.length === 1 ? "" : "s"}</span>}
                  </span>
                  <span className="opacity-60 text-[10px]">{coOpen ? "▲" : "▼"}</span>
                </button>
                {coOpen && (
                  <div className="max-h-40 overflow-y-auto border-t" style={{ borderColor: "var(--border)" }}>
                    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {staff.filter((u) => u._id !== primaryAssignee).map((u) => {
                        const checked = coAssignees.includes(u._id);
                        return (
                          <li key={u._id}>
                            <label className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-(--bg-secondary) transition-colors">
                              <input type="checkbox" checked={checked}
                                onChange={() => toggleCoAssignee(u._id)}
                                className="accent-(--accent)" />
                              <span className="flex-1 text-(--text)">
                                {u.name} <span className="text-(--muted)">· {u.role}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Schedule — date/start/end as three small inputs that merge to
                ISO on submit. Native datetime-local is far too wide for a
                snug form. */}
            {!timeOpen ? (
              <button type="button" onClick={() => setTimeOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed transition-colors hover:border-(--accent) hover:text-(--accent) text-(--muted)"
                style={{ borderColor: "var(--border)" }}>
                <span className="text-sm">📅</span> Schedule
                <span className="text-[10px] text-(--muted) font-normal italic">— adds to Google Calendar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={whenDate} onChange={(e) => setWhenDate(e.target.value)}
                  className="w-44 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                {/* w-36 (~144px) is enough for the native time picker to show
                    "12:00 AM" or "12:00 PM" without truncation in any
                    browser. w-28 was clipping the meridiem on macOS Chrome. */}
                <input type="time" value={whenStart} onChange={(e) => setWhenStart(e.target.value)}
                  placeholder="Start" title="Start time"
                  className="w-36 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                <span className="text-(--muted) text-xs">→</span>
                <input type="time" value={whenEnd} onChange={(e) => setWhenEnd(e.target.value)}
                  placeholder="End" title="End time (optional)"
                  className="w-36 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                <button type="button" onClick={() => { setTimeOpen(false); setWhenDate(""); setWhenStart(""); setWhenEnd(""); }}
                  className="ml-auto text-xs text-(--muted) hover:text-(--error) transition-colors px-1.5 py-1"
                  title="Clear schedule">
                  ×
                </button>
              </div>
            )}

            {/* Submit row */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={() => setFormOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-(--bg-secondary)"
                style={{ color: "var(--muted)" }}>
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-(--accent-contrast) transition-opacity hover:brightness-110"
                style={{ background: "var(--accent)" }}>
                Add activity
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
          {([
            { k: "all",     l: `All (${items.length})` },
            { k: "mine",    l: `Assigned to me (${items.filter(isMine).length})` },
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
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-(--border) bg-(--surface) p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton w={42} h={14} rounded="full" />
                <Skeleton w={64} h={14} rounded="full" />
                <Skeleton w={80} h={14} rounded="full" />
              </div>
              <SkeletonRow withAvatar={false} trailing={true} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm text-(--muted)">No activities in this view.</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard items={filtered} onStatus={(id, status) => patch(id, { status })} busyId={busyId} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => {
            const st = STATUS_STYLE[a.status];
            const ps = PRIORITY_STYLE[a.priority];
            const overdue = a.dueDate && a.status !== "done" && a.status !== "cancelled" && new Date(a.dueDate) < new Date(new Date().toDateString());
            // Subtle priority accent stripe on the left edge — gives a quick
            // visual scan of the list without colouring the whole card.
            const priorityStripe = a.status === "cancelled" ? "var(--border)" : (ps.color ?? "var(--border)");
            return (
              <article key={a._id}
                className="group relative rounded-xl border border-(--border) bg-(--surface) p-4 pl-5 transition-all hover:border-(--muted-2) hover:shadow-(--shadow-sm)"
                style={{ borderLeft: `3px solid ${priorityStripe}` }}>
                <header className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
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
                    <p className="text-sm font-semibold text-(--text) leading-snug">{a.title}</p>
                    {a.description && <p className="text-xs text-(--muted) mt-1 leading-relaxed line-clamp-2">{a.description}</p>}
                    <p className="text-[11px] text-(--muted) mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="font-medium text-(--text-2)">{a.assignee?.name ?? "—"}</span>
                      {a.coAssignees && a.coAssignees.length > 0 && (
                        <span className="font-medium text-(--text-2)">+ {a.coAssignees.map((c) => c.name).join(", ")}</span>
                      )}
                      <span className="opacity-50">·</span>
                      <span>by {a.createdBy?.name ?? "—"}</span>
                      {a.dueDate && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{formatActivityWhen(a.dueDate, a.endsAt)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </header>

                <div className="flex flex-wrap gap-1.5 pt-3 mt-1 border-t border-(--border)/70">
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

/** Render the time slot for an activity:
 *   • all-day (midnight UTC start, no end)        → "Due 12 Mar"
 *   • timed start, no end                          → "Due 12 Mar 14:30"
 *   • same-day start + end                         → "12 Mar 14:30 – 15:30"
 *   • multi-day start + end                        → "12 Mar 14:30 → 13 Mar 09:00" */
function formatActivityWhen(startISO: string, endISO?: string): string {
  const start = new Date(startISO);
  const isAllDay = start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && !endISO;
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  if (isAllDay) return `Due ${start.toLocaleDateString("en-IN", dateOpts)}`;
  const startStr = `${start.toLocaleDateString("en-IN", dateOpts)} ${start.toLocaleTimeString("en-IN", timeOpts)}`;
  if (!endISO) return `Due ${startStr}`;
  const end = new Date(endISO);
  const sameDay = start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth()
    && start.getDate() === end.getDate();
  if (sameDay) return `${startStr} – ${end.toLocaleTimeString("en-IN", timeOpts)}`;
  return `${startStr} → ${end.toLocaleDateString("en-IN", dateOpts)} ${end.toLocaleTimeString("en-IN", timeOpts)}`;
}
