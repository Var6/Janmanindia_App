import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A scheduled check that notifies people in the app when something needs
 * attention (bell, and optionally email and a Slack channel):
 *  - kpi_rag: a KPI's latest status is in one of the chosen bands;
 *  - metric_threshold: a metric's value over a period crosses a number;
 *  - data_quality: a data-quality check finds problems (e.g. stale hearings).
 */
export type AlertKind = "kpi_rag" | "metric_threshold" | "data_quality";
export type AlertFrequency = "daily" | "weekly" | "monthly";

export interface IInsightAlert extends Document {
  name: string;
  kind: AlertKind;
  enabled: boolean;
  kpi?: mongoose.Types.ObjectId;
  ragStates?: string[];
  metric?: mongoose.Types.ObjectId;
  rangePreset?: string;
  comparator?: "gt" | "gte" | "lt" | "lte";
  threshold?: number;
  qualityCheck?: string;
  frequency: AlertFrequency;
  /** Day of week (1 = Monday) or day of month, for weekly / monthly. */
  dayOf?: number;
  recipients: mongoose.Types.ObjectId[];
  /** Also email the recipients (needs SMTP settings). */
  emailRecipients: boolean;
  /** Slack incoming webhook; never sent back to the browser. */
  slackWebhookUrl?: string;
  lastRunAt?: Date;
  lastFiredAt?: Date;
  fireStreak: number;
  log: { at: Date; fired: boolean; message: string }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const insightAlertSchema = new Schema<IInsightAlert>(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    kind: { type: String, enum: ["kpi_rag", "metric_threshold", "data_quality"], required: true },
    enabled: { type: Boolean, default: true, index: true },
    kpi: { type: Schema.Types.ObjectId, ref: "InsightKpi" },
    ragStates: { type: [String], default: undefined },
    metric: { type: Schema.Types.ObjectId, ref: "InsightMetric" },
    rangePreset: { type: String, trim: true },
    comparator: { type: String, enum: ["gt", "gte", "lt", "lte"] },
    threshold: Number,
    qualityCheck: { type: String, trim: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "weekly" },
    dayOf: { type: Number, min: 1, max: 31 },
    recipients: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    emailRecipients: { type: Boolean, default: false },
    slackWebhookUrl: { type: String, trim: true, select: false },
    lastRunAt: Date,
    lastFiredAt: Date,
    fireStreak: { type: Number, default: 0 },
    log: {
      type: [new Schema({ at: Date, fired: Boolean, message: String }, { _id: false })],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightAlert: Model<IInsightAlert> =
  (mongoose.models.InsightAlert as Model<IInsightAlert>) ??
  mongoose.model<IInsightAlert>("InsightAlert", insightAlertSchema);

export default InsightAlert;
