import mongoose, { Schema, Document, Model } from "mongoose";

/** One row of an imported dataset. `data` holds values keyed by the
 *  import's column keys, already converted to the column's type. */
export interface IInsightImportRow extends Document {
  importId: mongoose.Types.ObjectId;
  data: Record<string, unknown>;
  createdAt: Date;
}

const insightImportRowSchema = new Schema<IInsightImportRow>(
  {
    importId: { type: Schema.Types.ObjectId, ref: "InsightImport", required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const InsightImportRow: Model<IInsightImportRow> =
  (mongoose.models.InsightImportRow as Model<IInsightImportRow>) ??
  mongoose.model<IInsightImportRow>("InsightImportRow", insightImportRowSchema);

export default InsightImportRow;
