import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson } from "@/lib/insights/api";
import InsightAlert from "@/models/InsightAlert";
import { cleanAlertInput } from "@/lib/insights/alert-input";

export async function GET() {
  return insightsRoute("GET /api/insights/alerts", async () => {
    const alerts = await InsightAlert.find({})
      .sort({ createdAt: -1 })
      .populate("kpi", "name").populate("metric", "name").populate("recipients", "name").populate("createdBy", "name")
      .lean();
    return NextResponse.json({ alerts });
  });
}

export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/alerts", async (session) => {
    const fields = await cleanAlertInput(await readJson(req));
    const alert = await InsightAlert.create({ ...fields, createdBy: session.id });
    return NextResponse.json({ alert }, { status: 201 });
  });
}
