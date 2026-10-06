import { NextResponse } from "next/server";
import { insightsRoute, oid } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";

/** GET /api/insights/landing — which dashboard the Impact page shows:
 *  the user's own pin, else the organisation default, else none. */
export async function GET() {
  return insightsRoute("GET /api/insights/landing", async (session) => {
    const mine = await InsightDashboard.findOne({ pinnedBy: oid(session.id) }).select("_id title").lean();
    if (mine) return NextResponse.json({ dashboardId: String(mine._id), title: mine.title, source: "personal" });
    const org = await InsightDashboard.findOne({ isOrgDefault: true }).select("_id title").lean();
    if (org) return NextResponse.json({ dashboardId: String(org._id), title: org.title, source: "org_default" });
    return NextResponse.json({ dashboardId: null, source: "none" });
  });
}
