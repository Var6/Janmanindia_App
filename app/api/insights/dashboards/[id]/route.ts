import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, notFound } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";
import InsightReport from "@/models/InsightReport";
import { cleanDashboardFilters, cleanTabs } from "@/lib/insights/dashboard-input";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("GET /api/insights/dashboards/[id]", async (session) => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id)).lean();
    if (!d) return notFound();
    return NextResponse.json({
      dashboard: { ...d, _id: String(d._id), pinnedByMe: (d.pinnedBy ?? []).some((u) => String(u) === session.id), pinnedBy: undefined },
    });
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/dashboards/[id]", async () => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id));
    if (!d) return notFound();
    const body = await readJson(req);
    if (body.title !== undefined) d.title = str(body.title, 140) ?? d.title;
    if (body.description !== undefined) d.description = str(body.description, 500);
    if (body.tabs !== undefined) { d.tabs = cleanTabs(body.tabs); d.markModified("tabs"); }
    if (body.filters !== undefined) { d.filters = cleanDashboardFilters(body.filters); d.markModified("filters"); }
    await d.save();
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/dashboards/[id]", async () => {
    const id = oid((await ctx.params).id);
    const reports = await InsightReport.countDocuments({ dashboard: id });
    const res = await InsightDashboard.deleteOne({ _id: id });
    if (!res.deletedCount) return notFound();
    // Reports keep their frozen snapshot; they just lose the live link.
    return NextResponse.json({ ok: true, reportsKept: reports });
  });
}
