"use client";

/**
 * Banner that flags activities recently assigned to the viewer that they
 * haven't seen yet. Surfaces on every staff dashboard so a "Sinchana,
 * please file the rejoinder" hand-off doesn't get lost.
 *
 * Mechanics:
 *   1. Poll `/api/activities?assignee=me&status=planned` every 30 s.
 *   2. Track which activity IDs the viewer has already acknowledged in
 *      `localStorage` under a per-user key.
 *   3. Anything in the API response not in that set is "fresh"; show a
 *      banner listing the top few + a "Mark seen" button.
 *   4. While there are unseen activities, alternate the document.title
 *      between the page title and "🔔 N new task(s)" every 2 s. Restored
 *      cleanly on unmount + when the user dismisses.
 *
 * No service worker / SSE — this is the simple polling version. Real
 * push can layer on top later without changing the UI.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

type Activity = {
  _id: string;
  title: string;
  status: "planned" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  createdAt: string;
  createdBy?: { _id: string; name: string };
};

interface Props {
  /** Current session user id. Drives the localStorage key + the API call. */
  currentUserId: string;
  /** Optional override of the polling cadence (ms). Default 30 s. */
  pollMs?: number;
}

const SEEN_KEY = (uid: string) => `janman.activitySeen.${uid}`;

function loadSeen(uid: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY(uid));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveSeen(uid: string, seen: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    // Cap to 200 most-recent ids so the localStorage key doesn't grow
    // forever — a stale id falling out simply means the banner could
    // re-appear once on next assignment, which is acceptable.
    const arr = Array.from(seen).slice(-200);
    window.localStorage.setItem(SEEN_KEY(uid), JSON.stringify(arr));
  } catch {
    // ignore quota errors — not load-bearing
  }
}

export default function ActivityAssignmentBanner({ currentUserId, pollMs = 30_000 }: Props) {
  const t = useT();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [seen, setSeen]             = useState<Set<string>>(() => loadSeen(currentUserId));
  const baseTitleRef = useRef<string>("");
  const flashRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/activities?assignee=me&status=planned");
      if (!r.ok) return;
      const d = await r.json();
      setActivities(Array.isArray(d.activities) ? d.activities : []);
    } catch {
      /* swallow — polling will retry */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  /* Tab-title flash. Restore on unmount + when count reaches zero. */
  const fresh = activities.filter(a => !seen.has(a._id));
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!baseTitleRef.current) baseTitleRef.current = document.title;
    if (flashRef.current) { clearInterval(flashRef.current); flashRef.current = null; }
    if (fresh.length === 0) {
      document.title = baseTitleRef.current;
      return;
    }
    const flashTitle = `🔔 ${fresh.length} ${fresh.length === 1 ? t("new task") : t("new tasks")}`;
    let toggle = false;
    flashRef.current = setInterval(() => {
      document.title = toggle ? baseTitleRef.current : flashTitle;
      toggle = !toggle;
    }, 2000);
    return () => {
      if (flashRef.current) clearInterval(flashRef.current);
      document.title = baseTitleRef.current;
    };
  }, [fresh.length]);

  function dismissAll() {
    const next = new Set(seen);
    for (const a of fresh) next.add(a._id);
    setSeen(next);
    saveSeen(currentUserId, next);
  }

  function dismissOne(id: string) {
    const next = new Set(seen);
    next.add(id);
    setSeen(next);
    saveSeen(currentUserId, next);
  }

  if (fresh.length === 0) return null;

  // Limit the rendered list to a few — keeps the banner from dwarfing the
  // page when someone bulk-assigns ten things in a row.
  const display = fresh.slice(0, 4);
  const overflow = fresh.length - display.length;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{
        background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
        borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
        boxShadow: "var(--shadow-sm)",
      }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}>
        <span className="text-xs font-semibold flex items-center gap-1.5"
          style={{ color: "var(--accent)" }}>
          <span className="text-base">🔔</span>
          {fresh.length} {fresh.length === 1 ? t("new task assigned to you") : t("new tasks assigned to you")}
        </span>
        <button type="button" onClick={dismissAll}
          className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
          {t("Mark all seen")}
        </button>
      </div>
      <ul className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
        {display.map(a => (
          <li key={a._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <Link href="/activities"
              onClick={() => dismissOne(a._id)}
              className="min-w-0 flex-1 hover:underline">
              <p className="text-sm font-medium text-(--text) truncate">
                {a.title}
                {a.priority === "high" && (
                  <span className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("HIGH")}</span>
                )}
              </p>
              <p className="text-[12px] text-(--muted) mt-0.5">
                {a.createdBy?.name ? `${t("by")} ${a.createdBy.name}` : t("Unknown")}
                {a.dueDate && ` · ${t("due")} ${new Date(a.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
              </p>
            </Link>
            <button type="button" onClick={() => dismissOne(a._id)}
              className="text-[12px] text-(--muted) hover:text-(--text) shrink-0">×</button>
          </li>
        ))}
        {overflow > 0 && (
          <li className="px-4 py-2 text-[12px] text-(--muted) text-center">
            {t("and")} {overflow} {t("more — open the planner to see all.")}
          </li>
        )}
      </ul>
    </div>
  );
}
