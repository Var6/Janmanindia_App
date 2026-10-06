import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, oid, notFound, BadRequest } from "@/lib/insights/api";
import InsightReport from "@/models/InsightReport";

type Ctx = { params: Promise<{ id: string }> };

/** POST { text, tileId? } — comment on the report or on one tile in it. */
export async function POST(req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/reports/[id]/comments", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r) return notFound();
    const body = await readJson(req);
    const text = str(body.text, 2000);
    if (!text) throw new BadRequest("Comment text is required");
    r.comments.push({ text, tileId: str(body.tileId, 60), by: oid(session.id), byName: session.name, at: new Date() });
    await r.save();
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}

/** DELETE ?commentId= — the author (or a superadmin) removes a comment. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/reports/[id]/comments", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r) return notFound();
    const id = req.nextUrl.searchParams.get("commentId") ?? "";
    const c = r.comments.find((x) => String(x._id) === id);
    if (!c) return notFound();
    if (String(c.by) !== session.id && session.role !== "superadmin") {
      return NextResponse.json({ error: "Only the person who wrote it can delete this comment" }, { status: 403 });
    }
    r.comments = r.comments.filter((x) => String(x._id) !== id);
    await r.save();
    return NextResponse.json({ ok: true });
  });
}
