import { runQuery } from "@/lib/insights/query";
import type { Direction, FilterSpec, Grain, MeasureSpec, Rag } from "@/lib/insights/types";

/**
 * KPI maths: a per-period series of a metric, its latest value, the change
 * from the previous period, and red / amber / green against the target.
 */

export type KpiDefinition = {
  target: number;
  direction: Direction;
  onTrackPct: number;
  attentionPct: number;
  timeField: string;
  grain: Grain;
  cumulative: boolean;
};

export type MetricDefinition = {
  dataset: string;
  measure: MeasureSpec;
  filters: FilterSpec[];
};

export type KpiPoint = { period: string; value: number };

export type KpiResult = {
  series: KpiPoint[];
  /** Value of the last COMPLETE period (or the running total for cumulative KPIs). */
  latest: number | null;
  latestPeriod: string | null;
  /** Value so far in the current, unfinished period (non-cumulative KPIs). */
  currentPartial: number | null;
  previous: number | null;
  changePct: number | null;
  /** Latest value as a % of target, adjusted for direction. */
  achievementPct: number | null;
  rag: Rag;
};

const IST = 5.5 * 3600 * 1000;

/** Start of the period containing `d`, as the UTC instant of IST midnight. */
export function periodStart(d: Date, grain: Grain): Date {
  const t = new Date(d.getTime() + IST);
  let y = t.getUTCFullYear(), m = t.getUTCMonth(), day = t.getUTCDate();
  switch (grain) {
    case "year": m = 0; day = 1; break;
    case "quarter": m = Math.floor(m / 3) * 3; day = 1; break;
    case "month": day = 1; break;
    case "week": {
      const dow = (t.getUTCDay() + 6) % 7; // Monday = 0
      const monday = new Date(Date.UTC(y, m, day - dow));
      y = monday.getUTCFullYear(); m = monday.getUTCMonth(); day = monday.getUTCDate();
      break;
    }
    default: break;
  }
  return new Date(Date.UTC(y, m, day) - IST);
}

export function addPeriods(d: Date, grain: Grain, n: number): Date {
  const t = new Date(d.getTime() + IST);
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), day = t.getUTCDate();
  let out: number;
  switch (grain) {
    case "year": out = Date.UTC(y + n, m, day); break;
    case "quarter": out = Date.UTC(y, m + 3 * n, day); break;
    case "month": out = Date.UTC(y, m + n, day); break;
    case "week": out = Date.UTC(y, m, day + 7 * n); break;
    default: out = Date.UTC(y, m, day + n);
  }
  return new Date(out - IST);
}

export function ragFor(value: number | null, k: Pick<KpiDefinition, "target" | "direction" | "onTrackPct" | "attentionPct">): { rag: Rag; pct: number | null } {
  if (value === null || !Number.isFinite(value)) return { rag: "no_data", pct: null };
  let pct: number;
  if (k.direction === "higher") {
    pct = k.target === 0 ? 100 : (value / k.target) * 100;
  } else {
    // Lower is better: at or under target = 100%+; double the target = 50%.
    pct = value <= 0 ? 100 : k.target === 0 ? 0 : (k.target / value) * 100;
  }
  pct = Math.round(pct * 10) / 10;
  const rag: Rag = pct >= k.onTrackPct ? "on_track" : pct >= k.attentionPct ? "attention" : "off_track";
  return { rag, pct };
}

export async function computeKpi(
  kpi: KpiDefinition,
  metric: MetricDefinition,
  opts: { periods?: number; asOf?: Date; extraFilters?: FilterSpec[]; rangeFrom?: Date } = {},
): Promise<KpiResult> {
  const periods = Math.min(Math.max(opts.periods ?? 12, 2), 60);
  const asOf = opts.asOf ?? new Date();
  const currentStart = periodStart(asOf, kpi.grain);
  const windowStart = addPeriods(currentStart, kpi.grain, -periods);

  const res = await runQuery(
    {
      dataset: metric.dataset,
      measure: metric.measure,
      filters: metric.filters,
      time: { field: kpi.timeField, grain: kpi.grain },
      range: {
        field: kpi.timeField,
        preset: "custom",
        // Cumulative KPIs need everything before the window to start the running total.
        from: kpi.cumulative ? (opts.rangeFrom ? opts.rangeFrom.toISOString() : undefined) : windowStart.toISOString(),
        to: asOf.toISOString(),
      },
    },
    { extraFilters: opts.extraFilters, now: asOf },
  );

  const byPeriod = new Map<number, number>();
  for (const r of res.rows) if (r.period) byPeriod.set(new Date(r.period).getTime(), r.value);

  let running = 0;
  if (kpi.cumulative) {
    for (const [t, v] of byPeriod) if (t < windowStart.getTime()) running += v;
  }

  const series: KpiPoint[] = [];
  for (let p = windowStart; p.getTime() <= currentStart.getTime(); p = addPeriods(p, kpi.grain, 1)) {
    const v = byPeriod.get(p.getTime()) ?? 0;
    running += v;
    series.push({ period: p.toISOString(), value: kpi.cumulative ? running : v });
  }

  // Non-cumulative: judge the last COMPLETE period, so a KPI is not shown off
  // track on the 3rd of the month just because the month has barely started.
  const complete = kpi.cumulative ? series : series.slice(0, -1);
  const last = complete.at(-1) ?? null;
  const prev = complete.at(-2) ?? null;
  const hasAnyData = res.rows.length > 0 || kpi.cumulative;
  const latest = last && hasAnyData ? last.value : null;
  const previous = prev ? prev.value : null;
  const changePct =
    latest !== null && previous !== null && previous !== 0
      ? Math.round(((latest - previous) / Math.abs(previous)) * 1000) / 10
      : null;
  const { rag, pct } = ragFor(latest, kpi);

  return {
    series: kpi.cumulative ? series : series.slice(0, -1),
    latest,
    latestPeriod: last ? last.period : null,
    currentPartial: kpi.cumulative ? null : (series.at(-1)?.value ?? null),
    previous,
    changePct,
    achievementPct: pct,
    rag,
  };
}
