import mongoose, { Schema, Document, Model } from "mongoose";

export type ProjectStatus = "active" | "completed" | "on_hold";

export interface IFundAllocation {
  source: string;       // donor / grant name (a funder)
  amount: number;       // in INR
  receivedAt?: Date;
  notes?: string;
}

/** A deliverable target within a funding phase (e.g. "File 40 cases"). */
export interface IProjectObjective {
  label: string;
  target?: number;   // numeric goal, if any (e.g. 40)
  current?: number;  // progress so far
  done?: boolean;
}

/** A funding phase — funders release money in tranches against objectives.
 *  e.g. DLF: ₹45L / 18 months split into phases, each unlocking on objectives. */
export interface IProjectPhase {
  _id?: mongoose.Types.ObjectId;
  name: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  status: "upcoming" | "active" | "completed";
  objectives: IProjectObjective[];
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
  phases: IProjectPhase[];
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

const objectiveSchema = new Schema<IProjectObjective>(
  {
    label:   { type: String, required: true, trim: true },
    target:  { type: Number, min: 0 },
    current: { type: Number, min: 0, default: 0 },
    done:    { type: Boolean, default: false },
  },
  { _id: true }
);

const phaseSchema = new Schema<IProjectPhase>(
  {
    name:       { type: String, required: true, trim: true },
    startDate:  Date,
    endDate:    Date,
    budget:     { type: Number, min: 0 },
    status:     { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
    objectives: { type: [objectiveSchema], default: [] },
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
    phases:      { type: [phaseSchema], default: [] },
    manager:     { type: Schema.Types.ObjectId, ref: "User" },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Project) {
  mongoose.deleteModel("Project");
}
const Project: Model<IProject> =
  (mongoose.models.Project as Model<IProject>) ||
  mongoose.model<IProject>("Project", projectSchema);

export default Project;
