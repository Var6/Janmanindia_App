import mongoose, { Schema, Document, Model } from "mongoose";

export type AssetStatus = "assigned" | "returned" | "lost" | "damaged";

export type AssetType =
  | "laptop" | "phone" | "sim" | "vehicle" | "id_card"
  | "email_account" | "uniform" | "stationery" | "key" | "other";

export interface IAsset extends Document {
  employee: mongoose.Types.ObjectId;
  type: AssetType;
  name: string;                    // e.g. "MacBook Air M2"
  identifier?: string;             // serial / IMEI / vehicle reg / email address
  notes?: string;
  status: AssetStatus;
  assignedAt: Date;
  assignedBy: mongoose.Types.ObjectId;
  returnedAt?: Date;
  returnedBy?: mongoose.Types.ObjectId;
  returnNotes?: string;
}

const assetSchema = new Schema<IAsset>(
  {
    employee:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:       {
      type: String,
      enum: ["laptop", "phone", "sim", "vehicle", "id_card", "email_account", "uniform", "stationery", "key", "other"],
      required: true,
    },
    name:       { type: String, required: true, trim: true },
    identifier: { type: String, trim: true },
    notes:      { type: String, trim: true },
    status:     { type: String, enum: ["assigned", "returned", "lost", "damaged"], default: "assigned", index: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    returnedAt: Date,
    returnedBy: { type: Schema.Types.ObjectId, ref: "User" },
    returnNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

assetSchema.index({ employee: 1, status: 1 });

const Asset: Model<IAsset> =
  (mongoose.models.Asset as Model<IAsset>) ||
  mongoose.model<IAsset>("Asset", assetSchema);

export default Asset;
