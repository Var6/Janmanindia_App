import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid } from "@/lib/insights/api";
import { runAlert } from "@/lib/insights/alerts";

type Ctx = { params: Promise<{ id: string }> };

/** POST ?notify=0 — run an alert now (a test). Notifies recipients only
 *  when notify=1 and it fires. */
export async function POST(req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/alerts/[id]/run", async () => {
    const id = String(oid((await ctx.params).id));
    const notify = req.nextUrl.searchParams.get("notify") === "1";
    const ev = await runAlert(id, { notify });
    return NextResponse.json(ev);
  });
}
