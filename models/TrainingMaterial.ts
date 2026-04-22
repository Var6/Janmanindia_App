import mongoose, { Schema, Document, Model } from "mongoose";

export type TrainingFileType = "pdf" | "doc" | "ppt" | "image" | "video" | "other";
export type TrainingStatus = "pending" | "approved" | "rejected";

export interface ITrainingMaterial extends Document {
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  fileType: TrainingFileType;
  uploadedBy: mongoose.Types.ObjectId;
  status: TrainingStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const trainingMaterialSchema = new Schema<ITrainingMaterial>(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category:    { type: String, trim: true },
    fileUrl:     { type: String, required: true, trim: true },
    fileType:    { type: String, enum: ["pdf", "doc", "ppt", "image", "video", "other"], required: true },
    uploadedBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    approvedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt:  { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

trainingMaterialSchema.index({ status: 1, createdAt: -1 });

const TrainingMaterial: Model<ITrainingMaterial> =
  (mongoose.models.TrainingMaterial as Model<ITrainingMaterial>) ||
  mongoose.model<ITrainingMaterial>("TrainingMaterial", trainingMaterialSchema);

export default TrainingMaterial;
