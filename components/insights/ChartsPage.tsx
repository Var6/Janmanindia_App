"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";
import { inputCls } from "@/components/insights/QueryBuilder";

type Row = { _id: string; title: string; chartType: string; datasetLabel: string; createdBy?: { name?: string }; updatedAt: string };

export default function ChartsPage() {
  const { data, loading, error } = useApi<{ charts: Row[] }>("/api/insights/charts");
  const [q, setQ] = useState("");
  const rows = (data?.charts ?? []).filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <PageHeader icon="📈" title="Charts" subtitle="Saved charts you can place on dashboards and in reports">
        <Link href="/director/insights/charts/new" className="btn-primary">+ New chart</Link>
      </PageHeader>
      <input className={`${inputCls} max-w-sm`} placeholder="Search charts…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading && <p className="text-sm text-(--muted)">Loading…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="rounded-2xl border border-(--border) overflow-hidden" style={{ background: "var(--surface)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
              <th className="px-4 py-2.5 font-medium">Chart</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Data</th>
              <th className="px-4 py-2.5 font-medium">By</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c._id} className="border-b border-(--border) last:border-0 hover:bg-(--bg)">
                <td className="px-4 py-2.5"><Link href={`/director/insights/charts/${c._id}`} className="font-medium text-(--text) hover:text-(--accent)">{c.title}</Link></td>
                <td className="px-4 py-2.5 text-(--muted) capitalize">{c.chartType}</td>
                <td className="px-4 py-2.5 text-(--muted)">{c.datasetLabel}</td>
                <td className="px-4 py-2.5 text-(--muted)">{c.createdBy?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-(--muted)">{new Date(c.updatedAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-(--muted)">No charts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
