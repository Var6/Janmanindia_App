import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Invoice approval flow:
 *   pending  →  HR verifies        →  hr_verified
 *   hr_verified  →  head lawyer / director approves  →  approved
 *   any state may end at  →  rejected
 *
 * For social workers HR verifies AND approves in a single step (skips head-lawyer hop).
 */
export interface IEodReport extends Document {
  submittedBy: mongoose.Types.ObjectId;
  submitterRole?: "socialworker" | "litigation" | string;
  date: Date;
  summary: string;
  hoursWorked: number;
  ticketsWorkedOn: mongoose.Types.ObjectId[];
  expenses: {
    description: string;
    amount: number;
    receiptUrl?: string;
  }[];
  invoiceUrl?: string;
  invoiceStatus: "pending" | "hr_verified" | "approved" | "rejected";
  hrVerifiedBy?: mongoose.Types.ObjectId;
  hrVerifiedAt?: Date;
  hrNotes?: string;
  finalApprovedBy?: mongoose.Types.ObjectId;
  finalApprovedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId; // legacy — kept for back-compat in older UIs
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    receiptUrl: String,
  },
  { _id: false }
);

const eodReportSchema = new Schema<IEodReport>(
  {
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    summary: { type: String, required: true },
    hoursWorked: { type: Number, required: true },
    ticketsWorkedOn: [{ type: Schema.Types.ObjectId, ref: "Case" }],
    expenses: [expenseSchema],
    invoiceUrl: String,
    invoiceStatus: {
      type: String,
      enum: ["pending", "hr_verified", "approved", "rejected"],
      default: "pending",
    },
    submitterRole:    { type: String, trim: true },
    hrVerifiedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    hrVerifiedAt:     Date,
    hrNotes:          String,
    finalApprovedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    finalApprovedAt:  Date,
    approvalNotes:    String,
    rejectionReason:  String,
    reviewedBy:       { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eodReportSchema.index({ submittedBy: 1, date: -1 });
eodReportSchema.index({ invoiceStatus: 1 });

const EodReport: Model<IEodReport> =
  mongoose.models.EodReport ??
  mongoose.model<IEodReport>("EodReport", eodReportSchema);

export default EodReport;
