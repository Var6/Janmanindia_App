import mongoose, { Schema, Document, Model } from "mongoose";

export type ActivityStatus = "planned" | "in_progress" | "done" | "cancelled";
export type ActivityPriority = "low" | "medium" | "high";
export type ActivityCategory =
  | "fieldwork" | "meeting" | "court" | "training" | "documentation"
  | "outreach" | "research" | "admin" | "other";

export interface IActivity extends Document {
  title: string;
  description?: string;
  category: ActivityCategory;
  priority: ActivityPriority;
  status: ActivityStatus;
  assignee: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate:     Date,
    startedAt:   Date,
    completedAt: Date,
    notes:       String,
  },
  { timestamps: true }
);

activitySchema.index({ assignee: 1, status: 1, dueDate: 1 });

const Activity: Model<IActivity> =
  (mongoose.models.Activity as Model<IActivity>) ||
  mongoose.model<IActivity>("Activity", activitySchema);

export default Activity;
