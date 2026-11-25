import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, BadRequest } from "@/lib/insights/api";
import InsightMetric from "@/models/InsightMetric";
import InsightKpi from "@/models/InsightKpi";
import InsightAlert from "@/models/InsightAlert";
import { assertRunnable, cleanFilters, cleanMeasure } from "@/lib/insights/validate";

/** GET /api/insights/metrics — all metrics with what uses them. */
export async function GET() {
  return insightsRoute("GET /api/insights/metrics", async () => {
    const [metrics, kpis, alerts] = await Promise.all([
      InsightMetric.find({}).sort({ name: 1 }).populate("createdBy", "name").lean(),
      InsightKpi.find({}).select("name metric").lean(),
      InsightAlert.find({ metric: { $exists: true } }).select("name metric").lean(),
    ]);
    return NextResponse.json({
      metrics: metrics.map((m) => ({
        ...m,
        usedBy: [
          ...kpis.filter((k) => String(k.metric) === String(m._id)).map((k) => ({ kind: "kpi", id: String(k._id), name: k.name })),
          ...alerts.filter((a) => String(a.metric) === String(m._id)).map((a) => ({ kind: "alert", id: String(a._id), name: a.name })),
        ],
      })),
    });
  });
}

/** POST /api/insights/metrics — { name, description?, dataset, measure, filters } */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/metrics", async (session) => {
    const body = await readJson(req);
    const name = str(body.name, 120);
    if (!name) throw new BadRequest("Name is required");
    const spec = { dataset: String(body.dataset ?? ""), measure: cleanMeasure(body.measure), filters: cleanFilters(body.filters) };
    await assertRunnable(spec);
    const metric = await InsightMetric.create({ name, description: str(body.description, 500), ...spec, createdBy: session.id });
    return NextResponse.json({ metric }, { status: 201 });
  });
}
