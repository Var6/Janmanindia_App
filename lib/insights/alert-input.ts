import mongoose from "mongoose";
import { BadRequest, num, str } from "@/lib/insights/api";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import User from "@/models/User";
import { QUALITY_CHECKS } from "@/lib/insights/quality";

const RAGS = ["on_track", "attention", "off_track", "no_data"];
const PRESETS = ["all", "last_30_days", "last_90_days", "last_6_months", "last_12_months", "this_month", "this_fy", "last_fy"];

export async function cleanAlertInput(body: Record<string, unknown>) {
  const name = str(body.name, 140);
  if (!name) throw new BadRequest("Name is required");
  const kind = body.kind;
  if (kind !== "kpi_rag" && kind !== "metric_threshold" && kind !== "data_quality") throw new BadRequest("Choose what the alert watches");
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
  return out;
}
