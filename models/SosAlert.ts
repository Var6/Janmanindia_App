import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISosAlert extends Document {
  raisedBy: mongoose.Types.ObjectId;
  location: string;
  description: string;
  mediaUrls: string[];
  status: "open" | "escalated" | "resolved";
  escalatedBy?: mongoose.Types.ObjectId;
  escalatedAt?: Date;
  assignedTo?: mongoose.Types.ObjectId;
}

const sosAlertSchema = new Schema<ISosAlert>(
  {
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    mediaUrls: [String],
    status: {
      type: String,
      enum: ["open", "escalated", "resolved"],
      default: "open",
    },
    escalatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    escalatedAt: Date,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

sosAlertSchema.index({ status: 1, raisedBy: 1 });
sosAlertSchema.index({ assignedTo: 1, status: 1 });

const SosAlert: Model<ISosAlert> =
  mongoose.models.SosAlert ??
  mongoose.model<ISosAlert>("SosAlert", sosAlertSchema);

export default SosAlert;
