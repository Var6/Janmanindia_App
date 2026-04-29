"use client";

import { useEffect, useState, useCallback } from "react";
import StatusChart from "./StatusChart";
import KanbanBoard from "./KanbanBoard";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

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
    // Start/end are datetime-local strings ("YYYY-MM-DDTHH:mm"). The API
    // ignores `endsAt` if it isn't strictly after `dueDate`, so we don't need
    // to validate here — just pass them through.
    const startStr = String(fd.get("dueDate") ?? "");
    const endStr   = String(fd.get("endsAt")  ?? "");
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      category: String(fd.get("category") ?? "other"),
      priority: String(fd.get("priority") ?? "medium"),
      assignee: primaryAssignee,
      coAssignees: cleanedCo,
      dueDate: startStr || undefined,
      endsAt:  endStr   || undefined,
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
      <StatusChart counts={counts} />

      {/* Create form */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) p-6 space-y-1">
        <h2 className="font-semibold text-(--text) text-base">Plan an activity</h2>
        <p className="text-xs text-(--muted) mb-5">
          Add a new task — assign it to yourself, a teammate, or several people. Pin a time slot to make it appear on Google Calendar.
        </p>
        <form onSubmit={onCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_140px] gap-4">
            <Field label="Task title" required htmlFor="act-title"
              hint="Keep it short and specific so the assignee knows what to do."
              example="Visit Sangam Vihar shelter for follow-up">
              <Input id="act-title" name="title" required maxLength={200}
                placeholder="What needs doing?" />
            </Field>
            <Field label="Category" htmlFor="act-category">
              <Select id="act-category" name="category" defaultValue="other">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="act-priority">
              <Select id="act-priority" name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <Field label="Details" htmlFor="act-desc"
            hint="Anything the assignee needs to know — context, contact details, prior steps. Optional."
            example="Met with the family on 4 Apr; need to verify Aadhaar and submit FIR copy.">
            <Textarea id="act-desc" name="description" rows={3}
              placeholder="Describe the task in a couple of sentences" />
          </Field>

          {canAssign && (
            <Field label="Primary assignee" htmlFor="act-assignee"
              hint="The person who owns the task. They'll see it on their dashboard and Google Calendar.">
              <Select id="act-assignee" value={primaryAssignee}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrimaryAssignee(v);
                  // Drop the new primary from co-assignees if it's there.
                  if (v) setCoAssignees((prev) => prev.filter((id) => id !== v));
                }}>
                <option value="">— Myself —</option>
                {staff.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role}{u.employeeId ? ` · ${u.employeeId}` : ""})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {canAssign && staff.length > 0 && (
            <Field label="Also assign to"
              hint="Tick anyone who should receive a copy of this task. Useful for joint visits or paired training.">
              <div className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <button type="button" onClick={() => setCoOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-(--muted) hover:text-(--text) transition-colors">
                  <span>
                    {coAssignees.length === 0
                      ? <span className="italic">No one selected — this stays a single-person task</span>
                      : <span className="font-semibold text-(--text)">{coAssignees.length} co-assignee{coAssignees.length === 1 ? "" : "s"} picked</span>}
                  </span>
                  <span className="opacity-60">{coOpen ? "▲" : "▼"}</span>
                </button>
                {coOpen && (
                  <div className="max-h-48 overflow-y-auto border-t" style={{ borderColor: "var(--border)" }}>
                    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {staff.filter((u) => u._id !== primaryAssignee).map((u) => {
                        const checked = coAssignees.includes(u._id);
                        return (
                          <li key={u._id}>
                            <label className="flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer hover:bg-(--bg-secondary) transition-colors">
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
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Starts" htmlFor="act-start"
              hint="When the work begins. Leave blank for an undated task — it stays a to-do without a calendar entry."
              example="04 Apr 2026, 14:30">
              <Input id="act-start" name="dueDate" type="datetime-local" />
            </Field>
            <Field label="Ends" htmlFor="act-end"
              hint="Optional. When blank, Google Calendar reserves a 30-minute slot from the start time."
              example="04 Apr 2026, 15:30">
              <Input id="act-end" name="endsAt" type="datetime-local" />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-(--accent-contrast) transition-opacity hover:brightness-110"
              style={{ background: "var(--accent)", boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
              Add activity
            </button>
          </div>
        </form>
      </section>

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
                      {a.coAssignees && a.coAssignees.length > 0
                        ? ` + ${a.coAssignees.map((c) => c.name).join(", ")}`
                        : ""}
                      {" · "}Created by: {a.createdBy?.name ?? "—"}
                      {a.dueDate ? ` · ${formatActivityWhen(a.dueDate, a.endsAt)}` : ""}
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
