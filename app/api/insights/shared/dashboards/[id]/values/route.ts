import { NextRequest, NextResponse } from "next/server";
import { viewerRoute, oid, notFound, BadRequest } from "@/lib/insights/api";
import { canSee } from "@/lib/insights/access";
import { fieldValues } from "@/lib/insights/query";
import InsightDashboard from "@/models/InsightDashboard";

type Ctx = { params: Promise<{ id: string }> };

/** GET ?field= — pick-list values for one of the dashboard's own filters. */
export async function GET(req: NextRequest, ctx: Ctx) {
  return viewerRoute("GET /api/insights/shared/dashboards/[id]/values", async (session) => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id)).select("filters visibleTo sharedWith").lean();
    if (!d || !canSee(d, session)) return notFound();
    const field = req.nextUrl.searchParams.get("field") ?? "";
    if (!(d.filters ?? []).some((f) => f.field === field && (f.type ?? "value") === "value")) throw new BadRequest("Not a filter on this dashboard");
    return NextResponse.json({ values: await fieldValues("cases", field) });
  });
}
