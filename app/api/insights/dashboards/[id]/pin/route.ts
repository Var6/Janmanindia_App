import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";

type Ctx = { params: Promise<{ id: string }> };

/** POST — pin as MY Impact page (replaces any earlier pin). DELETE — unpin. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/dashboards/[id]/pin", async (session) => {
    const id = oid((await ctx.params).id);
    const me = oid(session.id);
    if (!(await InsightDashboard.exists({ _id: id }))) return notFound();
    await InsightDashboard.updateMany({ pinnedBy: me }, { $pull: { pinnedBy: me } });
    await InsightDashboard.updateOne({ _id: id }, { $addToSet: { pinnedBy: me } });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/dashboards/[id]/pin", async (session) => {
    await InsightDashboard.updateOne({ _id: oid((await ctx.params).id) }, { $pull: { pinnedBy: oid(session.id) } });
    return NextResponse.json({ ok: true });
  });
}
