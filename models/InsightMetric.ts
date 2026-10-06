import mongoose, { Schema, Document, Model } from "mongoose";
import type { FilterSpec, MeasureSpec } from "@/lib/insights/types";

/**
 * A reusable definition of "what we count": a dataset, an aggregation and
 * fixed filters. KPIs and alerts are built on metrics so that, say, "POCSO
 * cases taken up" means the same thing everywhere it appears.
 */
export interface IInsightMetric extends Document {
  name: string;
  description?: string;
  dataset: string;
  measure: MeasureSpec;
  filters: FilterSpec[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const insightMetricSchema = new Schema<IInsightMetric>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    dataset: { type: String, required: true, trim: true },
    measure: { type: Schema.Types.Mixed, required: true },
    filters: { type: Schema.Types.Mixed, default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightMetric: Model<IInsightMetric> =
  (mongoose.models.InsightMetric as Model<IInsightMetric>) ??
  mongoose.model<IInsightMetric>("InsightMetric", insightMetricSchema);

export default InsightMetric;
