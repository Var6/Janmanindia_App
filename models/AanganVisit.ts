import mongoose, { Schema, Document, Model } from "mongoose";

/** A home visit logged against an Aangan child. */
export interface IAanganVisit extends Document {
  child: mongoose.Types.ObjectId;
  date: Date;
  fieldworker: string;
  concern: "low" | "medium" | "high" | "critical";
  note: string;
  createdBy?: mongoose.Types.ObjectId;
}

const schema = new Schema<IAanganVisit>(
  {
    child:       { type: Schema.Types.ObjectId, ref: "AanganChild", required: true, index: true },
    date:        { type: Date, required: true },
    fieldworker: { type: String, trim: true },
    concern:     { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    note:        { type: String, trim: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.AanganVisit) {
  mongoose.deleteModel("AanganVisit");
}
const AanganVisit: Model<IAanganVisit> =
  mongoose.models.AanganVisit ?? mongoose.model<IAanganVisit>("AanganVisit", schema);
export default AanganVisit;
