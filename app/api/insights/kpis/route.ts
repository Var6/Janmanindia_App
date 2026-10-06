import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, BadRequest } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import { computeTiles } from "@/lib/insights/tiles";
import { assertRunnable, cleanFilters, cleanMeasure } from "@/lib/insights/validate";
import { cleanKpiInput } from "@/lib/insights/kpi-input";

/** GET /api/insights/kpis — all KPIs with their current value and status. */
export async function GET() {
  return insightsRoute("GET /api/insights/kpis", async () => {
    const kpis = await InsightKpi.find({}).sort({ kpiType: 1, name: 1 }).select("_id").lean();
    const data = await computeTiles(kpis.map((k) => ({ id: String(k._id), kind: "kpi", refId: String(k._id) })));
    return NextResponse.json({ kpis: kpis.map((k) => data[String(k._id)]) });
  });
}

/**
 * POST /api/insights/kpis — create a KPI. Either `metricId` (an existing
 * metric) or `metric: { name, dataset, measure, filters }` (a new one) is
 * required, plus the KPI fields.
 */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/kpis", async (session) => {
    const body = await readJson(req);
    let metricId: string;
    let dataset: string;
    if (typeof body.metricId === "string") {
      const m = await InsightMetric.findById(oid(body.metricId)).lean();
      if (!m) throw new BadRequest("Metric not found");
      metricId = String(m._id);
      dataset = m.dataset;
    } else if (body.metric && typeof body.metric === "object") {
      const mb = body.metric as Record<string, unknown>;
      const spec = { dataset: String(mb.dataset ?? ""), measure: cleanMeasure(mb.measure), filters: cleanFilters(mb.filters) };
      await assertRunnable(spec);
      const m = await InsightMetric.create({
        name: str(mb.name, 120) ?? str(body.name, 120) ?? "Untitled metric",
        description: str(mb.description, 500),
        ...spec,
        createdBy: session.id,
      });
      metricId = String(m._id);
      dataset = spec.dataset;
    } else {
      throw new BadRequest("Choose a metric");
    }
    const fields = await cleanKpiInput(body, dataset, false);
    const kpi = await InsightKpi.create({ ...fields, metric: metricId, createdBy: session.id });
    return NextResponse.json({ kpi }, { status: 201 });
  });
}
