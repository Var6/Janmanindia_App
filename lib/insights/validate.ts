import { BadRequest } from "@/lib/insights/api";
import { runQuery } from "@/lib/insights/query";
import {
  AGGS, CHART_TYPES, FILTER_OPS, GRAINS,
  type ChartType, type FilterSpec, type Grain, type FilterValue, type MeasureSpec, type QuerySpec, type RangePreset, type RangeSpec,
} from "@/lib/insights/types";

/**
 * Copies only the known properties of a spec from request JSON, with plain
 * types. Saved specs go through here and then through a trial run of the
 * query, so nothing malformed is stored.
 */

const PRESETS: RangePreset[] = ["all", "last_30_days", "last_90_days", "last_6_months", "last_12_months", "this_month", "this_fy", "last_fy", "custom"];

function scalar(v: unknown): FilterValue {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return typeof v === "string" ? v.slice(0, 200) : v;
  }
  throw new BadRequest("Filter values must be text, numbers or true/false");
}

export function cleanMeasure(raw: unknown): MeasureSpec {
  const m = (raw ?? {}) as Record<string, unknown>;
  const agg = (m.agg ?? "count") as MeasureSpec["agg"];
  if (!AGGS.includes(agg)) throw new BadRequest("Unknown aggregation");
  return agg === "count" ? { agg } : { agg, field: String(m.field ?? "") };
}

export function cleanFilters(raw: unknown): FilterSpec[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new BadRequest("filters must be a list");
  return raw.slice(0, 20).map((f) => {
    const x = (f ?? {}) as Record<string, unknown>;
    const op = x.op as FilterSpec["op"];
    if (!FILTER_OPS.includes(op)) throw new BadRequest("Unknown filter operator");
    const out: FilterSpec = { field: String(x.field ?? ""), op };
    if (x.value !== undefined) out.value = Array.isArray(x.value) ? x.value.slice(0, 200).map(scalar) : scalar(x.value);
    return out;
  });
}

export function cleanRange(raw: unknown): RangeSpec | undefined {
  if (raw == null) return undefined;
  const r = raw as Record<string, unknown>;
  const out: RangeSpec = {};
  if (typeof r.field === "string") out.field = r.field;
  if (typeof r.preset === "string") {
    if (!PRESETS.includes(r.preset as RangePreset)) throw new BadRequest("Unknown period");
    out.preset = r.preset as RangePreset;
  }
  if (typeof r.from === "string" && r.from) out.from = r.from.slice(0, 40);
  if (typeof r.to === "string" && r.to) out.to = r.to.slice(0, 40);
  return out;
}

export function cleanQuery(raw: unknown): QuerySpec {
  const q = (raw ?? {}) as Record<string, unknown>;
  const spec: QuerySpec = {
    dataset: String(q.dataset ?? ""),
    measure: cleanMeasure(q.measure),
    filters: cleanFilters(q.filters),
  };
  if (Array.isArray(q.groupBy)) spec.groupBy = q.groupBy.slice(0, 2).map(String).filter(Boolean);
  if (q.time && typeof q.time === "object") {
    const t = q.time as Record<string, unknown>;
    if (t.field) {
      if (!GRAINS.includes(t.grain as never)) throw new BadRequest("Unknown time grain");
      spec.time = { field: String(t.field), grain: t.grain as Grain };
    }
  }
  const range = cleanRange(q.range);
  if (range) spec.range = range;
  if (q.sort === "value_desc" || q.sort === "value_asc" || q.sort === "label") spec.sort = q.sort;
  if (q.limit !== undefined) spec.limit = Math.min(Math.max(1, Number(q.limit) || 50), 500);
  return spec;
}

export function cleanChartType(v: unknown): ChartType {
  if (!CHART_TYPES.includes(v as ChartType)) throw new BadRequest("Unknown chart type");
  return v as ChartType;
}

/** Runs the query once so a bad spec is rejected before it is saved. */
export async function assertRunnable(spec: QuerySpec): Promise<void> {
  await runQuery({ ...spec, limit: 1 });
}
