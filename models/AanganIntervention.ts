import mongoose, { Schema, Document, Model } from "mongoose";

/** An intervention/action taken for an Aangan child (CWC referral, bridge
 *  school, family counselling, …) tracked on the interventions board. */
export interface IAanganIntervention extends Document {
  child: mongoose.Types.ObjectId;
  type: string;
  stage: "planned" | "ongoing" | "resolved";
  date: Date;
  lead: string;
  createdBy?: mongoose.Types.ObjectId;
}

const schema = new Schema<IAanganIntervention>(
  {
    child:     { type: Schema.Types.ObjectId, ref: "AanganChild", required: true, index: true },
    type:      { type: String, required: true, trim: true },
    stage:     { type: String, enum: ["planned", "ongoing", "resolved"], default: "planned", index: true },
    date:      { type: Date, required: true },
    lead:      { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.AanganIntervention) {
  mongoose.deleteModel("AanganIntervention");
}
const AanganIntervention: Model<IAanganIntervention> =
  mongoose.models.AanganIntervention ?? mongoose.model<IAanganIntervention>("AanganIntervention", schema);
export default AanganIntervention;
