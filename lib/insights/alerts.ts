import InsightAlert, { type IInsightAlert } from "@/models/InsightAlert";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { appUrl, escapeHtml, mailHtml, sendMail } from "@/lib/mailer";
import { postToSlack } from "@/lib/slack";
import { computeKpi } from "@/lib/insights/kpi";
import { runQuery, IMPORT_PREFIX } from "@/lib/insights/query";
import { describeQuery } from "@/lib/insights/describe";
import { ADMIN_ROLES } from "@/lib/insights/access";
import { runQualityCheck } from "@/lib/insights/quality";
import { formatNumber } from "@/lib/insights/format";
import type { QuerySpec, RangePreset } from "@/lib/insights/types";

/**
 * Alert evaluation and the daily run. A fired alert sends an in-app
 * notification (the bell in the top bar) to each recipient, linking to the
 * KPI, the data-health list or the alerts page; and, if set, an email to the
 * same people and a message to a Slack channel. Messages carry totals only.
 */

const RAG_LABEL: Record<string, string> = { on_track: "on track", attention: "needs attention", off_track: "off track", no_data: "has no data" };
const CMP: Record<string, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b,
};
const CMP_WORD: Record<string, string> = { gt: "above", gte: "at or above", lt: "below", lte: "at or below" };

export type Evaluation = { fired: boolean; message: string; link: string };

export async function evaluateAlert(alert: Pick<IInsightAlert, "kind" | "kpi" | "ragStates" | "metric" | "rangePreset" | "comparator" | "threshold" | "qualityCheck" | "query" | "queryMode" | "name">): Promise<Evaluation> {
  if (alert.kind === "kpi_rag") {
    const kpi = await InsightKpi.findById(alert.kpi).lean();
    if (!kpi) return { fired: false, message: "The KPI for this alert was deleted.", link: "/director/insights/alerts" };
    const metric = await InsightMetric.findById(kpi.metric).lean();
    if (!metric) return { fired: false, message: "The KPI's metric was deleted.", link: "/director/insights/alerts" };
    const r = await computeKpi(
      { target: kpi.target, direction: kpi.direction, onTrackPct: kpi.onTrackPct, attentionPct: kpi.attentionPct, timeField: kpi.timeField, grain: kpi.grain, cumulative: kpi.cumulative },
      { dataset: metric.dataset, measure: metric.measure, filters: metric.filters ?? [] },
    );
    const fired = (alert.ragStates ?? ["off_track"]).includes(r.rag);
    const value = formatNumber(r.latest, kpi.numberFormat, kpi.decimals, kpi.prefix ?? "", kpi.suffix ?? "");
    return {
      fired,
      message: `${kpi.name} ${RAG_LABEL[r.rag]}: ${value} against a target of ${formatNumber(kpi.target, kpi.numberFormat, kpi.decimals)}.`,
      link: "/director/insights/kpis",
    };
  }

  if (alert.kind === "metric_threshold") {
    const metric = await InsightMetric.findById(alert.metric).lean();
    if (!metric) return { fired: false, message: "The metric for this alert was deleted.", link: "/director/insights/alerts" };
    const res = await runQuery({
      dataset: metric.dataset, measure: metric.measure, filters: metric.filters ?? [],
      range: alert.rangePreset && alert.rangePreset !== "all" ? { preset: alert.rangePreset as RangePreset } : undefined,
    });
    const value = res.rows.reduce((s, r) => s + r.value, 0);
    const cmp = alert.comparator ?? "gt";
    const threshold = alert.threshold ?? 0;
    const fired = CMP[cmp](value, threshold);
    return {
      fired,
      message: `${metric.name} is ${formatNumber(value)} (${fired ? "" : "not "}${CMP_WORD[cmp]} ${formatNumber(threshold)}).`,
      link: "/director/insights/data",
    };
  }

  if (alert.kind === "query_threshold") {
    const spec = alert.query as QuerySpec | undefined;
    if (!spec?.dataset) return { fired: false, message: "This alert has no query.", link: "/director/insights/alerts" };
    const res = await runQuery({ ...spec, limit: 200 });
    const cmp = alert.comparator ?? "gt";
    const threshold = alert.threshold ?? 0;
    const what = await describeQuery(spec);
    if (alert.queryMode === "any_group" && (spec.groupBy?.length ?? 0) > 0) {
      const hits = res.rows.filter((r) => CMP[cmp](r.value, threshold)).sort((a, b) => (cmp.startsWith("g") ? b.value - a.value : a.value - b.value));
      // Group labels from the app's own data are places, statuses and staff.
      // Labels from an imported table are not vetted, so only the count goes out.
      const named = !spec.dataset.startsWith(IMPORT_PREFIX);
      const list = named ? `: ${hits.slice(0, 5).map((r) => `${r.keys[0] ?? "—"} (${formatNumber(r.value)})`).join(", ")}${hits.length > 5 ? ` and ${hits.length - 5} more` : ""}` : "";
      return {
        fired: hits.length > 0,
        message: hits.length
          ? `${what}: ${hits.length} of ${res.rows.length} group${res.rows.length === 1 ? "" : "s"} ${hits.length === 1 ? "is" : "are"} ${CMP_WORD[cmp]} ${formatNumber(threshold)}${list}.`
          : `${what}: no group is ${CMP_WORD[cmp]} ${formatNumber(threshold)}.`,
        link: "/director/insights/alerts",
      };
    }
    const value = res.rows.reduce((s, r) => s + r.value, 0);
    const fired = CMP[cmp](value, threshold);
    return { fired, message: `${what}: ${formatNumber(value)} (${fired ? "" : "not "}${CMP_WORD[cmp]} ${formatNumber(threshold)}).`, link: "/director/insights/alerts" };
  }

  const q = await runQualityCheck(alert.qualityCheck ?? "");
  return {
    fired: q.count > 0,
    message: q.count > 0 ? `${q.label}: ${q.count}.` : `${q.label}: none.`,
    link: `/director/insights/data?check=${q.key}`,
  };
}

/** Is the alert due today (IST)? Weekly uses dayOf = 1 (Mon) … 7 (Sun);
 *  monthly uses dayOf = day of the month (31 means the last day). */
export function isDue(alert: Pick<IInsightAlert, "frequency" | "dayOf" | "lastRunAt">, now = new Date()): boolean {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const todayKey = ist.toISOString().slice(0, 10);
  if (alert.lastRunAt) {
    const lastKey = new Date(new Date(alert.lastRunAt).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    if (lastKey === todayKey) return false;
  }
  if (alert.frequency === "daily") return true;
  if (alert.frequency === "weekly") {
    const dow = ((ist.getUTCDay() + 6) % 7) + 1;
    return dow === (alert.dayOf ?? 1);
  }
  const lastDay = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 0)).getUTCDate();
  return ist.getUTCDate() === Math.min(alert.dayOf ?? 1, lastDay);
}

/** Evaluate one alert, record the result, notify if it fired. */
export async function runAlert(alertId: string, opts: { notify?: boolean } = {}): Promise<Evaluation> {
  const alert = await InsightAlert.findById(alertId).select("+slackWebhookUrl");
  if (!alert) throw new Error("Alert not found");
  const ev = await evaluateAlert(alert);
  alert.lastRunAt = new Date();
  if (ev.fired) {
    alert.lastFiredAt = new Date();
    alert.fireStreak = (alert.fireStreak ?? 0) + 1;
  } else {
    alert.fireStreak = 0;
  }
  alert.log = [...alert.log, { at: new Date(), fired: ev.fired, message: ev.message }].slice(-30);
  await alert.save();

  if (ev.fired && opts.notify !== false && alert.recipients.length) {
    // The KPI, data-health and alerts pages are for directors. Other staff
    // get the same message with a link to the Insights shared with them.
    const people = await User.find({ _id: { $in: alert.recipients }, isActive: true }).select("email role").lean();
    const linkFor = (role?: string) => (role && ADMIN_ROLES.includes(role) ? ev.link : "/insights");
    const roleOf = new Map(people.map((p) => [String(p._id), p.role as string]));
    await Notification.insertMany(alert.recipients.map((r) => ({
      recipient: r,
      type: "insights_alert",
      title: alert.name,
      body: ev.message,
      link: linkFor(roleOf.get(String(r))),
      meta: { alertId: String(alert._id) },
    })));
    if (alert.emailRecipients) {
      for (const admin of [true, false]) {
        const group = people.filter((p) => ADMIN_ROLES.includes(p.role as string) === admin);
        const link = appUrl(admin ? ev.link : "/insights");
        await sendMail({
          to: group.map((p) => p.email).filter((e): e is string => !!e),
          subject: `Janman alert: ${alert.name}`,
          text: `${ev.message}\n\nOpen in the Janman app: ${link}`,
          html: mailHtml(alert.name, `<p style="font-size:15px;line-height:1.5">${escapeHtml(ev.message)}</p>`, { href: link, label: "Open in the app" }),
        });
      }
    }
  }
  if (ev.fired && opts.notify !== false && alert.slackWebhookUrl) {
    await postToSlack(alert.slackWebhookUrl, `*${alert.name}*\n${ev.message}\n<${appUrl(ev.link)}|Open in the Janman app>`);
  }
  return ev;
}

/** Called by the daily cron: run every enabled alert that is due today. */
export async function runDueAlerts(now = new Date()): Promise<{ ran: number; fired: number }> {
  const alerts = await InsightAlert.find({ enabled: true }).select("frequency dayOf lastRunAt").lean();
  let ran = 0, fired = 0;
  for (const a of alerts) {
    if (!isDue(a, now)) continue;
    try {
      const ev = await runAlert(String(a._id));
      ran++;
      if (ev.fired) fired++;
    } catch (e) {
      console.error("insights alert failed", String(a._id), e);
    }
  }
  return { ran, fired };
}
