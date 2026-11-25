import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound } from "@/lib/insights/api";
import InsightImport from "@/models/InsightImport";
import { syncImport } from "@/lib/insights/imports";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** POST — re-read a connected source now and replace the rows. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/imports/[id]/sync", async () => {
    const imp = await InsightImport.findById(oid((await ctx.params).id)).lean();
    if (!imp) return notFound();
    try {
      const r = await syncImport(imp);
      return NextResponse.json({ ok: true, ...r });
    } catch (e) {
      await InsightImport.updateOne({ _id: imp._id }, { $set: { lastSyncError: (e instanceof Error ? e.message : "Refresh failed").slice(0, 500) } });
      throw e;
    }
  });
}
