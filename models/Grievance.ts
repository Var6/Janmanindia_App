import mongoose, { Schema, Document, Model } from "mongoose";

export type GrievanceStatus = "open" | "in_review" | "responded" | "closed";
export type GrievanceCategory =
  | "harassment" | "discrimination" | "workload" | "compensation"
  | "facilities" | "interpersonal" | "policy" | "other";

export interface IGrievance extends Document {
  submittedBy: mongoose.Types.ObjectId;
  anonymous: boolean;
  category: GrievanceCategory;
  subject: string;
  description: string;
  incidentDate?: Date;
  incidentLocation?: string;
  involvedPersons?: string;
  status: GrievanceStatus;
  hrResponse?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const grievanceSchema = new Schema<IGrievance>(
  {
    submittedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    anonymous:        { type: Boolean, default: false },
    category: {
      type: String,
      enum: ["harassment", "discrimination", "workload", "compensation", "facilities", "interpersonal", "policy", "other"],
      required: true,
    },
    subject:          { type: String, required: true, trim: true, maxlength: 200 },
    description:      { type: String, required: true, trim: true },
    incidentDate:     Date,
    incidentLocation: { type: String, trim: true },
    involvedPersons:  { type: String, trim: true },
    status:           { type: String, enum: ["open", "in_review", "responded", "closed"], default: "open", index: true },
    hrResponse:       { type: String, trim: true },
    respondedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    respondedAt:      Date,
    closedAt:         Date,
  },
  { timestamps: true }
);

grievanceSchema.index({ status: 1, createdAt: -1 });

const Grievance: Model<IGrievance> =
  (mongoose.models.Grievance as Model<IGrievance>) ||
  mongoose.model<IGrievance>("Grievance", grievanceSchema);

export default Grievance;
