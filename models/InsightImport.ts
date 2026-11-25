import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A dataset brought into Insights from outside the app: an uploaded file, a
 * Google Sheet shared by link, or one of the connected sources (KoboToolbox,
 * SurveyCTO, CommCare, Airtable, Avni, Salesforce, Postgres). Rows live in
 * InsightImportRow; this document holds the column definitions and where the
 * data came from, so the import can be refreshed.
 */
export type ImportColumnType = "string" | "number" | "date" | "boolean";
export type ImportSource = "csv" | "sheets" | "kobo" | "surveycto" | "commcare" | "airtable" | "avni" | "salesforce" | "postgres";
export type ImportSchedule = "none" | "daily" | "weekly";

export interface IInsightImport extends Document {
  name: string;
  description?: string;
  source: ImportSource;
  /** The sheet link, form id, "base/table" and so on. Never a token. */
  sourceRef?: string;
  columns: { key: string; label: string; type: ImportColumnType }[];
  rowCount: number;
  lastSyncedAt?: Date;
  /** Refresh from the source by itself: every day, or every Monday. */
  syncSchedule: ImportSchedule;
  /** When the scheduler last tried (it tries once a day at most). */
  lastSyncTriedAt?: Date;
  /** Why the last refresh failed; cleared by the next one that works. */
  lastSyncError?: string;
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
    source: { type: String, enum: ["csv", "sheets", "kobo", "surveycto", "commcare", "airtable", "avni", "salesforce", "postgres"], required: true },
    sourceRef: { type: String, trim: true, maxlength: 500 },
    columns: { type: [columnSchema], default: [] },
    rowCount: { type: Number, default: 0 },
    lastSyncedAt: Date,
    syncSchedule: { type: String, enum: ["none", "daily", "weekly"], default: "none", index: true },
    lastSyncTriedAt: Date,
    lastSyncError: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const InsightImport: Model<IInsightImport> =
  (mongoose.models.InsightImport as Model<IInsightImport>) ??
  mongoose.model<IInsightImport>("InsightImport", insightImportSchema);

export default InsightImport;
