import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A monthly programme report filed by a lawyer (District Legal Fellowship) or a
 * social worker (Access to Justice). The structure of each report is driven by
 * the templates in `lib/monthly-report-templates.ts`; the filled data is stored
 * flexibly here:
 *
 *   header   — the top block (district, work period, address, mobile, email)
 *   sections — a map of sectionId → rows. Dynamic tables store an array of row
 *              objects ({ colKey: value }); Part C fixed-row grids store an
 *              object keyed by the fixed row key ({ rowKey: { colKey: value } }).
 *              Section note fields are stored as sections["<id>__note"] = string.
 */
export type MonthlyReportType = "lawyer" | "socialworker";

export interface IMonthlyReport extends Document {
  type: MonthlyReportType;
  submittedBy: mongoose.Types.ObjectId;
  submitterName: string;
  submitterRole?: string;
  /** Reporting month, stored as "YYYY-MM" for stable sorting/filtering. */
  month: string;
  submissionDate: Date;
  header: Record<string, unknown>;
  sections: Record<string, unknown>;
  status: "submitted";
  createdAt: Date;
  updatedAt: Date;
}

const monthlyReportSchema = new Schema<IMonthlyReport>(
  {
    type: { type: String, enum: ["lawyer", "socialworker"], required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submitterName: { type: String, required: true, trim: true },
    submitterRole: { type: String, trim: true },
    month: { type: String, required: true, trim: true, index: true },   // "2026-10"
    submissionDate: { type: Date, default: Date.now },
    header: { type: Schema.Types.Mixed, default: {} },
    sections: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["submitted"], default: "submitted" },
  },
  { timestamps: true }
);

// One report per person per month — editing re-saves the same document.
monthlyReportSchema.index({ submittedBy: 1, month: 1 }, { unique: true });
monthlyReportSchema.index({ type: 1, month: 1, createdAt: -1 });

const MonthlyReport: Model<IMonthlyReport> =
  (mongoose.models.MonthlyReport as Model<IMonthlyReport>) ||
  mongoose.model<IMonthlyReport>("MonthlyReport", monthlyReportSchema);

export default MonthlyReport;
