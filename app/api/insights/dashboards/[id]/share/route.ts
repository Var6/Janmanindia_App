import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound } from "@/lib/insights/api";
import { cleanSharing } from "@/lib/insights/access";
import InsightDashboard from "@/models/InsightDashboard";
import Notification from "@/models/Notification";

type Ctx = { params: Promise<{ id: string }> };

/** PUT { visibleTo: roles[], sharedWith: userIds[] } — who else can open the
 *  dashboard (read-only). People newly added by name get a notification. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PUT /api/insights/dashboards/[id]/share", async (session) => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id));
    if (!d) return notFound();
    const { visibleTo, sharedWith } = await cleanSharing(await readJson(req));
    const before = new Set((d.sharedWith ?? []).map(String));
    d.visibleTo = visibleTo;
    d.sharedWith = sharedWith;
    await d.save();
    const added = sharedWith.filter((u) => !before.has(String(u)) && String(u) !== session.id);
    if (added.length) {
      await Notification.insertMany(added.map((u) => ({
        recipient: u, type: "insights_shared", title: `${session.name} shared a dashboard with you`,
        body: d.title, link: `/insights/dashboards/${d._id}`, meta: { dashboardId: String(d._id) },
      })));
    }
    return NextResponse.json({ ok: true });
  });
}
