import Link from "next/link";
import mongoose from "mongoose";
import Activity from "@/models/Activity";

interface Props {
  userId: string;
}

/** Server component — drop into any staff dashboard. */
export default async function TodoWidget({ userId }: Props) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const me = new mongoose.Types.ObjectId(userId);

  const [planned, inProgress, doneRecent, overdue, upcoming] = await Promise.all([
    Activity.countDocuments({ assignee: me, status: "planned" }),
    Activity.countDocuments({ assignee: me, status: "in_progress" }),
    Activity.countDocuments({
      assignee: me, status: "done",
      completedAt: { $gte: new Date(Date.now() - 7 * 86400000) },
    }),
    Activity.countDocuments({
      assignee: me, status: { $in: ["planned", "in_progress"] },
      dueDate: { $lt: new Date() },
    }),
    Activity.find({
      assignee: me, status: { $in: ["planned", "in_progress"] },
    }).sort({ dueDate: 1, createdAt: -1 }).limit(4).select("title status dueDate priority").lean(),
  ]);

  const total = planned + inProgress;
  const PRIORITY_DOT: Record<string, string> = {
    low:    "var(--muted, #9ca3af)",
    medium: "var(--info, #3b82f6)",
    high:   "var(--error, #dc2626)",
  };

  return (
    <section className="rounded-2xl border border-(--border) bg-(--surface) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-(--text) text-sm">My Todos</h2>
          {overdue > 0 && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: "var(--error, #dc2626)" }}>
              {overdue} overdue
            </span>
          )}
        </div>
        <Link href="/activities" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
          Open planner →
        </Link>
      </div>

      <div className="grid grid-cols-3 divide-x divide-(--border)">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-(--text)">{planned}</p>
          <p className="text-[10px] uppercase tracking-wide text-(--muted) mt-1">Planned</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--warning, #f59e0b)" }}>{inProgress}</p>
          <p className="text-[10px] uppercase tracking-wide text-(--muted) mt-1">In progress</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--success, #16a34a)" }}>{doneRecent}</p>
          <p className="text-[10px] uppercase tracking-wide text-(--muted) mt-1">Done · 7d</p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <ul className="divide-y divide-(--border) border-t border-(--border)">
          {upcoming.map((u) => {
            const isOverdue = u.dueDate && new Date(u.dueDate) < new Date(new Date().toDateString());
            return (
              <li key={String(u._id)} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[u.priority] }} />
                  <p className="text-sm text-(--text) truncate">{u.title}</p>
                </div>
                <span className={`text-[10px] shrink-0 ${isOverdue ? "font-bold" : ""}`}
                  style={isOverdue ? { color: "var(--error, #dc2626)" } : { color: "var(--muted)" }}>
                  {u.dueDate ? new Date(u.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : u.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {total === 0 && upcoming.length === 0 && (
        <p className="px-5 py-6 text-center text-xs text-(--muted)">
          No active todos. <Link href="/activities" className="underline" style={{ color: "var(--accent)" }}>Plan one →</Link>
        </p>
      )}
    </section>
  );
}
