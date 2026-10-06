import { NextResponse } from "next/server";
import { insightsRoute } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";
import { buildStarter, STARTER_TITLE } from "@/lib/insights/starter";

/** POST /api/insights/starter — build the starter KPIs, charts and dashboard.
 *  Becomes the organisation default if there is none yet. */
export async function POST() {
  return insightsRoute("POST /api/insights/starter", async (session) => {
    const existing = await InsightDashboard.findOne({ title: STARTER_TITLE }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ error: "The starter dashboard already exists. Open it from Dashboards." }, { status: 409 });
    }
    const hasDefault = await InsightDashboard.exists({ isOrgDefault: true });
    const created = await buildStarter(session.id, !hasDefault);
    return NextResponse.json({ created }, { status: 201 });
  });
}
