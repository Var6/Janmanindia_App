"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { KpiResult } from "@/lib/insights/kpi";
import type { FilterSpec, MeasureSpec, NumberFormat } from "@/lib/insights/types";
import { formatNumber, periodLabel } from "@/lib/insights/format";
import { RAG_STYLE } from "@/components/insights/charts/palette";
import KpiForm, { type KpiFormValue } from "@/components/insights/KpiForm";
import { inputCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type KpiDetail = {
  kpi: {
    id: string; name: string; description?: string; target: number; direction: "higher" | "lower"; kpiType: string;
    programTags: string[]; grain: string; cumulative: boolean; numberFormat: string; decimals: number; prefix?: string; suffix?: string;
    timeField: string; onTrackPct: number; attentionPct: number; metricId: string;
    notes: { period?: string; text: string; byName: string; at: string }[];
  };
  metric: { id: string; name: string; dataset: string; measure: MeasureSpec; filters: FilterSpec[] };
  result: KpiResult;
};

/** Side panel for one KPI: a longer trend with the target line, notes and
 *  beneficiary quotes, and edit / delete. */
export default function KpiDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const toast = useNotify();
  const [periods, setPeriods] = useState(12);
  const { data, error, reload } = useApi<KpiDetail>(`/api/insights/kpis/${id}?periods=${periods}`);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [notePeriod, setNotePeriod] = useState("");

  if (editing && data) {
    const k = data.kpi;
    const initial: KpiFormValue = {
      name: k.name, description: k.description, target: k.target, direction: k.direction, timeField: k.timeField,
      grain: k.grain as KpiFormValue["grain"], cumulative: k.cumulative, onTrackPct: k.onTrackPct, attentionPct: k.attentionPct,
      kpiType: k.kpiType as KpiFormValue["kpiType"], programTags: k.programTags, numberFormat: k.numberFormat as NumberFormat,
      decimals: k.decimals, prefix: k.prefix, suffix: k.suffix,
    };
    return (
      <KpiForm editId={id} initial={initial}
        initialMetric={{ _id: data.metric.id, name: data.metric.name, dataset: data.metric.dataset, measure: data.metric.measure, filters: data.metric.filters }}
        onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); onChanged?.(); }} />
    );
  }

  const fmt = (n: number | null) => data ? formatNumber(n, data.kpi.numberFormat as NumberFormat, data.kpi.decimals, data.kpi.prefix ?? "", data.kpi.suffix ?? "") : "";

  async function addNote() {
    if (!note.trim()) return;
    try {
      await api(`/api/insights/kpis/${id}/notes`, { body: { text: note, period: notePeriod || undefined } });
      setNote(""); setNotePeriod(""); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove() {
    if (!confirmDelete()) return;
    try {
      await api(`/api/insights/kpis/${id}`, { method: "DELETE" });
      toast.success("KPI deleted"); onChanged?.(); onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <aside className="w-full max-w-xl h-full overflow-y-auto p-6 border-l border-(--border)" style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()} aria-label="KPI detail">
        {error && <p className="text-sm text-(--error-text)">{error}</p>}
        {!data && !error && <p className="text-sm text-(--muted)">Loading…</p>}
        {data && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-(--text)">{data.kpi.name}</h2>
                <p className="text-xs text-(--muted) mt-0.5 capitalize">
                  {data.kpi.kpiType} · measured every {data.kpi.grain}{data.kpi.cumulative ? " (running total)" : ""} · metric: {data.metric.name}
                </p>
                {data.kpi.description && <p className="text-sm text-(--text) mt-2">{data.kpi.description}</p>}
              </div>
              <button className="text-2xl leading-none text-(--muted)" onClick={onClose} aria-label="Close">×</button>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="text-4xl font-bold tabular-nums text-(--text)">{fmt(data.result.latest)}</p>
                <p className="text-xs text-(--muted)">Target {fmt(data.kpi.target)} · {data.kpi.direction === "higher" ? "higher is better" : "lower is better"}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: RAG_STYLE[data.result.rag].bg, color: RAG_STYLE[data.result.rag].text }}>
                {RAG_STYLE[data.result.rag].label}{data.result.achievementPct !== null ? ` · ${data.result.achievementPct}% of target` : ""}
              </span>
              <select className={`${inputCls} w-auto ml-auto`} value={periods} onChange={(e) => setPeriods(Number(e.target.value))}>
                <option value={6}>Last 6</option>
                <option value={12}>Last 12</option>
                <option value={24}>Last 24</option>
              </select>
            </div>

            <TrendChart series={data.result.series} target={data.kpi.target} grain={data.kpi.grain} fmt={fmt}
              thresholds={{ on: data.kpi.onTrackPct, att: data.kpi.attentionPct, dir: data.kpi.direction }} />

            <section>
              <h3 className="text-sm font-semibold text-(--text) mb-2">Notes and beneficiary quotes</h3>
              <div className="space-y-2">
                {data.kpi.notes.length === 0 && <p className="text-xs text-(--muted)">No notes yet.</p>}
                {[...data.kpi.notes].reverse().map((n, i) => (
                  <div key={i} className="rounded-lg border border-(--border) p-3">
                    <p className="text-sm text-(--text) whitespace-pre-wrap">{n.text}</p>
                    <p className="text-[11px] text-(--muted) mt-1">
                      {n.period ? `${periodLabel(n.period, data.kpi.grain)} · ` : ""}{n.byName} · {new Date(n.at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Context for this number, or a quote from a client. Leave out names and other identifying details." />
                <div className="flex gap-2">
                  <select className={inputCls} value={notePeriod} onChange={(e) => setNotePeriod(e.target.value)}>
                    <option value="">Not tied to a period</option>
                    {data.result.series.map((p) => <option key={p.period} value={p.period}>{periodLabel(p.period, data.kpi.grain)}</option>)}
                  </select>
                  <button className="btn-primary" onClick={addNote} disabled={!note.trim()}>Add note</button>
                </div>
              </div>
            </section>

            <div className="flex gap-2 pt-2 border-t border-(--border)">
              <button className="btn-secondary" onClick={() => setEditing(true)}>Edit KPI</button>
              <button className="btn-secondary" style={{ color: "var(--error-text)" }} onClick={remove}>Delete</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function confirmDelete() {
  // A native confirm keeps this dependency-free; deleting a KPI is rare.
  return typeof window !== "undefined" && window.confirm("Delete this KPI? Dashboards that show it will lose the tile.");
}

function TrendChart({ series, target, grain, fmt, thresholds }: {
  series: { period: string; value: number }[]; target: number; grain: string; fmt: (n: number) => string;
  thresholds: { on: number; att: number; dir: string };
}) {
  if (series.length === 0) return <p className="text-sm text-(--muted)">No data yet.</p>;
  const w = 560, h = 220, pad = { l: 48, r: 10, t: 12, b: 30 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const max = Math.max(...series.map((s) => s.value), target, 1) * 1.1;
  const x = (i: number) => pad.l + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1));
  const y = (v: number) => pad.t + plotH - (plotH * v) / max;
  const onLine = thresholds.dir === "higher" ? (target * thresholds.on) / 100 : (target * 100) / Math.max(thresholds.on, 1);
  const every = Math.ceil(series.length / 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Trend against target">
      {thresholds.dir === "higher" && (
        <rect x={pad.l} y={y(max)} width={plotW} height={Math.max(0, y(onLine) - y(max))} fill="var(--success-bg)" opacity="0.6" />
      )}
      <line x1={pad.l} x2={w - pad.r} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeDasharray="5 4" />
      <text x={w - pad.r} y={y(target) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">Target {fmt(target)}</text>
      <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} stroke="var(--border)" />
      <text x={pad.l - 6} y={y(0) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">0</text>
      <polyline points={series.map((s, i) => `${x(i)},${y(s.value)}`).join(" ")} fill="none" stroke="var(--accent-3)" strokeWidth="2.2" />
      {series.map((s, i) => (
        <g key={s.period}>
          <circle cx={x(i)} cy={y(s.value)} r="3.2" fill="var(--accent-3)"><title>{`${periodLabel(s.period, grain)}: ${fmt(s.value)}`}</title></circle>
          {(i % every === 0 || i === series.length - 1) && (
            <text x={x(i)} y={h - 10} textAnchor="middle" fontSize="10" fill="var(--text)">{periodLabel(s.period, grain)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
