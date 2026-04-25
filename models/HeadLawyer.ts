import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Director assigns one head lawyer per district. The head lawyer approves
 * litigation invoices in their district after HR has verified them. If a
 * litigation member's district has no head lawyer, the director approves directly.
 */
export interface IHeadLawyer extends Document {
  district: string;
  user: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const headLawyerSchema = new Schema<IHeadLawyer>(
  {
    district:   { type: String, required: true, unique: true, trim: true, index: true },
    user:       { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes:      { type: String, trim: true },
  },
  { timestamps: true }
);

const HeadLawyer: Model<IHeadLawyer> =
  (mongoose.models.HeadLawyer as Model<IHeadLawyer>) ||
  mongoose.model<IHeadLawyer>("HeadLawyer", headLawyerSchema);

export default HeadLawyer;
