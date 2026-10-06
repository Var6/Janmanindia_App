import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound } from "@/lib/insights/api";
import InsightImport from "@/models/InsightImport";
import InsightImportRow from "@/models/InsightImportRow";
import InsightChart from "@/models/InsightChart";
import InsightMetric from "@/models/InsightMetric";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE — remove an imported dataset and its rows, unless a chart or
 *  metric still uses it. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/imports/[id]", async () => {
    const id = String(oid((await ctx.params).id));
    const key = `import:${id}`;
    const [charts, metrics] = await Promise.all([
      InsightChart.find({ "query.dataset": key }).select("title").lean(),
      InsightMetric.find({ dataset: key }).select("name").lean(),
    ]);
    if (charts.length || metrics.length) {
      const names = [...charts.map((c) => c.title), ...metrics.map((m) => m.name)].join(", ");
      return NextResponse.json({ error: `Still used by ${names}. Delete those first.` }, { status: 409 });
    }
    const res = await InsightImport.deleteOne({ _id: id });
    if (!res.deletedCount) return notFound();
    await InsightImportRow.deleteMany({ importId: id });
    return NextResponse.json({ ok: true });
  });
}
