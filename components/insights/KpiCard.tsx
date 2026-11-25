"use client";

import type { KpiTileData } from "@/lib/insights/tiles";
import { formatNumber, periodLabel } from "@/lib/insights/format";
import { RAG_STYLE } from "@/components/insights/charts/palette";
import type { NumberFormat } from "@/lib/insights/types";

const TYPE_LABEL: Record<string, string> = { input: "Input", output: "Output", outcome: "Outcome", impact: "Impact" };

/** A KPI tile: latest value, target, status, change and a sparkline. */
export default function KpiCard({ data, onOpen, compact = false }: { data: KpiTileData; onOpen?: () => void; compact?: boolean }) {
  const { kpi, result } = data;
  const fmt = (n: number | null) => formatNumber(n, kpi.numberFormat as NumberFormat, kpi.decimals, kpi.prefix ?? "", kpi.suffix ?? "");
  const rag = RAG_STYLE[result.rag] ?? RAG_STYLE.no_data;
  const change = result.changePct;
  const good = change === null ? null : kpi.direction === "higher" ? change >= 0 : change <= 0;
  const below =
    result.achievementPct !== null && result.rag !== "on_track" && result.achievementPct < 100
      ? Math.round((100 - result.achievementPct) * 10) / 10
      : null;

  const body = (
    <div className="h-full flex flex-col gap-2 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-(--text) truncate" title={kpi.name}>{kpi.name}</p>
          <p className="text-[11px] text-(--muted)">
            {TYPE_LABEL[kpi.kpiType] ?? kpi.kpiType}
            {kpi.programTags.length ? ` · ${kpi.programTags.join(", ")}` : ""}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: rag.bg, color: rag.text }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: rag.dot }} />
          {rag.label}{below !== null ? ` · ${below}% below` : ""}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums text-(--text)">{fmt(result.latest)}</p>
        <p className="text-xs text-(--muted)">
          Target: {fmt(kpi.target)} {kpi.direction === "lower" ? "(lower is better)" : ""}
          {kpi.targetConfirmed === false && <span className="ml-1" style={{ color: "var(--warning-text)" }}>· placeholder, not yet set</span>}
        </p>
        {change !== null && (
          <p className="text-xs font-medium mt-0.5" style={{ color: good ? "var(--success-text)" : "var(--error-text)" }}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change)}% on the previous {kpi.grain}
          </p>
        )}
      </div>
      {!compact && <Sparkline points={result.series.map((p) => p.value)} target={kpi.target} />}
      <p className="text-[11px] text-(--muted) mt-auto">
        {result.latestPeriod
          ? kpi.cumulative ? `Running total to date` : `For ${periodLabel(result.latestPeriod, kpi.grain)}`
          : "No data yet"}
        {result.currentPartial !== null && !kpi.cumulative ? ` · ${fmt(result.currentPartial)} so far this ${kpi.grain}` : ""}
      </p>
    </div>
  );

  return onOpen ? (
    <button type="button" onClick={onOpen} className="w-full h-full cursor-pointer">{body}</button>
  ) : body;
}

export function Sparkline({ points, target, height = 44 }: { points: number[]; target?: number; height?: number }) {
  if (points.length < 2) return <div style={{ height }} />;
  const w = 240;
  const max = Math.max(...points, target ?? 0, 1);
  const x = (i: number) => (w * i) / (points.length - 1);
  const y = (v: number) => height - 4 - ((height - 8) * v) / max;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      {target !== undefined && target > 0 && (
        <line x1="0" x2={w} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" />
      )}
      <polyline points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--accent-3)" strokeWidth="2" />
    </svg>
  );
}
