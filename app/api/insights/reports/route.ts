import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, BadRequest, notFound } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";
import InsightReport from "@/models/InsightReport";
import { computeTiles } from "@/lib/insights/tiles";

export async function GET() {
  return insightsRoute("GET /api/insights/reports", async () => {
    const reports = await InsightReport.find({}).select("-snapshot -comments").sort({ createdAt: -1 }).populate("createdBy", "name").lean();
    return NextResponse.json({ reports });
  });
}

/**
 * POST — freeze a dashboard for a period: { title, dashboardId, periodStart,
 * periodEnd, summary? }. Charts are computed over the period on their own
 * date field; KPIs are judged as at the period end. The result is stored, so
 * the report does not change when cases are edited later.
 */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/reports", async (session) => {
    const body = await readJson(req);
    const title = str(body.title, 160);
    if (!title) throw new BadRequest("Title is required");
    const start = new Date(String(body.periodStart ?? ""));
    const endDay = String(body.periodEnd ?? "");
    const end = new Date(endDay);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequest("Choose the report period");
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDay)) end.setUTCHours(18, 29, 59, 999); // end of that day in IST
    if (end < start) throw new BadRequest("The period ends before it starts");

    const dashboard = await InsightDashboard.findById(oid(String(body.dashboardId ?? ""))).lean();
    if (!dashboard) return notFound();

    const range = { preset: "custom" as const, from: start.toISOString(), to: end.toISOString() };
    const tabs = [];
    for (const tab of dashboard.tabs ?? []) {
      const data = await computeTiles(tab.tiles ?? [], { range, asOf: end });
      tabs.push({ id: tab.id, title: tab.title, tiles: (tab.tiles ?? []).map((t) => ({ ...t, data: data[t.id] })) });
    }

    const report = await InsightReport.create({
      title,
      dashboard: dashboard._id,
      dashboardTitle: dashboard.title,
      periodStart: start,
      periodEnd: end,
      summary: str(body.summary, 5000),
      snapshot: { tabs, generatedAt: new Date().toISOString() },
      createdBy: session.id,
    });
    return NextResponse.json({ report: { _id: String(report._id) } }, { status: 201 });
  });
}
