import mongoose, { Schema, Document, Model } from "mongoose";

export type ProjectStatus = "active" | "completed" | "on_hold";

export interface IFundAllocation {
  source: string;       // donor / grant name
  amount: number;       // in INR
  receivedAt?: Date;
  notes?: string;
}

export interface IProject extends Document {
  /** 3-letter code (e.g. "JNA") — matches the employee-id project code so
   *  staff onboarded under it count against this project. */
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  totalBudget: number;
  allocations: IFundAllocation[];
  manager?: mongoose.Types.ObjectId;     // who runs the project on the ground
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fundAllocationSchema = new Schema<IFundAllocation>(
  {
    source:     { type: String, required: true, trim: true },
    amount:     { type: Number, required: true, min: 0 },
    receivedAt: Date,
    notes:      { type: String, trim: true },
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status:      { type: String, enum: ["active", "completed", "on_hold"], default: "active", index: true },
    startDate:   Date,
    endDate:     Date,
    totalBudget: { type: Number, required: true, min: 0, default: 0 },
    allocations: [fundAllocationSchema],
    manager:     { type: Schema.Types.ObjectId, ref: "User" },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Project: Model<IProject> =
  (mongoose.models.Project as Model<IProject>) ||
  mongoose.model<IProject>("Project", projectSchema);

export default Project;
