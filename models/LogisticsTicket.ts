import mongoose, { Schema, Document, Model } from "mongoose";

export type LogisticsCategory =
  | "equipment"   // chair, table, laptop replacement
  | "transport"   // vehicle for community/victim/team
  | "supplies"    // stationery, food, water
  | "maintenance" // repairs, electrical, internet
  | "office"      // new office setup, room booking
  | "other";

export type LogisticsUrgency = "normal" | "high" | "critical";
export type LogisticsStatus = "open" | "in_progress" | "fulfilled" | "rejected" | "closed";

export interface ILogisticsTicket extends Document {
  raisedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  category: LogisticsCategory;
  urgency: LogisticsUrgency;
  title: string;
  description: string;
  beneficiary?: string;        // who needs it (e.g. victim name, "office", team)
  district?: string;
  location?: string;
  status: LogisticsStatus;
  response?: string;
  fulfilledAt?: Date;
  rejectedReason?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const logisticsTicketSchema = new Schema<ILogisticsTicket>(
  {
    raisedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo:  { type: Schema.Types.ObjectId, ref: "User" },
    category:    {
      type: String,
      enum: ["equipment", "transport", "supplies", "maintenance", "office", "other"],
      required: true,
      index: true,
    },
    urgency:     { type: String, enum: ["normal", "high", "critical"], default: "normal", index: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    beneficiary: { type: String, trim: true },
    district:    { type: String, trim: true, index: true },
    location:    { type: String, trim: true },
    status:      { type: String, enum: ["open", "in_progress", "fulfilled", "rejected", "closed"], default: "open", index: true },
    response:    String,
    fulfilledAt: Date,
    rejectedReason: String,
    closedAt:    Date,
  },
  { timestamps: true }
);

logisticsTicketSchema.index({ status: 1, urgency: 1, createdAt: -1 });

const LogisticsTicket: Model<ILogisticsTicket> =
  (mongoose.models.LogisticsTicket as Model<ILogisticsTicket>) ||
  mongoose.model<ILogisticsTicket>("LogisticsTicket", logisticsTicketSchema);

export default LogisticsTicket;
