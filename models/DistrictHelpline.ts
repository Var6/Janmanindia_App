import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDistrictHelpline extends Document {
  district: string;
  primaryName: string;
  primaryPhone: string;
  secondaryName?: string;
  secondaryPhone?: string;
  notes?: string;
  setBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const districtHelplineSchema = new Schema<IDistrictHelpline>(
  {
    district:       { type: String, required: true, unique: true, trim: true, index: true },
    primaryName:    { type: String, required: true, trim: true },
    primaryPhone:   { type: String, required: true, trim: true },
    secondaryName:  { type: String, trim: true },
    secondaryPhone: { type: String, trim: true },
    notes:          { type: String, trim: true },
    setBy:          { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const DistrictHelpline: Model<IDistrictHelpline> =
  (mongoose.models.DistrictHelpline as Model<IDistrictHelpline>) ||
  mongoose.model<IDistrictHelpline>("DistrictHelpline", districtHelplineSchema);

export default DistrictHelpline;
