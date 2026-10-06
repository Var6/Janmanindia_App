import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson } from "@/lib/insights/api";
import InsightChart from "@/models/InsightChart";
import { cleanChartInput } from "@/lib/insights/chart-input";
import { getStaticDataset } from "@/lib/insights/datasets";

export async function GET() {
  return insightsRoute("GET /api/insights/charts", async () => {
    const charts = await InsightChart.find({}).sort({ updatedAt: -1 }).populate("createdBy", "name").lean();
    return NextResponse.json({
      charts: charts.map((c) => ({ ...c, datasetLabel: getStaticDataset(c.query?.dataset)?.label ?? "Imported data" })),
    });
  });
}

export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/charts", async (session) => {
    const fields = await cleanChartInput(await readJson(req), false);
    const chart = await InsightChart.create({ ...fields, createdBy: session.id });
    return NextResponse.json({ chart }, { status: 201 });
  });
}
