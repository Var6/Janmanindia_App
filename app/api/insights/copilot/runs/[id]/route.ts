import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid } from "@/lib/insights/api";
import { continueCopilot, copilotStatus } from "@/lib/insights/copilot";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** POST { approve: [queryId, …] } — run the approved queries (the rest are
 *  skipped) and continue. Only the person who asked can decide. */
export async function POST(req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/copilot/runs/[id]", async (session) => {
    const status = await copilotStatus();
    if (!status.ok) return NextResponse.json({ error: status.reason }, { status: 503 });
    const id = String(oid((await ctx.params).id));
    const body = await readJson<{ approve?: unknown }>(req);
    const approve = Array.isArray(body.approve) ? body.approve.map(String).slice(0, 20) : [];
    const step = await continueCopilot(id, approve, { id: session.id, name: session.name });
    if (!step) return NextResponse.json({ error: "This question is no longer waiting for approval. Ask it again." }, { status: 409 });
    return NextResponse.json(step);
  });
}
