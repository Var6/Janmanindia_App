"use client";

import { useT } from "@/components/i18n/LanguageProvider";

interface Entry {
  _id?: string;
  action: string;
  summary: string;
  by: { _id: string; name: string; role?: string } | string | null;
  byRole?: string;
  at: string;
}

interface Props {
  entries: Entry[];
}

/** Simple chronological "who did what" log for a single case. The newest
 *  entry sits on top; each row collapses an action into one line so a
 *  reader can scan the whole life of a case quickly. */
export default function CaseAuditLog({ entries }: Props) {
  const t = useT();
  if (!entries.length) {
    return <p className="text-sm text-(--muted) px-1">{t("No activity logged yet.")}</p>;
  }
  // Reverse-chronological so the most recent action is on top.
  const sorted = [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <ol className="space-y-2">
      {sorted.map((e, i) => {
        const author = typeof e.by === "object" && e.by !== null ? e.by : null;
        const role   = author?.role ?? e.byRole;
        const date   = new Date(e.at);
        const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        return (
          <li key={e._id ?? `${e.at}-${i}`}
            className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: actionColor(e.action) }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-(--text) leading-snug">{e.summary}</p>
              <p className="text-[11px] text-(--muted) mt-0.5">
                <span className="font-semibold">{author?.name ?? t("Unknown")}</span>
                {role && <span> · {role}</span>}
                <span> · {dateStr} {timeStr}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Colored dot per action category — quick visual scan of which kind of
 *  change happened. */
function actionColor(action: string): string {
  if (action.startsWith("stage_advance"))   return "var(--success, #16a34a)";
  if (action.startsWith("stage_revert"))    return "var(--warning, #f59e0b)";
  if (action === "doc_uploaded")            return "var(--info, #3b82f6)";
  if (action === "appearance_logged")       return "var(--accent, #6366f1)";
  if (action === "diary_added")             return "var(--accent, #6366f1)";
  if (action === "status_changed")          return "var(--warning, #f59e0b)";
  if (action === "hearing_updated")         return "var(--info, #3b82f6)";
  return "var(--muted, #9ca3af)";
}
