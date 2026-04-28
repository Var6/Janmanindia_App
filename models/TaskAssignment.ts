import mongoose, { Schema, model, models, Document, Types } from "mongoose";

export interface ITaskAssignment extends Document {
  activity: Types.ObjectId;
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  previousAssignee?: Types.ObjectId;
  note?: string;
}

const taskAssignmentSchema = new Schema<ITaskAssignment>(
  {
    activity:         { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    assignedTo:       { type: Schema.Types.ObjectId, ref: "User",     required: true },
    assignedBy:       { type: Schema.Types.ObjectId, ref: "User",     required: true },
    assignedAt:       { type: Date, default: Date.now },
    previousAssignee: { type: Schema.Types.ObjectId, ref: "User" },
    note:             { type: String, trim: true },
  },
  { timestamps: false }
);

taskAssignmentSchema.index({ activity: 1, assignedAt: -1 });
taskAssignmentSchema.index({ assignedBy: 1, assignedAt: -1 });
taskAssignmentSchema.index({ assignedTo: 1, assignedAt: -1 });

export default models.TaskAssignment ?? model<ITaskAssignment>("TaskAssignment", taskAssignmentSchema);
