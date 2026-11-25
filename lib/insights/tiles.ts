import mongoose from "mongoose";
import InsightChart from "@/models/InsightChart";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import { runQuery } from "@/lib/insights/query";
import { computeKpi, type KpiResult } from "@/lib/insights/kpi";
import type { FilterSpec, QueryResult, RangeSpec } from "@/lib/insights/types";
import { isOwnFileUrl } from "@/lib/storage";

/**
 * Computes the data behind dashboard tiles in one go. Used live by the
 * dashboard view and once, at creation, by reports (which freeze the result).
 */

export type TileRequest = { id: string; kind: "chart" | "kpi" | "text" | "image"; refId?: string; text?: string; imageUrl?: string; caption?: string };

export type ChartTileData = {
  kind: "chart";
  chart: { id: string; title: string; description?: string; chartType: string; display: Record<string, unknown>; grain?: string };
  result: QueryResult;
};

export type KpiTileData = {
  kind: "kpi";
  kpi: {
    id: string; name: string; description?: string; target: number; targetConfirmed: boolean; direction: string;
    kpiType: string; programTags: string[]; grain: string; cumulative: boolean;
    numberFormat: string; decimals: number; prefix?: string; suffix?: string;
    notes: { period?: string; text: string; byName: string; at: string }[];
  };
  result: KpiResult;
};

export type TileData = ChartTileData | KpiTileData | { kind: "text"; text: string } | { kind: "image"; url: string; caption?: string } | { kind: "error"; error: string };

export async function computeTiles(
  tiles: TileRequest[],
  opts: { filters?: FilterSpec[]; range?: RangeSpec; asOf?: Date } = {},
): Promise<Record<string, TileData>> {
  const chartIds = tiles.filter((t) => t.kind === "chart" && t.refId && mongoose.Types.ObjectId.isValid(t.refId)).map((t) => t.refId!);
  const kpiIds = tiles.filter((t) => t.kind === "kpi" && t.refId && mongoose.Types.ObjectId.isValid(t.refId)).map((t) => t.refId!);

  const [charts, kpis] = await Promise.all([
    chartIds.length ? InsightChart.find({ _id: { $in: chartIds } }).lean() : [],
    kpiIds.length ? InsightKpi.find({ _id: { $in: kpiIds } }).lean() : [],
  ]);
  const metricIds = kpis.map((k) => k.metric);
  const metrics = metricIds.length ? await InsightMetric.find({ _id: { $in: metricIds } }).lean() : [];

  const chartById = new Map(charts.map((c) => [String(c._id), c]));
  const kpiById = new Map(kpis.map((k) => [String(k._id), k]));
  const metricById = new Map(metrics.map((m) => [String(m._id), m]));

  const out: Record<string, TileData> = {};
  await Promise.all(
    tiles.map(async (t) => {
      try {
        if (t.kind === "text") {
          out[t.id] = { kind: "text", text: t.text ?? "" };
          return;
        }
        if (t.kind === "image") {
          out[t.id] = isOwnFileUrl(t.imageUrl) ? { kind: "image", url: t.imageUrl!, caption: t.caption } : { kind: "error", error: "This image is not available." };
          return;
        }
        if (t.kind === "chart") {
          const c = t.refId ? chartById.get(t.refId) : undefined;
          if (!c) { out[t.id] = { kind: "error", error: "Chart not found (it may have been deleted)." }; return; }
          // A dashboard / report period replaces the chart's own period.
          const range = opts.range ? { ...opts.range, field: c.query.range?.field ?? c.query.time?.field } : c.query.range;
          const result = await runQuery({ ...c.query, range }, { extraFilters: opts.filters, now: opts.asOf });
          out[t.id] = {
            kind: "chart",
            chart: {
              id: String(c._id), title: c.title, description: c.description, chartType: c.chartType,
              display: (c.display ?? {}) as Record<string, unknown>, grain: c.query.time?.grain,
            },
            result,
          };
          return;
        }
        const k = t.refId ? kpiById.get(t.refId) : undefined;
        const m = k ? metricById.get(String(k.metric)) : undefined;
        if (!k || !m) { out[t.id] = { kind: "error", error: "KPI not found (it may have been deleted)." }; return; }
        const result = await computeKpi(
          { target: k.target, direction: k.direction, onTrackPct: k.onTrackPct, attentionPct: k.attentionPct, timeField: k.timeField, grain: k.grain, cumulative: k.cumulative },
          { dataset: m.dataset, measure: m.measure, filters: m.filters ?? [] },
          { asOf: opts.asOf, extraFilters: opts.filters },
        );
        out[t.id] = { kind: "kpi", kpi: kpiPublic(k), result };
      } catch (e) {
        out[t.id] = { kind: "error", error: e instanceof Error ? e.message : "Could not load this tile." };
      }
    }),
  );
  return out;
}

type KpiDoc = {
  _id: unknown; name: string; description?: string; target: number; targetConfirmed?: boolean; direction: string; kpiType: string;
  programTags?: string[]; grain: string; cumulative?: boolean; numberFormat?: string; decimals?: number;
  prefix?: string; suffix?: string; notes?: { period?: Date; text: string; byName?: string; at?: Date }[];
};

export function kpiPublic(k: KpiDoc): KpiTileData["kpi"] {
  return {
    id: String(k._id), name: k.name, description: k.description, target: k.target, targetConfirmed: k.targetConfirmed !== false, direction: k.direction,
    kpiType: k.kpiType, programTags: k.programTags ?? [], grain: k.grain, cumulative: !!k.cumulative,
    numberFormat: k.numberFormat ?? "indian", decimals: k.decimals ?? 0, prefix: k.prefix, suffix: k.suffix,
    notes: (k.notes ?? []).map((n) => ({
      period: n.period ? new Date(n.period).toISOString() : undefined,
      text: n.text, byName: n.byName ?? "", at: n.at ? new Date(n.at).toISOString() : "",
    })),
  };
}
