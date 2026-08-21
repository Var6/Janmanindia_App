import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * An **application for expenditure** — the multi-line expense claim modelled on
 * the Janman "Fellowship Expense Tracker" form. One claim has a single header
 * (who is claiming, against which project, and which director should approve)
 * followed by one or more expense *line items* (the repeatable "Details of
 * Expenses" block on the form).
 *
 * This is deliberately separate from the single-record `Expense` model, which
 * still powers case-finance requisitions and activity bills. A claim routes
 * directly to the director the applicant names:
 *
 *   submitted → approved (by the chosen director) → paid (finance)
 *   any stage may transition to → rejected
 */
export type Designation = "volunteer" | "consultant" | "director";

export type ClaimStatus = "submitted" | "approved" | "paid" | "rejected";

export interface IClaimDecision {
  by: mongoose.Types.ObjectId;
  at: Date;
  notes?: string;
}

export interface IExpenseLineItem {
  /** Date the cost was actually incurred ("Date of Expense Incurred"). */
  incurredAt?: Date;
  /** "Name of the vendor". */
  vendor?: string;
  /** Free-text expense "Head" (e.g. Travel, Stay, Printing). */
  head: string;
  /** Amount in INR. */
  amount: number;
  /** "Supporting Docs" — up to 10 uploaded file URLs. */
  receiptUrls: string[];
}

export interface IExpenseClaim extends Document {
  /** Applicant name as entered / captured at submission time. */
  applicantName: string;
  submittedBy: mongoose.Types.ObjectId;
  submittedRole?: string;
  designation: Designation;
  /** The "Date" header field — when the application is made. */
  applicationDate: Date;

  /** Chosen project (a real Project) OR a free-text "Other" project name. */
  project?: mongoose.Types.ObjectId;
  projectOther?: string;

  /** The director the applicant selected under "Expense Approved By". The claim
   *  routes to this person's approval queue. `approverOther` holds a free-text
   *  name when "Other" was chosen (no in-app routing then). */
  approver?: mongoose.Types.ObjectId;
  approverOther?: string;

  lineItems: IExpenseLineItem[];
  /** Sum of all line-item amounts, stored for cheap listing/reporting. */
  totalAmount: number;
  currency: string;

  status: ClaimStatus;
  submittedAt: Date;

  approval?: IClaimDecision;
  payment?: IClaimDecision;
  rejection?: IClaimDecision & { stage: "director" | "finance" };

  createdAt: Date;
  updatedAt: Date;
}

const decisionSchema = new Schema<IClaimDecision>(
  {
    by:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    at:    { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const lineItemSchema = new Schema<IExpenseLineItem>(
  {
    incurredAt:  Date,
    vendor:      { type: String, trim: true },
    head:        { type: String, required: true, trim: true, maxlength: 200 },
    amount:      { type: Number, required: true, min: 0 },
    receiptUrls: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: "A line item can have at most 10 supporting documents.",
      },
    },
  },
  { _id: false }
);

const expenseClaimSchema = new Schema<IExpenseClaim>(
  {
    applicantName: { type: String, required: true, trim: true },
    submittedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submittedRole: { type: String, trim: true },
    designation:   {
      type: String,
      enum: ["volunteer", "consultant", "director"],
      required: true,
    },
    applicationDate: { type: Date, default: Date.now },

    project:      { type: Schema.Types.ObjectId, ref: "Project", index: true },
    projectOther: { type: String, trim: true },

    approver:      { type: Schema.Types.ObjectId, ref: "User", index: true },
    approverOther: { type: String, trim: true },

    lineItems: {
      type: [lineItemSchema],
      validate: {
        validator: (v: IExpenseLineItem[]) => Array.isArray(v) && v.length > 0,
        message: "An expenditure application needs at least one expense line.",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    currency:    { type: String, default: "INR", trim: true, uppercase: true },

    status: {
      type: String,
      enum: ["submitted", "approved", "paid", "rejected"],
      default: "submitted",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },

    approval: decisionSchema,
    payment:  decisionSchema,
    rejection: {
      stage: { type: String, enum: ["director", "finance"] },
      by:    { type: Schema.Types.ObjectId, ref: "User" },
      at:    Date,
      notes: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

expenseClaimSchema.index({ approver: 1, status: 1 });
expenseClaimSchema.index({ status: 1, submittedAt: -1 });

const ExpenseClaim: Model<IExpenseClaim> =
  (mongoose.models.ExpenseClaim as Model<IExpenseClaim>) ||
  mongoose.model<IExpenseClaim>("ExpenseClaim", expenseClaimSchema);

export default ExpenseClaim;
