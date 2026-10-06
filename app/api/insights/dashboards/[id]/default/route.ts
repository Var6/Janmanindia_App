import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";

type Ctx = { params: Promise<{ id: string }> };

/** POST — make this the organisation's default Impact page. DELETE — unset. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/dashboards/[id]/default", async () => {
    const id = oid((await ctx.params).id);
    if (!(await InsightDashboard.exists({ _id: id }))) return notFound();
    await InsightDashboard.updateMany({ _id: { $ne: id }, isOrgDefault: true }, { $set: { isOrgDefault: false } });
    await InsightDashboard.updateOne({ _id: id }, { $set: { isOrgDefault: true } });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/dashboards/[id]/default", async () => {
    await InsightDashboard.updateOne({ _id: oid((await ctx.params).id) }, { $set: { isOrgDefault: false } });
    return NextResponse.json({ ok: true });
  });
}
