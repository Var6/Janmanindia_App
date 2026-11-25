import { NextRequest, NextResponse } from "next/server";
import { viewerRoute, oid, notFound } from "@/lib/insights/api";
import { canSee, isAdmin } from "@/lib/insights/access";
import InsightReport from "@/models/InsightReport";

type Ctx = { params: Promise<{ id: string }> };

/** GET — a report this person can open (directors: any report). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  return viewerRoute("GET /api/insights/shared/reports/[id]", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id)).populate("createdBy", "name").lean();
    if (!r || !canSee(r, session)) return notFound();
    const admin = isAdmin(session);
    return NextResponse.json({
      report: { ...r, visibleTo: admin ? r.visibleTo : undefined, sharedWith: admin ? r.sharedWith : undefined },
      isAdmin: admin,
      me: session.id,
    });
  });
}
