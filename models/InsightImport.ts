import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A dataset brought into Insights from outside the app: a CSV upload, a
 * published Google Sheet, or a KoboToolbox form. Rows live in
 * InsightImportRow; this document holds the column definitions and where the
 * data came from, so the import can be refreshed.
 */
export type ImportColumnType = "string" | "number" | "date" | "boolean";
export type ImportSource = "csv" | "sheets" | "kobo";

export interface IInsightImport extends Document {
  name: string;
  description?: string;
  source: ImportSource;
  /** Published-CSV link (Sheets) or Kobo asset uid. Never a token. */
  sourceRef?: string;
  columns: { key: string; label: string; type: ImportColumnType }[];
  rowCount: number;
  lastSyncedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const columnSchema = new Schema(
  {
    key: { type: String, required: true, match: /^[a-z][a-z0-9_]{0,40}$/ },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ["string", "number", "date", "boolean"], required: true },
  },
  { _id: false }
);

const insightImportSchema = new Schema<IInsightImport>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    source: { type: String, enum: ["csv", "sheets", "kobo"], required: true },
    sourceRef: { type: String, trim: true, maxlength: 500 },
    columns: { type: [columnSchema], default: [] },
    rowCount: { type: Number, default: 0 },
    lastSyncedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightImport: Model<IInsightImport> =
  (mongoose.models.InsightImport as Model<IInsightImport>) ??
  mongoose.model<IInsightImport>("InsightImport", insightImportSchema);

export default InsightImport;
