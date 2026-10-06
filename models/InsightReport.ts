import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A frozen snapshot of a dashboard for a period, for funders and the board.
 * `snapshot` stores every tile's computed data at the moment the report was
 * made, so the report reads the same next year even after the cases change.
 */
export interface IInsightReport extends Document {
  title: string;
  dashboard: mongoose.Types.ObjectId;
  dashboardTitle: string;
  periodStart: Date;
  periodEnd: Date;
  summary?: string;
  snapshot: unknown;
  comments: {
    _id?: mongoose.Types.ObjectId;
    tileId?: string;
    text: string;
    by: mongoose.Types.ObjectId;
    byName: string;
    at: Date;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema(
  {
    tileId: { type: String, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const insightReportSchema = new Schema<IInsightReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    dashboard: { type: Schema.Types.ObjectId, ref: "InsightDashboard", required: true },
    dashboardTitle: { type: String, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    summary: { type: String, trim: true, maxlength: 5000 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    comments: { type: [commentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, minimize: false }
);

const InsightReport: Model<IInsightReport> =
  (mongoose.models.InsightReport as Model<IInsightReport>) ??
  mongoose.model<IInsightReport>("InsightReport", insightReportSchema);

export default InsightReport;
