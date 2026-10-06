import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, notFound } from "@/lib/insights/api";
import InsightReport from "@/models/InsightReport";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("GET /api/insights/reports/[id]", async () => {
    const r = await InsightReport.findById(oid((await ctx.params).id)).populate("createdBy", "name").lean();
    return r ? NextResponse.json({ report: r }) : notFound();
  });
}

/** PATCH — title and executive summary only; the snapshot is never edited. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/reports/[id]", async () => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r) return notFound();
    const body = await readJson(req);
    if (body.title !== undefined) r.title = str(body.title, 160) ?? r.title;
    if (body.summary !== undefined) r.summary = typeof body.summary === "string" ? body.summary.slice(0, 5000) : r.summary;
    await r.save();
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/reports/[id]", async () => {
    const res = await InsightReport.deleteOne({ _id: oid((await ctx.params).id) });
    return res.deletedCount ? NextResponse.json({ ok: true }) : notFound();
  });
}
