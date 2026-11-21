"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import { formatNumber } from "@/lib/insights/format";
import type { NumberFormat } from "@/lib/insights/types";
import Modal from "@/components/insights/Modal";
import { useNotify } from "@/components/insights/useNotify";
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
  return (
    <Suspense fallback={<p className="text-sm text-(--muted)">Loading KPIs…</p>}>
      <KpisInner />
    </Suspense>
  );
}

function KpisInner() {
  const params = useSearchParams();
  const { data, error, loading, reload } = useApi<{ kpis: TileData[] }>("/api/insights/kpis");
  const [creating, setCreating] = useState(false);
  const [targets, setTargets] = useState(params.get("targets") === "1");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");

  const kpis = useMemo(() => (data?.kpis ?? []).filter((k): k is KpiTileData => k?.kind === "kpi"), [data]);
  const tags = [...new Set(kpis.flatMap((k) => k.kpi.programTags))].sort();
  const placeholders = kpis.filter((k) => k.kpi.targetConfirmed === false).length;
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
        <button className="btn-secondary" onClick={() => setTargets(true)} disabled={kpis.length === 0}>Set targets</button>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New KPI</button>
      </PageHeader>

      {placeholders > 0 && (
        <div className="rounded-2xl border p-4 text-sm flex flex-wrap items-center gap-3" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning-text)" }}>
          <span className="flex-1 min-w-60">
            {placeholders} KPI{placeholders === 1 ? " still has a placeholder target" : "s still have placeholder targets"} from the starter set. Set the real ones so that
            on track, needs attention and off track mean something.
          </span>
          <button className="btn-primary" onClick={() => setTargets(true)}>Set targets</button>
        </div>
      )}

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

      {targets && <TargetsDialog onClose={() => setTargets(false)} onSaved={() => { setTargets(false); reload(); }} />}
      {creating && <KpiForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
      {open && <KpiDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

type TargetRow = {
  id: string; name: string; grain: string; cumulative: boolean; direction: "higher" | "lower"; target: number; targetConfirmed: boolean;
  numberFormat: NumberFormat; decimals: number; prefix?: string; suffix?: string;
  average: number | null; low: number | null; high: number | null; latest: number | null; periods: number;
};

/** Set every KPI's target in one go, next to what the last six periods
 *  actually came to. Saving a row marks its target as chosen, not a placeholder. */
function TargetsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useNotify();
  const { data, error } = useApi<{ kpis: TargetRow[] }>("/api/insights/kpis/targets");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const rows = data?.kpis ?? [];
  const valueOf = (r: TargetRow) => values[r.id] ?? String(r.target);
  const touched = rows.filter((r) => values[r.id] !== undefined || !r.targetConfirmed);
  const invalid = touched.some((r) => valueOf(r).trim() === "" || !Number.isFinite(Number(valueOf(r))) || Number(valueOf(r)) < 0);

  async function save() {
    setSaving(true);
    try {
      const r = await api<{ saved: number }>("/api/insights/kpis/targets", { method: "PUT", body: { targets: touched.map((t) => ({ id: t.id, target: Number(valueOf(t)) })) } });
      toast.success(`${r.saved} target${r.saved === 1 ? "" : "s"} saved`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Set KPI targets" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-(--muted)">
          Each target is for one period (a month, a quarter and so on). The middle columns show what the last six complete periods actually
          came to, as a guide. Rows marked &ldquo;placeholder&rdquo; came with the starter set and nobody has confirmed them yet; saving confirms
          every row you have changed and every placeholder as it now reads.
        </p>
        {error && <p className="text-sm text-(--error-text)">{error}</p>}
        {!data && !error && <p className="text-sm text-(--muted)">Working out recent figures…</p>}
        {data && (
          <div className="overflow-auto rounded-lg border border-(--border)">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
                  <th className="px-3 py-2 font-medium">KPI</th>
                  <th className="px-3 py-2 font-medium">Counted per</th>
                  <th className="px-3 py-2 font-medium text-right">Recent average</th>
                  <th className="px-3 py-2 font-medium text-right">Lowest to highest</th>
                  <th className="px-3 py-2 font-medium w-40">Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = (n: number | null) => (n === null ? "—" : formatNumber(n, r.numberFormat, n % 1 === 0 ? 0 : 1, r.prefix ?? "", r.suffix ?? ""));
                  return (
                    <tr key={r.id} className="border-b border-(--border) last:border-0">
                      <td className="px-3 py-2">
                        <span className="text-(--text)">{r.name}</span>
                        {!r.targetConfirmed && <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>placeholder</span>}
                        {r.direction === "lower" && <span className="block text-[11px] text-(--muted)">lower is better</span>}
                      </td>
                      <td className="px-3 py-2 text-(--muted)">{r.grain}{r.cumulative ? " (running total)" : ""}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-(--text)">{r.periods ? f(r.average) : "No data yet"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-(--muted)">{r.periods ? `${f(r.low)} to ${f(r.high)}` : ""}</td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} className={inputCls} value={valueOf(r)} aria-label={`Target for ${r.name}`}
                          onChange={(e) => setValues({ ...values, [r.id]: e.target.value })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving || invalid || touched.length === 0} onClick={save}>
            {saving ? "Saving…" : `Save ${touched.length || ""} target${touched.length === 1 ? "" : "s"}`.replace("  ", " ")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
