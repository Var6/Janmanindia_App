"use client";

import { useEffect, useState, useCallback } from "react";
import StatusChart from "./StatusChart";
import KanbanBoard from "./KanbanBoard";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { localInputToISO } from "@/lib/datetime";
import MentionInput, { MentionText, type MentionMember } from "./MentionInput";
import { useT } from "@/components/i18n/LanguageProvider";

interface TodoComment {
  _id: string;
  text: string;
  by?: string;
  byName?: string;
  byRole?: string;
  createdAt: string;
}

interface Todo {
  _id: string;
  title: string;
  done: boolean;
  doneAt?: string;
  /** Populated user refs for everyone @-mentioned in `title`. */
  mentions?: { _id: string; name: string; role?: string }[];
  /** Threaded discussion on this checklist item. */
  comments?: TodoComment[];
}

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
  todos?: Todo[];
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

const ASSIGNABLE_ROLES = ["director", "superadmin", "administrator", "hr", "litigation"];

export default function ActivityPlanner({ currentUserId, currentRole }: Props) {
  const t = useT();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine" | "created">("all");
  // Scope is a VIEW only — an activity is always assigned to specific people,
  // never "organisation-wide" as a property. "mine" = activities I'm on or
  // created (the default); "org" = a read-only view of everything the whole
  // organisation has planned. Switch with the toggle.
  const [scope, setScope] = useState<"mine" | "org">("mine");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Form state for the create panel — kept controlled so the co-assignee
  // checklist can react to the primary selection.
  const [primaryAssignee, setPrimaryAssignee] = useState("");
  const [coAssignees, setCoAssignees] = useState<string[]>([]);
  const [coOpen, setCoOpen] = useState(false);
  // The time-slot fields are opt-in: most tasks are simple to-dos that
  // don't need a Google Calendar entry. Users click "Schedule" to reveal
  // start / end date+time inputs.
  //
  // Date and time live in *separate* inputs because the native
  // datetime-local picker on most browsers is too wide and clumsy. We merge
  // them back into one ISO instant on submit. We also keep start/end as
  // separate dates so a multi-day activity (training, court hearing across
  // sessions, multi-day fieldwork camp) can span across midnight.
  const [timeOpen, setTimeOpen]   = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [endTime, setEndTime]     = useState("");
  // The whole create form is collapsed behind a "+ New activity" button by
  // default — this page is overwhelmingly used for viewing tasks, not
  // creating them, and a folded form keeps the layout calm.
  const [formOpen, setFormOpen] = useState(false);
  const canAssign = ASSIGNABLE_ROLES.includes(currentRole);
  // Creator-only reschedule panel state.
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reDate, setReDate] = useState("");
  const [reTime, setReTime] = useState("");
  const [reEndDate, setReEndDate] = useState("");
  const [reEndTime, setReEndTime] = useState("");

  function openReschedule(a: Activity) {
    if (reschedId === a._id) { setReschedId(null); return; }
    setReschedId(a._id);
    const s = a.dueDate ? new Date(a.dueDate) : null;
    const e = a.endsAt ? new Date(a.endsAt) : null;
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    setReDate(s ? `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}` : "");
    setReTime(s ? `${pad(s.getHours())}:${pad(s.getMinutes())}` : "");
    setReEndDate(e ? `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}` : "");
    setReEndTime(e ? `${pad(e.getHours())}:${pad(e.getMinutes())}` : "");
  }

  async function saveReschedule(id: string) {
    if (!reDate) return;
    const dueDate = localInputToISO(`${reDate}T${reTime || "00:00"}`);
    const effEnd = reEndDate || (reEndTime ? reDate : "");
    const endsAt = effEnd ? localInputToISO(`${effEnd}T${reEndTime || "23:59"}`) : undefined;
    await patch(id, { dueDate, ...(endsAt ? { endsAt } : {}) });
    setReschedId(null);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(scope === "org" ? "/api/activities?assignee=all" : "/api/activities");
      const d = await res.json();
      setItems(d.activities ?? []);
    } finally { setLoading(false); }
  }, [scope]);

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
    // The schedule panel uses paired date+time inputs for start and end so
    // multi-day activities work. We merge each pair into a single ISO instant
    // in the browser's local timezone, so the wall-clock time the user typed
    // is the time that ends up on Google Calendar.
    //
    // If only the start date is filled (no time), it's treated as an all-day
    // activity. If the end date is omitted but an end time is given, we
    // assume same-day end. If the end is missing entirely, the calendar sync
    // falls back to a 30-min default.
    const effectiveEndDate = endDate || (startDate && endTime ? startDate : "");
    const startStr = startDate
      ? localInputToISO(`${startDate}T${startTime || "00:00"}`)
      : undefined;
    const endStr = effectiveEndDate && (endTime || endDate)
      ? localInputToISO(`${effectiveEndDate}T${endTime || "23:59"}`)
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
      alert(d.error ?? t("Failed to create"));
      return;
    }
    form.reset();
    setPrimaryAssignee("");
    setCoAssignees([]);
    setCoOpen(false);
    setTimeOpen(false);
    setFormOpen(false);
    setStartDate(""); setStartTime(""); setEndDate(""); setEndTime("");
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
        alert(d.error ?? t("Failed"));
      }
      await load();
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!confirm(t("Delete this activity?"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? t("Failed"));
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
            <p className="text-sm font-semibold text-(--text)">{t("Plan an activity")}</p>
            <p className="text-xs text-(--muted) mt-0.5">
              {t("Assign work to yourself, a teammate, or a group — with optional Google Calendar scheduling.")}
            </p>
          </div>
          <button type="button" onClick={() => setFormOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
            style={{ background: "var(--accent)", boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="3" y1="8" x2="13" y2="8"/>
              <line x1="8" y1="3" x2="8" y2="13"/>
            </svg>
            {t("New activity")}
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
            <h2 className="font-semibold text-(--text) text-sm">{t("New activity")}</h2>
            <button type="button" onClick={() => setFormOpen(false)}
              className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-(--bg-secondary)"
              style={{ color: "var(--muted)" }}>
              {t("Close")}
            </button>
          </header>

          <form onSubmit={onCreate} className="px-5 py-4 space-y-3">
            {/* Title (wider) + Priority (narrow) on one row */}
            <div className="flex gap-2">
              <input name="title" required maxLength={200}
                placeholder={t("What needs doing?")}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm placeholder:text-(--muted)/60 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
              <select name="priority" defaultValue="medium" title={t("Priority")}
                className="w-28 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                <option value="low">{t("Low")}</option>
                <option value="medium">{t("Medium")}</option>
                <option value="high">{t("High")}</option>
              </select>
            </div>

            {/* Category + Primary assignee on one row */}
            <div className="flex gap-2">
              <select name="category" defaultValue="other" title={t("Category")}
                className="w-44 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{t(c.l)}</option>)}
              </select>
              {canAssign ? (
                <select value={primaryAssignee} title={t("Assign to")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPrimaryAssignee(v);
                    if (v) setCoAssignees((prev) => prev.filter((id) => id !== v));
                  }}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all">
                  <option value="">{t("Assign to: myself")}</option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} · {u.role}
                    </option>
                  ))}
                </select>
              ) : (
                <input disabled placeholder={t("Assigned to me")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-(--border) bg-(--bg-secondary) text-(--muted) text-sm" />
              )}
            </div>

            {/* Description — kept compact at 2 rows */}
            <textarea name="description" rows={2}
              placeholder={t("Details (optional)")}
              className="w-full px-3 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm resize-none placeholder:text-(--muted)/60 focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />

            {/* Co-assignees — collapsible inline strip */}
            {canAssign && staff.length > 0 && (
              <div className="rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <button type="button" onClick={() => setCoOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-(--muted) hover:text-(--text) transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="text-(--muted)">+</span>
                    {coAssignees.length === 0
                      ? <span>{t("Co-assignees")}</span>
                      : <span className="font-semibold text-(--text)">{coAssignees.length} {coAssignees.length === 1 ? t("co-assignee") : t("co-assignees")}</span>}
                  </span>
                  <span className="opacity-60 text-[11px]">{coOpen ? "▲" : "▼"}</span>
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

            {/* Schedule — separate start and end date+time pickers so the
                activity can span multiple days. Same-day events: pick one
                date, fill both times. Multi-day: pick different end date.
                Native datetime-local is too wide for the snug form, so we
                keep the two halves side-by-side as small inputs. */}
            {!timeOpen ? (
              <button type="button" onClick={() => setTimeOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed transition-colors hover:border-(--accent) hover:text-(--accent) text-(--muted)"
                style={{ borderColor: "var(--border)" }}>
                <span className="text-sm">📅</span> {t("Schedule")}
                <span className="text-[11px] text-(--muted) font-normal italic">{t("— supports multi-day, syncs to Google Calendar")}</span>
              </button>
            ) : (
              <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-(--muted) uppercase tracking-wide">{t("Schedule")}</p>
                  <button type="button"
                    onClick={() => { setTimeOpen(false); setStartDate(""); setStartTime(""); setEndDate(""); setEndTime(""); }}
                    className="text-xs text-(--muted) hover:text-(--error) transition-colors px-1.5 py-0.5"
                    title={t("Clear schedule")}>
                    {t("Clear ×")}
                  </button>
                </div>
                {/* Start row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium text-(--muted) w-10 shrink-0">{t("From")}</span>
                  <input type="date" value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      // Convenience: if the end date was empty or earlier than
                      // the new start, follow the start date so same-day events
                      // are a one-click setup.
                      if (!endDate || (endDate && endDate < v)) setEndDate(v);
                    }}
                    className="w-44 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                  {/* w-36 (~144px) is enough for the native time picker to show
                      "12:00 AM" / "12:00 PM" without truncation. */}
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    title={t("Start time (leave blank for all-day)")}
                    className="w-36 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                </div>
                {/* End row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium text-(--muted) w-10 shrink-0">{t("To")}</span>
                  <input type="date" value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    title={t("End date (defaults to start date for same-day events)")}
                    className="w-44 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    title={t("End time (optional)")}
                    className="w-36 px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all" />
                </div>
                {endDate && startDate && endDate !== startDate && (
                  <p className="text-[11px] text-(--muted) italic">
                    {t("Multi-day activity — runs across")} {dayCount(startDate, endDate)} {t("days.")}
                  </p>
                )}
              </div>
            )}

            {/* Submit row */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={() => setFormOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-(--bg-secondary)"
                style={{ color: "var(--muted)" }}>
                {t("Cancel")}
              </button>
              <button type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-(--accent-contrast) transition-opacity hover:brightness-110"
                style={{ background: "var(--accent)" }}>
                {t("Add activity")}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Scope toggle — personal vs organisation-wide visibility */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
          {([
            { k: "mine", l: t("My work") },
            { k: "org",  l: t("Whole organisation") },
          ] as const).map((s) => (
            <button key={s.k} onClick={() => setScope(s.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                scope === s.k ? "text-(--accent-contrast)" : "text-(--muted) hover:text-(--text)"
              }`}
              style={scope === s.k ? { background: "var(--accent)" } : undefined}>
              {s.k === "org" ? `🏢 ${s.l}` : `👤 ${s.l}`}
            </button>
          ))}
        </div>
        {scope === "org" && (
          <span className="text-[12px] text-(--muted)">{t("Everything planned across the organisation — read-only.")}</span>
        )}
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-(--surface) border border-(--border) rounded-xl w-fit">
          {([
            { k: "all",     l: `${t("All")} (${items.length})` },
            { k: "mine",    l: `${t("Assigned to me")} (${items.filter(isMine).length})` },
            { k: "created", l: `${t("Created by me")} (${items.filter((i) => i.createdBy?._id === currentUserId).length})` },
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
              {v === "kanban" ? t("🗂 Kanban") : t("☰ List")}
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
          <p className="text-sm text-(--muted)">{t("No activities in this view.")}</p>
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
                      <span className="text-[11px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: ps.bg, color: ps.color }}>{a.priority}</span>
                      <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded text-(--muted) border border-(--border)">
                        {a.category}
                      </span>
                      {overdue && (
                        <span className="text-[11px] uppercase font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ background: "var(--error, #dc2626)" }}>
                          {t("Overdue")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-(--text) leading-snug">{a.title}</p>
                    {a.description && <p className="text-xs text-(--muted) mt-1 leading-relaxed line-clamp-2">{a.description}</p>}
                    <p className="text-[12px] text-(--muted) mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="font-medium text-(--text-2)">{a.assignee?.name ?? "—"}</span>
                      {a.coAssignees && a.coAssignees.length > 0 && (
                        <span className="font-medium text-(--text-2)">+ {a.coAssignees.map((c) => c.name).join(", ")}</span>
                      )}
                      <span className="opacity-50">·</span>
                      <span>{t("by")} {a.createdBy?.name ?? "—"}</span>
                      {a.dueDate && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{formatActivityWhen(a.dueDate, a.endsAt)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {t(st.label)}
                  </span>
                </header>

                {/* Checklist — small subtasks the assignee(s) tick off as
                    work moves forward. Strikes through done items. Anyone
                    on the activity (assignee, co-assignee, creator) can
                    add/tick/remove via /api/activities/[id]. The `members`
                    list is who you can `@`-mention — assignee + co-assignees,
                    deduped. */}
                <ActivityTodos
                  activityId={a._id}
                  todos={a.todos ?? []}
                  members={[
                    ...(a.assignee ? [{ _id: a.assignee._id, name: a.assignee.name, role: a.assignee.role }] : []),
                    ...(a.coAssignees ?? []).map((c) => ({ _id: c._id, name: c.name, role: c.role })),
                  ].filter((m, i, arr) => arr.findIndex((x) => x._id === m._id) === i)}
                  currentUserId={currentUserId}
                  onChanged={load}
                />

                {(() => {
                  const isCreator = a.createdBy?._id === currentUserId;
                  // "Conclude" only unlocks once the scheduled slot has passed
                  // (unscheduled activities can conclude anytime).
                  const schedEnd = a.endsAt ?? a.dueDate;
                  const canConclude = !schedEnd || new Date(schedEnd).getTime() <= Date.now();
                  const resched = reschedId === a._id;
                  return (
                    <>
                      <div className="flex flex-wrap gap-1.5 pt-3 mt-1 border-t border-(--border)/70">
                        {a.status !== "in_progress" && a.status !== "done" && (
                          <button onClick={() => patch(a._id, { status: "in_progress" })} disabled={busyId === a._id}
                            className="px-2.5 py-1 text-[12px] font-semibold rounded text-white disabled:opacity-50"
                            style={{ background: "var(--warning, #f59e0b)" }}>
                            {t("Start")}
                          </button>
                        )}
                        {a.status !== "done" && a.status !== "cancelled" && (
                          <span data-tip={canConclude ? undefined : t("Unlocks after the scheduled time has passed")}>
                            <button onClick={() => patch(a._id, { status: "done" })} disabled={busyId === a._id || !canConclude}
                              className="px-2.5 py-1 text-[12px] font-semibold rounded text-white disabled:opacity-40"
                              style={{ background: "var(--success, #16a34a)" }}>
                              {canConclude ? t("Conclude") : `🔒 ${t("Conclude")}`}
                            </button>
                          </span>
                        )}
                        {isCreator && a.status !== "done" && a.status !== "cancelled" && (
                          <button onClick={() => openReschedule(a)} disabled={busyId === a._id}
                            className="px-2.5 py-1 text-[12px] font-semibold rounded border disabled:opacity-50"
                            style={{ borderColor: "var(--border)", color: resched ? "var(--accent)" : "var(--text)" }}>
                            🗓 {resched ? t("Close") : t("Reschedule")}
                          </button>
                        )}
                        {isCreator && (
                          <button onClick={() => remove(a._id)} disabled={busyId === a._id}
                            className="px-2.5 py-1 text-[12px] font-semibold rounded ml-auto disabled:opacity-50"
                            style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                            {t("Delete")}
                          </button>
                        )}
                      </div>

                      {/* Creator-only reschedule panel */}
                      {resched && isCreator && (
                        <div className="mt-2 rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <label className="block">
                              <span className="block text-[11px] font-semibold text-(--muted) mb-0.5">{t("Start date")}</span>
                              <input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-(--surface)" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-semibold text-(--muted) mb-0.5">{t("Start time")}</span>
                              <input type="time" value={reTime} onChange={(e) => setReTime(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-(--surface)" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-semibold text-(--muted) mb-0.5">{t("End date")}</span>
                              <input type="date" value={reEndDate} onChange={(e) => setReEndDate(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-(--surface)" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-semibold text-(--muted) mb-0.5">{t("End time")}</span>
                              <input type="time" value={reEndTime} onChange={(e) => setReEndTime(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-(--surface)" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                            </label>
                          </div>
                          <button onClick={() => saveReschedule(a._id)} disabled={busyId === a._id || !reDate}
                            className="px-3 py-1.5 text-[12px] font-bold rounded-lg disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                            {t("Save new schedule")}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Per-activity checklist — fetches no extra data; mutates via PATCH on the
 *  parent activity and asks the planner to reload after each change. */
function ActivityTodos({ activityId, todos, members, currentUserId, onChanged }: {
  activityId: string;
  todos: Todo[];
  /** Whom you can @-mention in this activity (assignee + co-assignees). */
  members: MentionMember[];
  currentUserId: string;
  onChanged: () => void | Promise<void>;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [draft,  setDraft]  = useState("");
  const [draftMentions, setDraftMentions] = useState<string[]>([]);
  const [busy,   setBusy]   = useState(false);
  // Inline edit state — `editingId` is the todo currently in edit mode, and
  // `editDraft` is the in-flight title. We render an <input> in place of the
  // text label and commit on Enter / blur, cancel on Escape. Mentions track
  // the user ids the in-flight title `@`-references.
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState("");
  const [editMentions, setEditMentions] = useState<string[]>([]);
  // Which checklist item's discussion thread is expanded, and the in-flight reply.
  const [threadFor, setThreadFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  async function sendReply(todoId: string) {
    const txt = reply.trim();
    if (!txt) return;
    setReply("");
    await call({ commentTodo: { id: todoId, text: txt } });
  }

  async function saveCommentEdit(todoId: string) {
    const id = editCommentId;
    const txt = editCommentText.trim();
    setEditCommentId(null); setEditCommentText("");
    if (!id || !txt) return;
    await call({ editTodoComment: { todoId, commentId: id, text: txt } });
  }

  const total = todos.length;
  const done  = todos.filter((t) => t.done).length;

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? t("Failed"));
        return;
      }
      await onChanged();
    } finally { setBusy(false); }
  }

  async function add() {
    const t = draft.trim();
    if (!t) { setAdding(false); return; }
    await call({ addTodo: { title: t, mentions: draftMentions } });
    setDraft("");
    setDraftMentions([]);
    setAdding(false);
  }

  function startEdit(todo: Todo) {
    setEditingId(todo._id);
    setEditDraft(todo.title);
    setEditMentions((todo.mentions ?? []).map((m) => m._id));
  }

  async function commitEdit() {
    if (!editingId) return;
    const next = editDraft.trim();
    const original = todos.find((t) => t._id === editingId)?.title ?? "";
    const mentions = editMentions;
    setEditingId(null);
    setEditDraft("");
    setEditMentions([]);
    if (!next || next === original) return; // empty or unchanged → no-op
    await call({ editTodo: { id: editingId, title: next, mentions } });
  }

  if (total === 0 && !adding) {
    return (
      <button type="button" onClick={() => setAdding(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-(--muted) hover:text-(--accent) transition-colors">
        <span className="text-xs">＋</span> {t("Add a checklist")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border bg-(--bg) px-3 py-2 space-y-1.5"
      style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-(--muted)">
          {t("Checklist")} {total > 0 && <span className="font-normal">· {done}/{total} {t("done")}</span>}
        </p>
        {total > 0 && (
          <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary, #f3f4f6)" }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? Math.round((done / total) * 100) : 0}%`,
                background: "var(--success, #16a34a)",
              }} />
          </div>
        )}
        <button type="button" onClick={() => setAdding((v) => !v)}
          className="text-[12px] text-(--muted) hover:text-(--accent) transition-colors px-1">
          {adding ? t("Cancel") : t("+ Add")}
        </button>
      </div>

      <ul className="space-y-0.5">
        {todos.map((todo) => {
          const isEditing = editingId === todo._id;
          const commentCount = todo.comments?.length ?? 0;
          const threadOpen = threadFor === todo._id;
          return (
            <li key={todo._id} className="group/item">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={todo.done} disabled={busy || isEditing}
                  onChange={(e) => call({ toggleTodo: { id: todo._id, done: e.target.checked } })}
                  className="accent-(--accent) cursor-pointer" />
                {isEditing ? (
                  <MentionInput
                    value={editDraft}
                    members={members}
                    onChange={(text, ids) => { setEditDraft(text); setEditMentions(ids); }}
                    onCommit={commitEdit}
                    onCancel={() => { setEditingId(null); setEditDraft(""); setEditMentions([]); }}
                    autoFocus
                    className="flex-1 w-full px-1.5 py-0.5 text-xs rounded border bg-(--surface) focus:outline-none focus:border-(--accent)"
                  />
                ) : (
                  <button type="button" onClick={() => startEdit(todo)}
                    title={t("Click to edit")}
                    className="flex-1 text-left cursor-text">
                    <MentionText text={todo.title} members={members} struck={todo.done} />
                  </button>
                )}
                {!isEditing && (
                  <>
                    <button type="button"
                      onClick={() => setThreadFor(threadOpen ? null : todo._id)}
                      className={`text-[12px] transition-all px-1 ${threadOpen ? "text-(--accent)" : "text-(--muted) hover:text-(--accent)"}`}
                      title={t("Reply")}>
                      💬{commentCount > 0 ? ` ${commentCount}` : ""}
                    </button>
                    <button type="button" disabled={busy}
                      onClick={() => startEdit(todo)}
                      className="opacity-0 group-hover/item:opacity-100 text-[12px] text-(--muted) hover:text-(--accent) transition-all px-1"
                      title={t("Edit")}>
                      ✎
                    </button>
                    <button type="button" disabled={busy}
                      onClick={() => call({ removeTodo: { id: todo._id } })}
                      className="opacity-0 group-hover/item:opacity-100 text-[12px] text-(--muted) hover:text-(--error) transition-all px-1"
                      title={t("Remove")}>
                      ×
                    </button>
                  </>
                )}
              </div>

              {/* Discussion thread — messages are always visible; the reply box
                  opens on the 💬 button so anyone can chime in. */}
              {(commentCount > 0 || threadOpen) && (
                <div className="ml-6 mt-1 mb-1.5 pl-3 border-l space-y-1" style={{ borderColor: "var(--border)" }}>
                  {commentCount === 0 && threadOpen && (
                    <p className="text-[12px] text-(--muted) italic">{t("No messages yet — start the discussion.")}</p>
                  )}
                  {(todo.comments ?? []).map((c) => {
                    const mine = Boolean(c.by && c.by === currentUserId);
                    const editing = editCommentId === c._id;
                    return (
                      <div key={c._id} className="group/msg flex items-start gap-1 text-[12px] leading-snug">
                        {editing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveCommentEdit(todo._id); } if (e.key === "Escape") { setEditCommentId(null); setEditCommentText(""); } }}
                              autoFocus
                              className="flex-1 px-1.5 py-0.5 text-[12px] rounded border bg-(--surface) focus:outline-none focus:border-(--accent)"
                              style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                            <button type="button" onClick={() => saveCommentEdit(todo._id)} className="text-[12px] px-1" style={{ color: "var(--accent)" }} title={t("Save")}>✓</button>
                            <button type="button" onClick={() => { setEditCommentId(null); setEditCommentText(""); }} className="text-[12px] px-1 text-(--muted)" title={t("Cancel")}>✕</button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 min-w-0">
                              <span className="font-semibold text-(--text)">{c.byName || t("Unknown")}</span>
                              {c.byRole && <span className="text-(--muted)"> · {c.byRole}</span>}
                              <span className="text-(--muted)">: </span>
                              <span className="text-(--text)">{c.text}</span>
                            </span>
                            {mine && (
                              <span className="opacity-0 group-hover/msg:opacity-100 flex gap-0.5 shrink-0 transition-opacity">
                                <button type="button" onClick={() => { setEditCommentId(c._id); setEditCommentText(c.text); }} className="px-1 text-(--muted) hover:text-(--accent)" title={t("Edit")}>✎</button>
                                <button type="button" onClick={() => call({ deleteTodoComment: { todoId: todo._id, commentId: c._id } })} className="px-1 text-(--muted) hover:text-(--error)" title={t("Delete")}>×</button>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {threadOpen && (
                    <div className="flex items-center gap-2 pt-1">
                      <input value={reply} onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(todo._id); } }}
                        placeholder={t("Write a message…")}
                        className="flex-1 px-1.5 py-0.5 text-xs rounded border bg-(--surface) focus:outline-none focus:border-(--accent)"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                      <button type="button" onClick={() => sendReply(todo._id)} disabled={busy || !reply.trim()}
                        className="px-2.5 py-1 rounded-md text-[12px] font-semibold disabled:opacity-50"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                        {t("Send")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="flex items-center gap-2 pt-1">
          <MentionInput
            value={draft}
            members={members}
            onChange={(text, ids) => { setDraft(text); setDraftMentions(ids); }}
            onCommit={add}
            onCancel={() => { setAdding(false); setDraft(""); setDraftMentions([]); }}
            autoFocus
            placeholder={t("Sub-task — type @ to assign someone")}
          />
          <button type="button" onClick={add} disabled={busy || !draft.trim()}
            className="px-2.5 py-1 rounded-md text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {t("Add")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Inclusive day count between two `yyyy-mm-dd` strings — used so the form
 *  can show "runs across N days" when the activity spans midnight. Both ends
 *  are local-naïve dates from <input type="date"> so a Date round-trip is
 *  safe. */
function dayCount(startYmd: string, endYmd: string): number {
  const a = new Date(`${startYmd}T00:00:00`);
  const b = new Date(`${endYmd}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
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
