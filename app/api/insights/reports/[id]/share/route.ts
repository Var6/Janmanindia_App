import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound } from "@/lib/insights/api";
import { cleanSharing } from "@/lib/insights/access";
import InsightReport from "@/models/InsightReport";
import Notification from "@/models/Notification";

type Ctx = { params: Promise<{ id: string }> };

/** PUT { visibleTo, sharedWith } — who else can open the report. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PUT /api/insights/reports/[id]/share", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r) return notFound();
    const { visibleTo, sharedWith } = await cleanSharing(await readJson(req));
    const before = new Set((r.sharedWith ?? []).map(String));
    r.visibleTo = visibleTo;
    r.sharedWith = sharedWith;
    await r.save();
    const added = sharedWith.filter((u) => !before.has(String(u)) && String(u) !== session.id);
    if (added.length) {
      await Notification.insertMany(added.map((u) => ({
        recipient: u, type: "insights_shared", title: `${session.name} shared a report with you`,
        body: r.title, link: `/insights/reports/${r._id}`, meta: { reportId: String(r._id) },
      })));
    }
    return NextResponse.json({ ok: true });
  });
}
