import mongoose, { Schema, Document, Model } from "mongoose";

/** Tiered escalation ladder: a community SOS lands with the PLVs first, who
 *  escalate to a social worker, who escalates to the litigation team. Legacy
 *  alerts (created before this field existed) have no `stage`; they're treated
 *  as already at the social-worker tier so nothing is stranded. */
export type SosStage = "plv" | "socialworker" | "litigation" | "resolved";

export interface ISosEscalation {
  by: mongoose.Types.ObjectId;
  fromStage: SosStage;
  toStage: SosStage;
  at: Date;
}

export interface ISosAlert extends Document {
  raisedBy: mongoose.Types.ObjectId;
  location: string;
  description: string;
  mediaUrls: string[];
  status: "open" | "escalated" | "resolved";
  /** Current tier in the PLV → SW → litigation ladder. */
  stage: SosStage;
  /** Audit trail of each escalation hop. */
  escalations?: ISosEscalation[];
  escalatedBy?: mongoose.Types.ObjectId;
  escalatedAt?: Date;
  assignedTo?: mongoose.Types.ObjectId;
}

const escalationSchema = new Schema<ISosEscalation>(
  {
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromStage: { type: String, required: true },
    toStage: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
    stage: {
      type: String,
      enum: ["plv", "socialworker", "litigation", "resolved"],
      default: "plv",
      index: true,
    },
    escalations: { type: [escalationSchema], default: [] },
    escalatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    escalatedAt: Date,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

sosAlertSchema.index({ status: 1, raisedBy: 1 });
sosAlertSchema.index({ assignedTo: 1, status: 1 });
sosAlertSchema.index({ stage: 1, status: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.SosAlert) {
  mongoose.deleteModel("SosAlert");
}
const SosAlert: Model<ISosAlert> =
  mongoose.models.SosAlert ??
  mongoose.model<ISosAlert>("SosAlert", sosAlertSchema);

export default SosAlert;
