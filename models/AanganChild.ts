import mongoose, { Schema, Document, Model } from "mongoose";

/** A child tracked by the Aangan child-protection field module. */
export interface IAanganChild extends Document {
  name: string;
  age: number;
  gender: "F" | "M" | "O";
  village: string;
  district: string;
  /** Risk-marker keys (see RISK map in the Aangan UI). */
  risks: string[];
  concern: "low" | "medium" | "high" | "critical";
  /** Fieldworker responsible (free-text name for now). */
  fieldworker: string;
  lastVisitDate?: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const schema = new Schema<IAanganChild>(
  {
    name:        { type: String, required: true, trim: true },
    age:         { type: Number, min: 0, max: 25, default: 10 },
    gender:      { type: String, enum: ["F", "M", "O"], default: "F" },
    village:     { type: String, trim: true },
    district:    { type: String, trim: true, index: true },
    risks:       { type: [String], default: [] },
    concern:     { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    fieldworker: { type: String, trim: true },
    lastVisitDate: Date,
    createdBy:   { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.AanganChild) {
  mongoose.deleteModel("AanganChild");
}
const AanganChild: Model<IAanganChild> =
  mongoose.models.AanganChild ?? mongoose.model<IAanganChild>("AanganChild", schema);
export default AanganChild;
