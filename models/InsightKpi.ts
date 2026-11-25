import mongoose, { Schema, Document, Model } from "mongoose";
import type { Direction, Grain, KpiType, NumberFormat } from "@/lib/insights/types";

/**
 * An indicator with a target: a metric measured per period (month, quarter…)
 * against a target, with red / amber / green thresholds set as a share of the
 * target. `kpiType` places it on the logframe (input → output → outcome →
 * impact). Notes let the team pin a beneficiary quote or context to a point
 * on the trend.
 */
export interface IInsightKpi extends Document {
  name: string;
  description?: string;
  metric: mongoose.Types.ObjectId;
  timeField: string;
  grain: Grain;
  /** Count running totals instead of per-period values. */
  cumulative: boolean;
  target: number;
  /** False while the target is a starter placeholder nobody has confirmed. */
  targetConfirmed: boolean;
  direction: Direction;
  /** % of target at or above which the KPI is on track / needs attention. */
  onTrackPct: number;
  attentionPct: number;
  kpiType: KpiType;
  programTags: string[];
  numberFormat: NumberFormat;
  decimals: number;
  prefix?: string;
  suffix?: string;
  notes: { _id?: mongoose.Types.ObjectId; period?: Date; text: string; by: mongoose.Types.ObjectId; byName: string; at: Date }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema(
  {
    period: Date,
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const insightKpiSchema = new Schema<IInsightKpi>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    metric: { type: Schema.Types.ObjectId, ref: "InsightMetric", required: true, index: true },
    timeField: { type: String, required: true },
    grain: { type: String, enum: ["day", "week", "month", "quarter", "year"], default: "month" },
    cumulative: { type: Boolean, default: false },
    target: { type: Number, required: true },
    targetConfirmed: { type: Boolean, default: true, index: true },
    direction: { type: String, enum: ["higher", "lower"], default: "higher" },
    onTrackPct: { type: Number, default: 90, min: 0, max: 1000 },
    attentionPct: { type: Number, default: 70, min: 0, max: 1000 },
    kpiType: { type: String, enum: ["input", "output", "outcome", "impact"], default: "output", index: true },
    programTags: { type: [String], default: [] },
    numberFormat: { type: String, enum: ["plain", "indian", "compact_indian", "percent", "currency"], default: "indian" },
    decimals: { type: Number, default: 0, min: 0, max: 4 },
    prefix: { type: String, trim: true, maxlength: 8 },
    suffix: { type: String, trim: true, maxlength: 12 },
    notes: { type: [noteSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightKpi: Model<IInsightKpi> =
  (mongoose.models.InsightKpi as Model<IInsightKpi>) ??
  mongoose.model<IInsightKpi>("InsightKpi", insightKpiSchema);

export default InsightKpi;
