import mongoose, { Schema, Document, Model } from "mongoose";

export type TrainingSessionStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export interface ITrainingEnrollment {
  user: mongoose.Types.ObjectId;
  enrolledAt: Date;
  attended?: boolean;
}

export interface ITrainingSession extends Document {
  title: string;
  description: string;
  topics: string[];
  venue: string;
  district?: string;
  date: Date;
  endDate?: Date;
  capacity: number;
  conductedBy: mongoose.Types.ObjectId;
  facilitators?: string;            // free-text co-facilitators
  targetAudience?: string;
  language?: string;
  enrollments: ITrainingEnrollment[];
  status: TrainingSessionStatus;
  highlights?: string;              // post-session summary
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<ITrainingEnrollment>(
  {
    user:       { type: Schema.Types.ObjectId, ref: "User", required: true },
    enrolledAt: { type: Date, default: Date.now },
    attended:   Boolean,
  },
  { _id: true }
);

const trainingSessionSchema = new Schema<ITrainingSession>(
  {
    title:           { type: String, required: true, trim: true, maxlength: 200 },
    description:     { type: String, required: true, trim: true },
    topics:          [{ type: String, trim: true }],
    venue:           { type: String, required: true, trim: true },
    district:        { type: String, trim: true, index: true },
    date:            { type: Date, required: true, index: true },
    endDate:         Date,
    capacity:        { type: Number, default: 30, min: 1 },
    conductedBy:     { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    facilitators:    { type: String, trim: true },
    targetAudience:  { type: String, trim: true },
    language:        { type: String, trim: true, default: "Hindi & English" },
    enrollments:     [enrollmentSchema],
    status:          { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled", index: true },
    highlights:      { type: String, trim: true },
  },
  { timestamps: true }
);

trainingSessionSchema.index({ date: 1, status: 1 });

const TrainingSession: Model<ITrainingSession> =
  (mongoose.models.TrainingSession as Model<ITrainingSession>) ||
  mongoose.model<ITrainingSession>("TrainingSession", trainingSessionSchema);

export default TrainingSession;
