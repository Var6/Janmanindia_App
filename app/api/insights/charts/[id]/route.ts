import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound } from "@/lib/insights/api";
import InsightChart from "@/models/InsightChart";
import InsightDashboard from "@/models/InsightDashboard";
import { cleanChartInput } from "@/lib/insights/chart-input";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("GET /api/insights/charts/[id]", async () => {
    const chart = await InsightChart.findById(oid((await ctx.params).id)).lean();
    return chart ? NextResponse.json({ chart }) : notFound();
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/charts/[id]", async () => {
    const chart = await InsightChart.findById(oid((await ctx.params).id));
    if (!chart) return notFound();
    const fields = await cleanChartInput(await readJson(req), true);
    chart.set(fields);
    chart.markModified("query");
    chart.markModified("display");
    await chart.save();
    return NextResponse.json({ chart });
  });
}

/** Deleting a chart also removes its tiles from every dashboard. Reports keep
 *  their frozen copy. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/charts/[id]", async () => {
    const id = (await ctx.params).id;
    const res = await InsightChart.deleteOne({ _id: oid(id) });
    if (!res.deletedCount) return notFound();
    const dashboards = await InsightDashboard.find({ "tabs.tiles.refId": id });
    for (const d of dashboards) {
      d.tabs = d.tabs.map((t) => ({ ...t, tiles: t.tiles.filter((x) => !(x.kind === "chart" && x.refId === id)) }));
      d.markModified("tabs");
      await d.save();
    }
    return NextResponse.json({ ok: true });
  });
}
