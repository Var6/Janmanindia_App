import mongoose, { Schema, model, models, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  employee: Types.ObjectId;
  date: Date;           // stored as midnight UTC of the day
  status: "present" | "absent" | "late" | "half-day";
  markedBy: Types.ObjectId;
  markedAt: Date;
  notes?: string;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employee:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    date:      { type: Date, required: true },
    status:    { type: String, enum: ["present", "absent", "late", "half-day"], required: true },
    markedBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    markedAt:  { type: Date, default: Date.now },
    notes:     { type: String },
  },
  { timestamps: false }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default models.Attendance ?? model<IAttendance>("Attendance", attendanceSchema);
