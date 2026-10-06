import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, notFound } from "@/lib/insights/api";
import InsightMetric from "@/models/InsightMetric";
import InsightKpi from "@/models/InsightKpi";
import InsightAlert from "@/models/InsightAlert";
import { assertRunnable, cleanFilters, cleanMeasure } from "@/lib/insights/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/metrics/[id]", async () => {
    const id = oid((await ctx.params).id);
    const metric = await InsightMetric.findById(id);
    if (!metric) return notFound();
    const body = await readJson(req);
    if (body.name !== undefined) metric.name = str(body.name, 120) ?? metric.name;
    if (body.description !== undefined) metric.description = str(body.description, 500);
    if (body.dataset !== undefined) metric.dataset = String(body.dataset);
    if (body.measure !== undefined) metric.measure = cleanMeasure(body.measure);
    if (body.filters !== undefined) metric.filters = cleanFilters(body.filters);
    await assertRunnable({ dataset: metric.dataset, measure: metric.measure, filters: metric.filters });
    metric.markModified("measure");
    metric.markModified("filters");
    await metric.save();
    return NextResponse.json({ metric });
  });
}

/** A metric in use by a KPI or an alert cannot be deleted. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/metrics/[id]", async () => {
    const id = oid((await ctx.params).id);
    const [kpis, alerts] = await Promise.all([
      InsightKpi.find({ metric: id }).select("name").lean(),
      InsightAlert.find({ metric: id }).select("name").lean(),
    ]);
    if (kpis.length || alerts.length) {
      const names = [...kpis, ...alerts].map((x) => x.name).join(", ");
      return NextResponse.json({ error: `In use by ${names}. Remove those first.` }, { status: 409 });
    }
    const res = await InsightMetric.deleteOne({ _id: id });
    return res.deletedCount ? NextResponse.json({ ok: true }) : notFound();
  });
}
