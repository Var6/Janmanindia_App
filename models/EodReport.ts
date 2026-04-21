import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEodReport extends Document {
  submittedBy: mongoose.Types.ObjectId;
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
  invoiceStatus: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
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
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eodReportSchema.index({ submittedBy: 1, date: -1 });
eodReportSchema.index({ invoiceStatus: 1 });

const EodReport: Model<IEodReport> =
  mongoose.models.EodReport ??
  mongoose.model<IEodReport>("EodReport", eodReportSchema);

export default EodReport;
