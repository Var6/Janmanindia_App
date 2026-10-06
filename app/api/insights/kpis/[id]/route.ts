import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound, num } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import InsightAlert from "@/models/InsightAlert";
import { computeKpi } from "@/lib/insights/kpi";
import { kpiPublic } from "@/lib/insights/tiles";
import { cleanKpiInput } from "@/lib/insights/kpi-input";
import { cleanFilters } from "@/lib/insights/validate";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/insights/kpis/[id]?periods=24&asOf=2026-09-30 — KPI, its metric
 *  and a longer series for the detail drawer. */
export async function GET(req: NextRequest, ctx: Ctx) {
  return insightsRoute("GET /api/insights/kpis/[id]", async () => {
    const k = await InsightKpi.findById(oid((await ctx.params).id)).lean();
    if (!k) return notFound();
    const m = await InsightMetric.findById(k.metric).lean();
    if (!m) return NextResponse.json({ error: "This KPI's metric was deleted" }, { status: 409 });
    const sp = req.nextUrl.searchParams;
    const asOfRaw = sp.get("asOf");
    const asOf = asOfRaw ? new Date(asOfRaw) : undefined;
    const result = await computeKpi(
      { target: k.target, direction: k.direction, onTrackPct: k.onTrackPct, attentionPct: k.attentionPct, timeField: k.timeField, grain: k.grain, cumulative: k.cumulative },
      { dataset: m.dataset, measure: m.measure, filters: m.filters ?? [] },
      { periods: num(sp.get("periods")) ?? 12, asOf: asOf && !isNaN(asOf.getTime()) ? asOf : undefined },
    );
    return NextResponse.json({
      kpi: { ...kpiPublic(k), timeField: k.timeField, onTrackPct: k.onTrackPct, attentionPct: k.attentionPct, metricId: String(m._id), createdAt: k.createdAt },
      metric: { id: String(m._id), name: m.name, dataset: m.dataset, measure: m.measure, filters: m.filters },
      result,
    });
  });
}

/** PATCH — KPI fields, and optionally `metricFilters` to change the metric's
 *  filters in place. The metric's dataset and time column stay fixed, so the
 *  trend line keeps meaning the same thing. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/kpis/[id]", async () => {
    const kpi = await InsightKpi.findById(oid((await ctx.params).id));
    if (!kpi) return notFound();
    const metric = await InsightMetric.findById(kpi.metric);
    if (!metric) return NextResponse.json({ error: "This KPI's metric was deleted" }, { status: 409 });
    const body = await readJson(req);
    delete body.timeField; // fixed after creation
    const fields = await cleanKpiInput(body, metric.dataset, true);
    kpi.set(fields);
    await kpi.save();
    if (body.metricFilters !== undefined) {
      metric.filters = cleanFilters(body.metricFilters);
      metric.markModified("filters");
      await metric.save();
    }
    return NextResponse.json({ kpi });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/kpis/[id]", async () => {
    const id = oid((await ctx.params).id);
    const alerts = await InsightAlert.find({ kpi: id }).select("name").lean();
    if (alerts.length) {
      return NextResponse.json({ error: `Used by the alert(s) ${alerts.map((a) => a.name).join(", ")}. Delete those first.` }, { status: 409 });
    }
    const res = await InsightKpi.deleteOne({ _id: id });
    return res.deletedCount ? NextResponse.json({ ok: true }) : notFound();
  });
}
