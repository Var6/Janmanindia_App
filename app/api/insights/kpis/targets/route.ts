import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { insightsRoute, readJson, BadRequest, num } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import { computeKpi } from "@/lib/insights/kpi";

/**
 * GET — every KPI with its target and what the last six complete periods
 * actually came to (average, lowest, highest), so real targets can be set
 * against real figures in one sitting.
 */
export async function GET() {
  return insightsRoute("GET /api/insights/kpis/targets", async () => {
    const kpis = await InsightKpi.find({}).sort({ kpiType: 1, name: 1 }).lean();
    const metrics = await InsightMetric.find({ _id: { $in: kpis.map((k) => k.metric) } }).lean();
    const byId = new Map(metrics.map((m) => [String(m._id), m]));
    const rows = await Promise.all(kpis.map(async (k) => {
      const base = {
        id: String(k._id), name: k.name, grain: k.grain, cumulative: k.cumulative, direction: k.direction, target: k.target,
        targetConfirmed: k.targetConfirmed !== false, numberFormat: k.numberFormat, decimals: k.decimals, prefix: k.prefix, suffix: k.suffix,
      };
      const m = byId.get(String(k.metric));
      if (!m) return { ...base, average: null, low: null, high: null, latest: null, periods: 0 };
      try {
        const r = await computeKpi(
          { target: k.target, direction: k.direction, onTrackPct: k.onTrackPct, attentionPct: k.attentionPct, timeField: k.timeField, grain: k.grain, cumulative: k.cumulative },
          { dataset: m.dataset, measure: m.measure, filters: m.filters ?? [] },
          { periods: 6 },
        );
        const v = r.series.map((p) => p.value);
        return {
          ...base, latest: r.latest, periods: v.length,
          average: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null,
          low: v.length ? Math.min(...v) : null, high: v.length ? Math.max(...v) : null,
        };
      } catch {
        return { ...base, average: null, low: null, high: null, latest: null, periods: 0 };
      }
    }));
    return NextResponse.json({ kpis: rows });
  });
}

/** PUT { targets: [{ id, target }] } — set several targets at once. Each one
 *  saved here stops being a placeholder. */
export async function PUT(req: NextRequest) {
  return insightsRoute("PUT /api/insights/kpis/targets", async () => {
    const body = await readJson<{ targets?: unknown }>(req);
    if (!Array.isArray(body.targets) || !body.targets.length) throw new BadRequest("No targets to save");
    const ops = body.targets.slice(0, 200).map((t) => {
      const x = (t ?? {}) as Record<string, unknown>;
      const id = String(x.id ?? "");
      const target = num(x.target);
      if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Unknown KPI");
      if (target === undefined || target < 0) throw new BadRequest("Each target must be a number, zero or above");
      return { updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set: { target, targetConfirmed: true } } } };
    });
    const res = await InsightKpi.bulkWrite(ops);
    return NextResponse.json({ ok: true, saved: res.matchedCount });
  });
}
