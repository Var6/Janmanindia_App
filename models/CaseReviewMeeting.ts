import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A review / progress MEETING on a case — richer than the monthly CaseReview.
 * Captures, for one dated discussion: who attended, what was decided, any
 * objectives, the (optional) next discussion date, and the action items —
 * each of which can be promoted into an organisation-wide Activity and tracked
 * to an outcome. Rendered as a colour-coded timeline below the workflow tree so
 * the team can see, at a glance, when something was decided and by whom.
 */
export interface IReviewAttendee {
  /** Linked staff/community user if known. */
  user?: mongoose.Types.ObjectId;
  name: string;
  /** Role at the time — drives the attendee chip colour. */
  role?: string;
}

export interface IReviewActionItem {
  text: string;
  /** Linked org Activity if this action was promoted into one. */
  activity?: mongoose.Types.ObjectId;
  activityTitle?: string;
  /** What happened with it. */
  outcome?: string;
  done?: boolean;
}

export interface ICaseReviewMeeting extends Document {
  case: mongoose.Types.ObjectId;
  /** When the discussion happened (the timeline node date). */
  date: Date;
  author: mongoose.Types.ObjectId;
  authorName?: string;
  authorRole?: string;
  attendees: IReviewAttendee[];
  /** What changed / was decided — the review message. */
  summary: string;
  /** Optional — goals set for the period. */
  objectives?: string;
  /** Optional — when the next discussion should happen. */
  nextDate?: Date;
  actionItems: IReviewActionItem[];
  /** Optional — outcome / update recorded after the meeting. */
  outcome?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendeeSchema = new Schema<IReviewAttendee>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
  },
  { _id: false }
);

const actionItemSchema = new Schema<IReviewActionItem>(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    activity: { type: Schema.Types.ObjectId, ref: "Activity" },
    activityTitle: { type: String, trim: true },
    outcome: { type: String, trim: true, maxlength: 2000 },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const caseReviewMeetingSchema = new Schema<ICaseReviewMeeting>(
  {
    case: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, trim: true },
    authorRole: { type: String, trim: true },
    attendees: { type: [attendeeSchema], default: [] },
    summary: { type: String, required: true, trim: true, maxlength: 8000 },
    objectives: { type: String, trim: true, maxlength: 4000 },
    nextDate: { type: Date },
    actionItems: { type: [actionItemSchema], default: [] },
    outcome: { type: String, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

caseReviewMeetingSchema.index({ case: 1, date: -1 });

const CaseReviewMeeting: Model<ICaseReviewMeeting> =
  (mongoose.models.CaseReviewMeeting as Model<ICaseReviewMeeting>) ??
  mongoose.model<ICaseReviewMeeting>("CaseReviewMeeting", caseReviewMeetingSchema);

export default CaseReviewMeeting;
