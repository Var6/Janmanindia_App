import mongoose, { Schema, Document, Model } from "mongoose";

export type CarePlanCategory =
  | "counselling"
  | "medical"
  | "shelter"
  | "education"
  | "rehabilitation"
  | "legal_support"
  | "financial_aid"
  | "other";

export type CarePlanPriority = "low" | "medium" | "high" | "critical";
export type CarePlanStatus   = "active" | "on_hold" | "completed" | "cancelled";
export type CareSessionType  = "phone" | "in_person" | "video" | "home_visit";

export interface ICareGoal {
  description: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface ICareSession {
  date: Date;
  type: CareSessionType;
  notes: string;
  conductedBy: mongoose.Types.ObjectId;
}

export interface ICarePlan extends Document {
  community: mongoose.Types.ObjectId;          // person being supported
  case?: mongoose.Types.ObjectId;              // optional — anchored to a case
  createdBy: mongoose.Types.ObjectId;          // social worker who initiated
  title: string;
  category: CarePlanCategory;
  priority: CarePlanPriority;
  status: CarePlanStatus;
  summary: string;                             // why this plan exists
  goals: ICareGoal[];
  sessions: ICareSession[];
  referredTo?: string;                         // external service / specialist
  confidentialNotes?: string;                  // SW-only
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const careGoalSchema = new Schema<ICareGoal>(
  {
    description: { type: String, required: true, trim: true },
    targetDate:  Date,
    completed:   { type: Boolean, default: false },
    completedAt: Date,
  },
  { _id: true }
);

const careSessionSchema = new Schema<ICareSession>(
  {
    date:        { type: Date, required: true },
    type:        { type: String, enum: ["phone", "in_person", "video", "home_visit"], required: true },
    notes:       { type: String, required: true, trim: true },
    conductedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true }
);

const carePlanSchema = new Schema<ICarePlan>(
  {
    community:  { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    case:       { type: Schema.Types.ObjectId, ref: "Case", index: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    title:      { type: String, required: true, trim: true, maxlength: 200 },
    category:   {
      type: String,
      enum: ["counselling", "medical", "shelter", "education", "rehabilitation", "legal_support", "financial_aid", "other"],
      required: true,
    },
    priority:   { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    status:     { type: String, enum: ["active", "on_hold", "completed", "cancelled"], default: "active", index: true },
    summary:    { type: String, required: true, trim: true },
    goals:      [careGoalSchema],
    sessions:   [careSessionSchema],
    referredTo: { type: String, trim: true },
    confidentialNotes: { type: String, trim: true },
    closedAt:   Date,
  },
  { timestamps: true }
);

carePlanSchema.index({ community: 1, status: 1 });
carePlanSchema.index({ case: 1, status: 1 });

const CarePlan: Model<ICarePlan> =
  (mongoose.models.CarePlan as Model<ICarePlan>) ||
  mongoose.model<ICarePlan>("CarePlan", carePlanSchema);

export default CarePlan;
