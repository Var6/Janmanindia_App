"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/insights/client";
import type { TileData, KpiTileData } from "@/lib/insights/tiles";
import KpiCard from "@/components/insights/KpiCard";
import KpiDrawer from "@/components/insights/KpiDrawer";
import KpiForm from "@/components/insights/KpiForm";
import { inputCls } from "@/components/insights/QueryBuilder";
import PageHeader from "@/components/ui/PageHeader";

const TYPES = ["input", "output", "outcome", "impact"];
const STATUSES = [
  { key: "on_track", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "off_track", label: "Off track" },
  { key: "no_data", label: "No data" },
];

export default function KpisPage() {
  const { data, error, loading, reload } = useApi<{ kpis: TileData[] }>("/api/insights/kpis");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");

  const kpis = useMemo(() => (data?.kpis ?? []).filter((k): k is KpiTileData => k?.kind === "kpi"), [data]);
  const tags = [...new Set(kpis.flatMap((k) => k.kpi.programTags))].sort();
  const shown = kpis.filter((k) =>
    (!q || k.kpi.name.toLowerCase().includes(q.toLowerCase())) &&
    (!type || k.kpi.kpiType === type) &&
    (!tag || k.kpi.programTags.includes(tag)) &&
    (!status || k.result.rag === status),
  );
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, kpis.filter((k) => k.result.rag === s.key).length]));

  return (
    <div className="space-y-5">
      <PageHeader icon="🎯" title="Key Performance Indicators" subtitle="Targets for the programme, tracked against live data every month">
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New KPI</button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search KPIs…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-40`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select className={`${inputCls} w-44`} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All programmes</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={`${inputCls} w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label} ({counts[s.key] ?? 0})</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-(--muted)">Loading KPIs…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      {!loading && kpis.length === 0 && (
        <div className="py-12 text-center rounded-2xl border border-dashed border-(--border)">
          <p className="text-sm text-(--muted)">No KPIs yet. Create one, or build the starter set from the Impact tab.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((k) => (
          <div key={k.kpi.id} className="rounded-2xl border border-(--border) p-4 card-lift" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
            <KpiCard data={k} onOpen={() => setOpen(k.kpi.id)} />
          </div>
        ))}
      </div>

      {creating && <KpiForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
      {open && <KpiDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
