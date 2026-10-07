"use client";

import Link from "next/link";
import { useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";

type Data = {
  dashboards: { _id: string; title: string; description?: string; isOrgDefault: boolean; updatedAt: string }[];
  reports: { _id: string; title: string; dashboardTitle: string; periodStart: string; periodEnd: string; createdAt: string; createdBy?: { name?: string } }[];
  isAdmin: boolean;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** The dashboards and reports shared with this person. */
export default function SharedInsightsPage() {
  const { data, error, loading } = useApi<Data>("/api/insights/shared");
  return (
    <div className="space-y-5">
      <PageHeader icon="📊" title="Insights" subtitle="Dashboards and reports the directors have shared with you">
        {data?.isAdmin && <Link href="/director/insights" className="btn-secondary">Open Impact &amp; Insights</Link>}
      </PageHeader>
      {loading && <p className="text-sm text-(--muted)">Loading…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      {data && data.dashboards.length === 0 && data.reports.length === 0 && (
        <div className="py-12 text-center rounded-2xl border border-dashed border-(--border)">
          <p className="text-sm text-(--muted)">Nothing has been shared with you yet. When a director shares a dashboard or a report, it appears here.</p>
        </div>
      )}
      {data && data.dashboards.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--text)">Dashboards</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data.dashboards.map((d) => (
              <Link key={d._id} href={`/insights/dashboards/${d._id}`} className="rounded-2xl border border-(--border) p-4 hover:border-(--accent)" style={{ background: "var(--surface)" }}>
                <p className="font-semibold text-(--text)">{d.title}</p>
                {d.description && <p className="text-sm text-(--muted) mt-0.5">{d.description}</p>}
                <p className="text-xs text-(--muted) mt-2">{d.isOrgDefault ? "Janman's Impact page · " : ""}updated {day(d.updatedAt)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {data && data.reports.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--text)">Reports</h2>
          <div className="rounded-2xl border border-(--border) overflow-hidden" style={{ background: "var(--surface)" }}>
            {data.reports.map((r) => (
              <Link key={r._id} href={`/insights/reports/${r._id}`} className="flex flex-wrap items-baseline gap-x-3 px-4 py-3 border-b border-(--border) last:border-0 hover:bg-(--bg)">
                <span className="font-medium text-(--text)">{r.title}</span>
                <span className="text-xs text-(--muted)">{day(r.periodStart)} to {day(r.periodEnd)} · {r.createdBy?.name ?? ""}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
