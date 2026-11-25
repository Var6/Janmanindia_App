import { NextRequest, NextResponse } from "next/server";
import { viewerRoute, oid, notFound } from "@/lib/insights/api";
import { canSee, isAdmin } from "@/lib/insights/access";
import { filterDefs } from "@/lib/insights/shared";
import InsightDashboard from "@/models/InsightDashboard";

type Ctx = { params: Promise<{ id: string }> };

/** GET — a dashboard shared with this person, read-only. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  return viewerRoute("GET /api/insights/shared/dashboards/[id]", async (session) => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id)).lean();
    if (!d || !canSee(d, session)) return notFound();
    return NextResponse.json({
      dashboard: {
        _id: String(d._id), title: d.title, description: d.description, tabs: d.tabs, filters: d.filters,
        isOrgDefault: d.isOrgDefault, pinnedByMe: false,
      },
      filterDefs: filterDefs(d),
      isAdmin: isAdmin(session),
    });
  });
}
