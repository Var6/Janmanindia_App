import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, oid, notFound } from "@/lib/insights/api";
import InsightAlert from "@/models/InsightAlert";
import { cleanAlertInput } from "@/lib/insights/alert-input";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — { enabled } alone toggles; otherwise the full alert is replaced. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return insightsRoute("PATCH /api/insights/alerts/[id]", async () => {
    const alert = await InsightAlert.findById(oid((await ctx.params).id));
    if (!alert) return notFound();
    const body = await readJson(req);
    if (Object.keys(body).length === 1 && typeof body.enabled === "boolean") {
      alert.enabled = body.enabled;
    } else {
      const fields = await cleanAlertInput(body);
      // slackWebhookUrl is only in `fields` when it is being set or cleared.
      alert.set({ kpi: undefined, metric: undefined, ragStates: undefined, threshold: undefined, comparator: undefined, rangePreset: undefined, qualityCheck: undefined, ...fields });
    }
    await alert.save();
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("DELETE /api/insights/alerts/[id]", async () => {
    const res = await InsightAlert.deleteOne({ _id: oid((await ctx.params).id) });
    return res.deletedCount ? NextResponse.json({ ok: true }) : notFound();
  });
}
