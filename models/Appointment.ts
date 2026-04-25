import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppointment extends Document {
  // Legacy three-party fields — used by the community → SW → litigation chain.
  community?: mongoose.Types.ObjectId;
  socialWorker?: mongoose.Types.ObjectId;
  litigationMember?: mongoose.Types.ObjectId;
  // Generic peer-to-peer fields — anyone can request a meeting with anyone.
  requester?: mongoose.Types.ObjectId;
  requestee?: mongoose.Types.ObjectId;
  requestedAt: Date;
  proposedDate: Date;
  endDate?: Date;
  status: "pending_sw" | "approved_sw" | "confirmed_litigation" | "rejected" | "pending" | "confirmed" | "cancelled";
  reason: string;
  swNotes?: string;
  litigationNotes?: string;
  responseNotes?: string;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    community: { type: Schema.Types.ObjectId, ref: "User" },
    socialWorker: { type: Schema.Types.ObjectId, ref: "User" },
    litigationMember: { type: Schema.Types.ObjectId, ref: "User" },
    requester: { type: Schema.Types.ObjectId, ref: "User", index: true },
    requestee: { type: Schema.Types.ObjectId, ref: "User", index: true },
    requestedAt: { type: Date, default: Date.now },
    proposedDate: { type: Date, required: true, index: true },
    endDate: Date,
    status: {
      type: String,
      enum: ["pending_sw", "approved_sw", "confirmed_litigation", "rejected", "pending", "confirmed", "cancelled"],
      default: "pending",
    },
    reason: { type: String, required: true },
    swNotes: String,
    litigationNotes: String,
    responseNotes: String,
  },
  { timestamps: true }
);

appointmentSchema.index({ community: 1, status: 1 });
appointmentSchema.index({ socialWorker: 1, status: 1 });
appointmentSchema.index({ litigationMember: 1, status: 1 });
appointmentSchema.index({ requester: 1, status: 1 });
appointmentSchema.index({ requestee: 1, status: 1 });

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", appointmentSchema);

export default Appointment;
