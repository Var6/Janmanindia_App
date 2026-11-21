import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound, BadRequest } from "@/lib/insights/api";
import InsightAlert from "@/models/InsightAlert";
import { postToSlack } from "@/lib/slack";

type Ctx = { params: Promise<{ id: string }> };

/** POST — post a short test message to this alert's Slack channel. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/alerts/[id]/slack-test", async (session) => {
    const alert = await InsightAlert.findById(oid((await ctx.params).id)).select("+slackWebhookUrl name").lean();
    if (!alert) return notFound();
    if (!alert.slackWebhookUrl) throw new BadRequest("This alert has no Slack channel set");
    const ok = await postToSlack(alert.slackWebhookUrl, `Test from Janman Insights: the alert "${alert.name}" will post here. Sent by ${session.name}.`);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Slack did not accept the message. Check the webhook link is still active." }, { status: 502 });
  });
}
