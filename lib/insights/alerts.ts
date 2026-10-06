import InsightAlert, { type IInsightAlert } from "@/models/InsightAlert";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import Notification from "@/models/Notification";
import { computeKpi } from "@/lib/insights/kpi";
import { runQuery } from "@/lib/insights/query";
import { runQualityCheck } from "@/lib/insights/quality";
import { formatNumber } from "@/lib/insights/format";
import type { RangePreset } from "@/lib/insights/types";

/**
 * Alert evaluation and the daily run. A fired alert sends an in-app
 * notification (the bell in the top bar) to each recipient, linking to the
 * KPI, the data-health list or the alerts page.
 */

const RAG_LABEL: Record<string, string> = { on_track: "on track", attention: "needs attention", off_track: "off track", no_data: "has no data" };
const CMP: Record<string, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b,
};
const CMP_WORD: Record<string, string> = { gt: "above", gte: "at or above", lt: "below", lte: "at or below" };

export type Evaluation = { fired: boolean; message: string; link: string };

export async function evaluateAlert(alert: Pick<IInsightAlert, "kind" | "kpi" | "ragStates" | "metric" | "rangePreset" | "comparator" | "threshold" | "qualityCheck" | "name">): Promise<Evaluation> {
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
  const alert = await InsightAlert.findById(alertId);
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
    await Notification.insertMany(alert.recipients.map((r) => ({
      recipient: r,
      type: "insights_alert",
      title: alert.name,
      body: ev.message,
      link: ev.link,
      meta: { alertId: String(alert._id) },
    })));
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
