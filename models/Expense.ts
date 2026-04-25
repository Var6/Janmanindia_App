import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Categories of expenses against a project budget.
 *  - admin       — office logistics: stationery, AC repair, furniture, equipment
 *                  ordered by the administrator role
 *  - training    — venue, materials, trainer fees
 *  - exploration — field visits, scoping, travel for new projects
 *  - staff       — salaries, stipends, payroll
 *  - travel      — generic travel for ongoing work (court travel, etc.)
 *  - other       — anything that doesn't fit
 */
export type ExpenseCategory =
  | "admin" | "training" | "exploration" | "staff" | "travel" | "legal" | "other";

/**
 * Stage flow:
 *   submitted  →  hr_verified  →  director_approved  →  paid
 *   any stage may transition to  →  rejected
 *
 * The administrator (or any role with permission) submits; HR verifies;
 * the director approves; finance marks it paid which deducts from the
 * project's total budget.
 */
export type ExpenseStatus =
  | "submitted" | "hr_verified" | "director_approved" | "paid" | "rejected";

export interface IExpenseDecision {
  by: mongoose.Types.ObjectId;
  at: Date;
  notes?: string;
}

export interface IExpense extends Document {
  project: mongoose.Types.ObjectId;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  currency: string;          // default INR
  receiptUrl?: string;
  vendor?: string;
  incurredAt?: Date;         // date the cost was actually incurred
  status: ExpenseStatus;

  submittedBy: mongoose.Types.ObjectId;
  submittedRole?: string;
  submittedAt: Date;

  hrVerification?: IExpenseDecision;
  directorApproval?: IExpenseDecision;
  payment?: IExpenseDecision;
  rejection?: IExpenseDecision & { stage: "hr" | "director" };

  createdAt: Date;
  updatedAt: Date;
}

const decisionSchema = new Schema<IExpenseDecision>(
  {
    by:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    at:    { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const expenseSchema = new Schema<IExpense>(
  {
    project:    { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    category:   {
      type: String,
      enum: ["admin", "training", "exploration", "staff", "travel", "legal", "other"],
      required: true,
      index: true,
    },
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    description:  { type: String, trim: true },
    amount:       { type: Number, required: true, min: 0 },
    currency:     { type: String, default: "INR", trim: true, uppercase: true },
    receiptUrl:   { type: String, trim: true },
    vendor:       { type: String, trim: true },
    incurredAt:   Date,
    status:       {
      type: String,
      enum: ["submitted", "hr_verified", "director_approved", "paid", "rejected"],
      default: "submitted",
      index: true,
    },

    submittedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submittedRole: { type: String, trim: true },
    submittedAt:   { type: Date, default: Date.now },

    hrVerification:    decisionSchema,
    directorApproval:  decisionSchema,
    payment:           decisionSchema,
    rejection: {
      stage: { type: String, enum: ["hr", "director"] },
      by:    { type: Schema.Types.ObjectId, ref: "User" },
      at:    Date,
      notes: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

expenseSchema.index({ project: 1, status: 1 });
expenseSchema.index({ status: 1, submittedAt: -1 });

const Expense: Model<IExpense> =
  (mongoose.models.Expense as Model<IExpense>) ||
  mongoose.model<IExpense>("Expense", expenseSchema);

export default Expense;
