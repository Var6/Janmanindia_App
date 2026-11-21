import mongoose from "mongoose";
import { BadRequest, num, str } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import User from "@/models/User";
import { QUALITY_CHECKS } from "@/lib/insights/quality";
import { assertRunnable, cleanQuery } from "@/lib/insights/validate";
import { isSlackWebhook } from "@/lib/slack";

const RAGS = ["on_track", "attention", "off_track", "no_data"];
const PRESETS = ["all", "last_30_days", "last_90_days", "last_6_months", "last_12_months", "this_month", "this_fy", "last_fy"];

export async function cleanAlertInput(body: Record<string, unknown>) {
  const name = str(body.name, 140);
  if (!name) throw new BadRequest("Name is required");
  const kind = body.kind;
  if (kind !== "kpi_rag" && kind !== "metric_threshold" && kind !== "data_quality" && kind !== "query_threshold") throw new BadRequest("Choose what the alert watches");
  const out: Record<string, unknown> = { name, kind, enabled: body.enabled !== false };

  if (kind === "kpi_rag") {
    const id = String(body.kpi ?? "");
    if (!mongoose.Types.ObjectId.isValid(id) || !(await InsightKpi.exists({ _id: id }))) throw new BadRequest("Choose a KPI");
    const states = Array.isArray(body.ragStates) ? body.ragStates.filter((s) => RAGS.includes(String(s))).map(String) : [];
    if (!states.length) throw new BadRequest("Choose at least one status to alert on");
    Object.assign(out, { kpi: id, ragStates: states });
  } else if (kind === "metric_threshold") {
    const id = String(body.metric ?? "");
    if (!mongoose.Types.ObjectId.isValid(id) || !(await InsightMetric.exists({ _id: id }))) throw new BadRequest("Choose a metric");
    const threshold = num(body.threshold);
    if (threshold === undefined) throw new BadRequest("Threshold must be a number");
    const comparator = ["gt", "gte", "lt", "lte"].includes(String(body.comparator)) ? body.comparator : "gt";
    const rangePreset = PRESETS.includes(String(body.rangePreset)) ? body.rangePreset : "all";
    Object.assign(out, { metric: id, threshold, comparator, rangePreset });
  } else if (kind === "query_threshold") {
    // The same checked query spec the chart builder uses. An alert watches one
    // number (or one number per group), so the time axis is dropped and at
    // most one grouping is kept.
    const q = cleanQuery(body.query);
    const query = { ...q, time: undefined, groupBy: (q.groupBy ?? []).slice(0, 1), limit: 200 };
    await assertRunnable(query);
    const threshold = num(body.threshold);
    if (threshold === undefined) throw new BadRequest("Threshold must be a number");
    const comparator = ["gt", "gte", "lt", "lte"].includes(String(body.comparator)) ? body.comparator : "gt";
    const queryMode = body.queryMode === "any_group" && query.groupBy.length ? "any_group" : "total";
    Object.assign(out, { query, threshold, comparator, queryMode });
  } else {
    const key = String(body.qualityCheck ?? "");
    if (!QUALITY_CHECKS.some((c) => c.key === key)) throw new BadRequest("Choose a data-health check");
    out.qualityCheck = key;
  }

  const frequency = ["daily", "weekly", "monthly"].includes(String(body.frequency)) ? body.frequency : "weekly";
  out.frequency = frequency;
  const dayOf = num(body.dayOf);
  out.dayOf = frequency === "daily" ? undefined : Math.min(frequency === "weekly" ? 7 : 31, Math.max(1, Math.round(dayOf ?? 1)));

  const recipients = Array.isArray(body.recipients) ? body.recipients.map(String).filter((r) => mongoose.Types.ObjectId.isValid(r)) : [];
  if (!recipients.length) throw new BadRequest("Choose at least one person to notify");
  const found = await User.countDocuments({ _id: { $in: recipients }, isActive: true });
  if (found !== recipients.length) throw new BadRequest("One of the recipients is not an active user");
  out.recipients = recipients.slice(0, 30);
  out.emailRecipients = body.emailRecipients === true;

  // Slack: a new URL replaces the stored one; removeSlack clears it; leaving
  // both out keeps whatever is stored (the URL is never sent to the browser).
  if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim()) {
    const url = body.slackWebhookUrl.trim();
    if (!isSlackWebhook(url)) throw new BadRequest("The Slack link must be an incoming webhook starting https://hooks.slack.com/services/");
    out.slackWebhookUrl = url;
  } else if (body.removeSlack === true) {
    out.slackWebhookUrl = undefined;
  }
  return out;
}
