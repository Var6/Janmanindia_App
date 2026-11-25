import mongoose, { Schema, Document, Model } from "mongoose";
import type { ChartType, NumberFormat, QuerySpec } from "@/lib/insights/types";

/** A saved chart: a query plus how to draw it. */
export interface IInsightChart extends Document {
  title: string;
  description?: string;
  chartType: ChartType;
  query: QuerySpec;
  display: {
    horizontal?: boolean;
    stacked?: boolean;
    showValues?: boolean;
    numberFormat?: NumberFormat;
    /** Cap on bars / slices; the rest are grouped as "Other". */
    topN?: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const insightChartSchema = new Schema<IInsightChart>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 500 },
    chartType: { type: String, enum: ["bar", "line", "pie", "number", "table", "pivot", "map"], required: true },
    query: { type: Schema.Types.Mixed, required: true },
    display: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightChart: Model<IInsightChart> =
  (mongoose.models.InsightChart as Model<IInsightChart>) ??
  mongoose.model<IInsightChart>("InsightChart", insightChartSchema);

export default InsightChart;
