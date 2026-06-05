import mongoose, { Schema, Document, Model } from "mongoose";

/** A community-facing resource entry:
 *  - "scheme"     — a government / social-security scheme (pension, housing,
 *                   ration, scholarship, etc.) a member may be entitled to.
 *  - "livelihood" — a livelihood / small-loan / NBFC option (e.g. financing a
 *                   rickshaw, a shop, a skilling course) the org can help with.
 *  Managed by staff (director / administrator / social worker); browsed by
 *  community members and PLVs. */
export type ResourceKind = "scheme" | "livelihood";

export interface IResource extends Document {
  kind: ResourceKind;
  title: string;
  description: string;
  category?: string;
  eligibility?: string;
  benefit?: string;
  howToApply?: string;
  link?: string;
  contactPhone?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    kind:         { type: String, enum: ["scheme", "livelihood"], required: true, index: true },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, required: true, trim: true },
    category:     { type: String, trim: true },
    eligibility:  { type: String, trim: true },
    benefit:      { type: String, trim: true },
    howToApply:   { type: String, trim: true },
    link:         { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isActive:     { type: Boolean, default: true, index: true },
    createdBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Resource) {
  mongoose.deleteModel("Resource");
}
const Resource: Model<IResource> =
  (mongoose.models.Resource as Model<IResource>) ||
  mongoose.model<IResource>("Resource", resourceSchema);

export default Resource;
