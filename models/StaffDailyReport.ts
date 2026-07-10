import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Universal end-of-day report — EVERY staff member (all roles except
 * community) writes one per day in a rich-text editor.
 *
 * Rules enforced by the API:
 *  - One report per (author, dateKey); immutable once submitted (no edits).
 *  - The author sees only their own history; director / superadmin /
 *    administrator / HR can read everyone's.
 *  - Comments come in two visibilities: "public" (the author sees it) and
 *    "directors" (only the privileged reviewer group sees it).
 *  - 6pm IST reminder when today's report is missing; directors get an
 *    escalation when someone misses 3 consecutive days
 *    (see lib/daily-report-reminders.ts).
 */
export interface IReportComment {
  _id?: mongoose.Types.ObjectId;
  text: string;
  by: mongoose.Types.ObjectId;
  byName: string;
  byRole?: string;
  /** "public" — author + reviewers see it; "directors" — reviewers only. */
  visibility: "public" | "directors";
  createdAt: Date;
}

export interface IStaffDailyReport extends Document {
  author: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  /** IST calendar day the report covers, as "YYYY-MM-DD". */
  dateKey: string;
  /** Sanitised rich-text HTML (allowlist enforced server-side). */
  html: string;
  /** Plain-text preview for list rows / notifications. */
  preview: string;
  comments: IReportComment[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IReportComment>(
  {
    text:      { type: String, required: true, trim: true, maxlength: 3000 },
    by:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    byName:    { type: String, trim: true },
    byRole:    { type: String, trim: true },
    visibility:{ type: String, enum: ["public", "directors"], default: "public" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const staffDailyReportSchema = new Schema<IStaffDailyReport>(
  {
    author:     { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, trim: true },
    authorRole: { type: String, trim: true },
    dateKey:    { type: String, required: true, index: true },
    html:       { type: String, required: true, maxlength: 100_000 },
    preview:    { type: String, trim: true, maxlength: 400 },
    comments:   { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

// One report per person per day — the immutability anchor.
staffDailyReportSchema.index({ author: 1, dateKey: 1 }, { unique: true });
staffDailyReportSchema.index({ dateKey: 1, createdAt: 1 });

const StaffDailyReport: Model<IStaffDailyReport> =
  (mongoose.models.StaffDailyReport as Model<IStaffDailyReport>) ??
  mongoose.model<IStaffDailyReport>("StaffDailyReport", staffDailyReportSchema);

export default StaffDailyReport;
