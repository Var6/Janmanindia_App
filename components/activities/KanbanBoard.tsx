"use client";

import { useT } from "@/components/i18n/LanguageProvider";

interface Activity {
  _id: string;
  title: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "planned" | "in_progress" | "done" | "cancelled";
  dueDate?: string;
  endsAt?: string;
  assignee:    { _id: string; name: string } | null;
  coAssignees?: { _id: string; name: string }[];
}

interface Props {
  items: Activity[];
  onStatus(id: string, status: Activity["status"]): void;
  busyId: string | null;
}

const COLUMNS: { key: Activity["status"]; label: string; color: string }[] = [
  { key: "planned",     label: "Planned",     color: "var(--info, #3b82f6)" },
  { key: "in_progress", label: "In Progress", color: "var(--warning, #f59e0b)" },
  { key: "done",        label: "Done",        color: "var(--success, #16a34a)" },
  { key: "cancelled",   label: "Cancelled",   color: "var(--muted, #9ca3af)" },
];

const PRIORITY_DOT: Record<string, string> = {
  low:    "var(--muted, #9ca3af)",
  medium: "var(--info, #3b82f6)",
  high:   "var(--error, #dc2626)",
};

export default function KanbanBoard({ items, onStatus, busyId }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const cards = items.filter((i) => i.status === col.key);
        return (
          <section key={col.key}
            className="rounded-2xl border border-(--border) bg-(--surface) overflow-hidden flex flex-col min-h-[280px]">
            <header className="px-4 py-3 border-b border-(--border) flex items-center justify-between"
              style={{ borderTop: `3px solid ${col.color}` }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <p className="text-sm font-semibold text-(--text)">{t(col.label)}</p>
              </div>
              <span className="text-xs font-mono text-(--muted)">{cards.length}</span>
            </header>

            <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[60vh]">
              {cards.length === 0 ? (
                <p className="text-xs text-(--muted) text-center py-6">{t("Empty")}</p>
              ) : cards.map((c) => {
                const overdue = c.dueDate && c.status !== "done" && c.status !== "cancelled" && new Date(c.dueDate) < new Date(new Date().toDateString());
                return (
                  <article key={c._id} className="rounded-xl border border-(--border) bg-(--bg) p-3 group">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: PRIORITY_DOT[c.priority] }} />
                      <p className="text-sm font-medium text-(--text) leading-snug">{c.title}</p>
                    </div>
                    <p className="text-[11px] text-(--muted) ml-4">
                      {c.assignee?.name ?? t("Unassigned")}
                      {c.coAssignees && c.coAssignees.length > 0 ? ` +${c.coAssignees.length}` : ""}
                      {" · "}<span className="capitalize">{c.category}</span>
                      {c.dueDate ? ` · ${formatKanbanWhen(c.dueDate, c.endsAt)}` : ""}
                    </p>
                    {overdue && (
                      <p className="text-[10px] uppercase font-bold mt-1 ml-4" style={{ color: "var(--error, #dc2626)" }}>
                        {t("Overdue")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      {COLUMNS.filter((other) => other.key !== col.key).map((other) => (
                        <button key={other.key}
                          onClick={() => onStatus(c._id, other.key)}
                          disabled={busyId === c._id}
                          title={`${t("Move to")} ${t(other.label)}`}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-(--border) text-(--muted) hover:text-(--text) hover:border-(--accent) disabled:opacity-50">
                          → {t(other.label)}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Compact "when" label for Kanban cards — date-only when there's no end,
 *  HH:mm range when same-day, otherwise just the date and start time. */
function formatKanbanWhen(startISO: string, endISO?: string): string {
  const start = new Date(startISO);
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const isAllDay = start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && !endISO;
  if (isAllDay) return start.toLocaleDateString("en-IN", dateOpts);
  if (!endISO) return `${start.toLocaleDateString("en-IN", dateOpts)} ${start.toLocaleTimeString("en-IN", timeOpts)}`;
  const end = new Date(endISO);
  const sameDay = start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth()
    && start.getDate() === end.getDate();
  if (sameDay) {
    return `${start.toLocaleDateString("en-IN", dateOpts)} ${start.toLocaleTimeString("en-IN", timeOpts)}–${end.toLocaleTimeString("en-IN", timeOpts)}`;
  }
  return `${start.toLocaleDateString("en-IN", dateOpts)} ${start.toLocaleTimeString("en-IN", timeOpts)}`;
}
