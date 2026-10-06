import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound, str, BadRequest } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";

type Ctx = { params: Promise<{ id: string }> };

/** POST — pin a note or beneficiary quote to a KPI (optionally to a period).
 *  Keep these free of names: the note box says so in the UI too. */
export async function POST(req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/kpis/[id]/notes", async (session) => {
    const kpi = await InsightKpi.findById(oid((await ctx.params).id));
    if (!kpi) return notFound();
    const body = await readJson(req);
    const text = str(body.text, 1000);
    if (!text) throw new BadRequest("Note text is required");
    const period = typeof body.period === "string" && body.period ? new Date(body.period) : undefined;
    kpi.notes.push({ text, period: period && !isNaN(period.getTime()) ? period : undefined, by: oid(session.id), byName: session.name, at: new Date() });
    await kpi.save();
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}

/** DELETE ?noteId= — remove a note. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/kpis/[id]/notes", async () => {
    const kpi = await InsightKpi.findById(oid((await ctx.params).id));
    if (!kpi) return notFound();
    const noteId = req.nextUrl.searchParams.get("noteId") ?? "";
    const before = kpi.notes.length;
    kpi.notes = kpi.notes.filter((n) => String(n._id) !== noteId);
    if (kpi.notes.length === before) return notFound();
    await kpi.save();
    return NextResponse.json({ ok: true });
  });
}
