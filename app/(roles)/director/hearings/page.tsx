"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface Hearing {
  id: string;
  caseTitle: string;
  caseNumber: string;
  courtCaseNumber: string;
  nextHearingDate: string;
  courtName: string;
  district: string;
  status: string;
  lawyer: string;
}

/** Director's case-monitoring view: every upcoming hearing across all cases in
 *  the next 60 days, so the team can take follow-ups and watch deadlines. */
export default function DirectorHearingsPage() {
  const t = useT();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cal, setCal] = useState<{ ok: boolean; configured: boolean; detail: string } | null>(null);

  useEffect(() => {
    fetch("/api/cases/hearings")
      .then((r) => r.json())
      .then((d) => setHearings(d.hearings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/calendar/health")
      .then((r) => r.json())
      .then((d) => setCal(d))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return hearings;
    return hearings.filter((h) =>
      `${h.caseTitle} ${h.caseNumber} ${h.courtCaseNumber} ${h.lawyer} ${h.district} ${h.courtName}`.toLowerCase().includes(n)
    );
  }, [hearings, q]);

  // Group by day so the director scans by date.
  const groups = useMemo(() => {
    const m = new Map<string, Hearing[]>();
    for (const h of filtered) {
      const key = h.nextHearingDate ? new Date(h.nextHearingDate).toISOString().slice(0, 10) : "—";
      (m.get(key) ?? m.set(key, []).get(key)!).push(h);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const now = useMemo(() => Date.now(), []);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Upcoming Hearings")}</h1>
        <p className="text-sm text-(--muted) mt-1">{t("Every court date in the next 60 days, across all cases — for follow-up and monitoring.")}</p>
      </div>

      {/* Google Calendar sync status — so the team knows hearings are flowing. */}
      {cal && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl border text-xs"
          style={cal.ok
            ? { background: "var(--success-bg)", borderColor: "color-mix(in srgb,var(--success) 30%,transparent)", color: "var(--success-text)" }
            : { background: "var(--warning-bg)", borderColor: "color-mix(in srgb,var(--warning) 30%,transparent)", color: "var(--warning-text)" }}>
          <span>{cal.ok ? "✅" : "⚠️"}</span>
          <span>
            {cal.ok
              ? t("Google Calendar sync is active — hearing dates are pushed to the shared calendar.")
              : !cal.configured
                ? t("Google Calendar is not configured. Set the service-account credentials in the environment to sync hearings.")
                : `${t("Google Calendar sync error")}: ${cal.detail}`}
          </span>
        </div>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search cases…")}
        className="w-full sm:max-w-md px-3 py-2 rounded-lg border text-sm focus:outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

      {loading ? (
        <div className="space-y-3"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm text-(--muted)">{t("No upcoming hearings in the next 60 days.")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-(--muted)">{filtered.length} {t("hearings")}</p>
          {groups.map(([day, items]) => {
            const days = day !== "—" ? Math.ceil((new Date(day).getTime() - now) / 86400000) : null;
            const soon = days !== null && days <= 3;
            return (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-bold text-(--text)">{day !== "—" ? fmt(day) : "—"}</h2>
                  {days !== null && (
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                      style={soon ? { background: "var(--error-bg)", color: "var(--error-text)" } : { background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      {days <= 0 ? t("today") : `${days}d`}
                    </span>
                  )}
                  <span className="text-[12px] text-(--muted)">· {items.length}</span>
                </div>
                <div className="rounded-2xl border overflow-hidden divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  {items.map((h) => (
                    <Link key={h.id} href={`/director/cases/${h.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-(--bg) transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-(--text) truncate">{h.caseTitle}</p>
                        <p className="text-[12px] text-(--muted) flex flex-wrap gap-x-2 mt-0.5">
                          <span className="font-mono">{h.courtCaseNumber || h.caseNumber}</span>
                          {h.district && <span>· 📍 {h.district}</span>}
                          {h.courtName && <span>· {h.courtName}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-(--text)">{h.lawyer || <span className="text-(--muted) italic">{t("Unassigned")}</span>}</p>
                        <p className="text-[12px] text-(--muted)">{h.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
