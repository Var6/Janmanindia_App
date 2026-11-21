import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Organisation-wide Insights settings: one document (key "org"). Today it
 * holds the Copilot controls a director sets on the Settings page.
 */
export interface IInsightSettings extends Document {
  key: string;
  copilot: {
    /** A director switched Copilot on. This is the consent for aggregate
     *  figures to be sent to the AI provider. */
    enabled: boolean;
    /** Show each query for approval before it runs. */
    requireApproval: boolean;
    /** Standing notes given to Copilot with every question (no personal data). */
    context: string;
    /** Datasets Copilot may query; empty means all of the app's own datasets. */
    datasets: string[];
    changedBy?: mongoose.Types.ObjectId;
    changedByName?: string;
    changedAt?: Date;
  };
  updatedAt: Date;
}

const insightSettingsSchema = new Schema<IInsightSettings>(
  {
    key: { type: String, required: true, unique: true, default: "org" },
    copilot: {
      enabled: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: true },
      context: { type: String, default: "", maxlength: 5000 },
      datasets: { type: [String], default: [] },
      changedBy: { type: Schema.Types.ObjectId, ref: "User" },
      changedByName: { type: String, trim: true },
      changedAt: Date,
    },
  },
  { timestamps: true }
);

const InsightSettings: Model<IInsightSettings> =
  (mongoose.models.InsightSettings as Model<IInsightSettings>) ??
  mongoose.model<IInsightSettings>("InsightSettings", insightSettingsSchema);

export default InsightSettings;
