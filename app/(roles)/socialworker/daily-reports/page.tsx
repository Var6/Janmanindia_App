"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DailyReportForm from "@/components/reports/DailyReportForm";

type ReportLite = {
  _id: string;
  reportDate: string;
  status: "draft" | "submitted" | "reviewed";
  summary?: { totalCases?: number; urgentFlagged?: number };
  preparedBy?: { name?: string; employeeId?: string };
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  submitted: { bg: "var(--info-bg)",      text: "var(--info-text)" },
  reviewed:  { bg: "var(--success-bg)",   text: "var(--success-text)" },
};

export default function DailyReportsIndex() {
  const [reports, setReports] = useState<ReportLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayReport, setTodayReport] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showFormForDate, setShowFormForDate] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [allRes, todayRes] = await Promise.all([
        fetch("/api/daily-reports"),
        fetch(`/api/daily-reports?date=${new Date().toISOString().slice(0, 10)}`),
      ]);
      const all = await allRes.json();
      const today = await todayRes.json();
      setReports(all.reports ?? []);
      setTodayReport(today.reports?.[0] ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  if (showFormForDate) {
    const existing = reports.find(r => new Date(r.reportDate).toISOString().slice(0, 10) === showFormForDate);
    return (
      <div className="space-y-4">
        <button onClick={() => { setShowFormForDate(null); loadAll(); }}
          className="text-xs text-(--muted) hover:text-(--text)">← Back to all reports</button>
        <DailyReportForm
          canEdit
          initialReport={existing as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onSaved={() => loadAll()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Daily Reports</h1>
          <p className="text-sm text-(--muted) mt-1 max-w-3xl">
            One end-of-day report per working day — covers cases handled, scheme linkages, counselling, legal-aid follow-ups,
            urgent escalations and supervisor review. Auto-derived counters keep filling minimal.
          </p>
        </div>
        <button onClick={() => setShowFormForDate(new Date().toISOString().slice(0, 10))}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
          {todayReport ? "📝 Continue Today's Report" : "+ Today's Report"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-(--muted)">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">📒</p>
          <p className="text-sm text-(--muted)">No daily reports yet. Click + Today's Report to start.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const dateIso = new Date(r.reportDate).toISOString().slice(0, 10);
            const stat = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft;
            return (
              <button key={r._id} onClick={() => setShowFormForDate(dateIso)}
                className="w-full text-left rounded-xl border p-4 transition-colors hover:border-(--accent)"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--text)">
                      {new Date(r.reportDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {(r.summary?.totalCases ?? 0)} cases handled
                      {(r.summary?.urgentFlagged ?? 0) > 0 && ` · ${r.summary?.urgentFlagged} urgent`}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                    style={{ background: stat.bg, color: stat.text }}>{r.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-(--muted)">
        Supervisors (HR / Director) can review submitted reports from <Link className="underline hover:text-(--text)" href="/hr/daily-reports">HR &gt; Daily Reports</Link>.
      </p>
    </div>
  );
}
