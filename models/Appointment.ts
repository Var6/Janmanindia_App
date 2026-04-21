import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppointment extends Document {
  citizen: mongoose.Types.ObjectId;
  socialWorker: mongoose.Types.ObjectId;
  litigationMember?: mongoose.Types.ObjectId;
  requestedAt: Date;
  proposedDate: Date;
  status: "pending_sw" | "approved_sw" | "confirmed_litigation" | "rejected";
  reason: string;
  swNotes?: string;
  litigationNotes?: string;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    citizen: { type: Schema.Types.ObjectId, ref: "User", required: true },
    socialWorker: { type: Schema.Types.ObjectId, ref: "User", required: true },
    litigationMember: { type: Schema.Types.ObjectId, ref: "User" },
    requestedAt: { type: Date, default: Date.now },
    proposedDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending_sw", "approved_sw", "confirmed_litigation", "rejected"],
      default: "pending_sw",
    },
    reason: { type: String, required: true },
    swNotes: String,
    litigationNotes: String,
  },
  { timestamps: true }
);

appointmentSchema.index({ citizen: 1, status: 1 });
appointmentSchema.index({ socialWorker: 1, status: 1 });
appointmentSchema.index({ litigationMember: 1, status: 1 });

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", appointmentSchema);

export default Appointment;
