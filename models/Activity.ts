import mongoose, { Schema, Document, Model } from "mongoose";

export type ActivityStatus = "planned" | "in_progress" | "done" | "cancelled";
export type ActivityPriority = "low" | "medium" | "high";
export type ActivityCategory =
  | "fieldwork" | "meeting" | "court" | "training" | "documentation"
  | "outreach" | "research" | "admin" | "other";

/** A single checklist item ("todo") nested inside an activity. Lives on the
 *  parent so we don't pay an extra round-trip to load the whole activity
 *  with its checklist on the planner page. */
export interface IActivityTodo {
  _id: mongoose.Types.ObjectId;
  title: string;
  done: boolean;
  /** Which user ticked it off and when — useful for "who closed this?" audits. */
  doneBy?: mongoose.Types.ObjectId;
  doneAt?: Date;
  addedBy: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IActivity extends Document {
  title: string;
  description?: string;
  category: ActivityCategory;
  priority: ActivityPriority;
  status: ActivityStatus;
  assignee: mongoose.Types.ObjectId;
  /** Additional people the task is also assigned to. The primary `assignee`
   *  hosts the calendar event; everyone in `coAssignees` is added as a
   *  Google Calendar attendee so the event syncs to their calendar too. */
  coAssignees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  /** Optional checklist — small action items the assignee(s) tick off as
   *  they make progress. Empty array by default. */
  todos: IActivityTodo[];
  /** Start of the activity's time slot. Date-only values (midnight UTC) are
   *  treated as "all day" and the calendar sync defaults to 09:00 IST. */
  dueDate?: Date;
  /** Optional end of the time slot. When set, the calendar event spans
   *  `dueDate → endsAt` instead of the default 30-min slot. */
  endsAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  /** Google Calendar event id when synced. */
  googleEventId?: string;
  /** Whose calendar the event lives on (so we know which user's refresh token to use for updates/deletes). */
  googleEventOwner?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<IActivityTodo>(
  {
    title:   { type: String, required: true, trim: true, maxlength: 280 },
    done:    { type: Boolean, default: false },
    doneBy:  { type: Schema.Types.ObjectId, ref: "User" },
    doneAt:  Date,
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const activitySchema = new Schema<IActivity>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true },
    category:    {
      type: String,
      enum: ["fieldwork", "meeting", "court", "training", "documentation", "outreach", "research", "admin", "other"],
      default: "other",
    },
    priority:    { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status:      { type: String, enum: ["planned", "in_progress", "done", "cancelled"], default: "planned", index: true },
    assignee:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coAssignees: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], index: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    todos:       { type: [todoSchema], default: [] },
    dueDate:     Date,
    endsAt:      Date,
    startedAt:   Date,
    completedAt: Date,
    notes:       String,
    googleEventId:    { type: String, index: true },
    googleEventOwner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

activitySchema.index({ assignee: 1, status: 1, dueDate: 1 });

const Activity: Model<IActivity> =
  (mongoose.models.Activity as Model<IActivity>) ||
  mongoose.model<IActivity>("Activity", activitySchema);

export default Activity;
