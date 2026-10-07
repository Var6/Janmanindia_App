import { NextResponse } from "next/server";
import { viewerRoute } from "@/lib/insights/api";
import { isAdmin, visibleQuery } from "@/lib/insights/access";
import InsightDashboard from "@/models/InsightDashboard";
import InsightReport from "@/models/InsightReport";

/** GET — the dashboards and reports this person can open. */
export async function GET() {
  return viewerRoute("GET /api/insights/shared", async (session) => {
    const q = visibleQuery(session);
    const [dashboards, reports] = await Promise.all([
      InsightDashboard.find(q).select("title description isOrgDefault updatedAt").sort({ isOrgDefault: -1, updatedAt: -1 }).lean(),
      InsightReport.find(q).select("title dashboardTitle periodStart periodEnd createdAt").sort({ createdAt: -1 }).limit(100).populate("createdBy", "name").lean(),
    ]);
    return NextResponse.json({ dashboards, reports, isAdmin: isAdmin(session) });
  });
}
