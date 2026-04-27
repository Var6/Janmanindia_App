import mongoose, { Schema, Document, Model } from "mongoose";

export type Role =
  | "community"
  | "socialworker"
  | "litigation"
  | "hr"
  | "finance"
  | "administrator"
  | "director"
  | "superadmin";

export interface IOnboardingDocs {
  panUrl?: string;
  aadharUrl?: string;
  bankAccount?: { holder?: string; accountNumber?: string; ifsc?: string; bankName?: string };
  cvUrl?: string;
  academicDocs?: { label: string; url: string }[];
  priorExperience?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  otherDocs?: { label: string; url: string }[];
  submittedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  employeeId?: string;
  joinedAt?: Date;
  exitedAt?: Date;
  onboardingDocs?: IOnboardingDocs;
  communityProfile?: {
    govtIdUrl?: string;
    govtIdType?: "Aadhar" | "VoterId" | "Passport" | "DrivingLicense" | "RationCard" | "Other";
    verificationStatus: "pending" | "verified" | "rejected";
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    rejectionReason?: string;
    district?: string;
    village?: string;
    assignedSocialWorker?: mongoose.Types.ObjectId;
    /** Optional voice introduction the SW listens to before assignment —
     *  helpful for community members who can't read or write. */
    voiceIntroUrl?: string;
    voiceIntroDurationSec?: number;
    preferredLanguage?: string;
    /** Para Legal Volunteer flow — community member opts in, social worker decides. */
    plvStatus?: "none" | "requested" | "approved" | "rejected";
    plvMotivation?: string;
    plvRequestedAt?: Date;
    plvDecidedBy?: mongoose.Types.ObjectId;
    plvDecidedAt?: Date;
    plvRejectionReason?: string;
  };
  socialWorkerProfile?: {
    avgResolutionTimeDays: number;
    openTickets: number;
    resolvedTickets: number;
    slaBreaches: number;
    lastEodReportAt?: Date;
    district?: string;
  };
  litigationProfile?: {
    barCouncilId?: string;
    activeCaseCount: number;
    location: { district: string; city: string };
    specialisation: string[];
  };
}

const communityProfileSchema = new Schema(
  {
    govtIdUrl: String,
    govtIdType: {
      type: String,
      enum: ["Aadhar", "VoterId", "Passport", "DrivingLicense", "RationCard", "Other"],
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
    district: { type: String, trim: true },
    village: { type: String, trim: true },
    assignedSocialWorker: { type: Schema.Types.ObjectId, ref: "User" },
    voiceIntroUrl: { type: String, trim: true },
    voiceIntroDurationSec: { type: Number, min: 0 },
    preferredLanguage: { type: String, trim: true },
    plvStatus:           { type: String, enum: ["none", "requested", "approved", "rejected"], default: "none" },
    plvMotivation:       { type: String, trim: true },
    plvRequestedAt:      Date,
    plvDecidedBy:        { type: Schema.Types.ObjectId, ref: "User" },
    plvDecidedAt:        Date,
    plvRejectionReason:  String,
  },
  { _id: false }
);

const socialWorkerProfileSchema = new Schema(
  {
    avgResolutionTimeDays: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    resolvedTickets: { type: Number, default: 0 },
    slaBreaches: { type: Number, default: 0 },
    lastEodReportAt: Date,
    district: { type: String, trim: true },
  },
  { _id: false }
);

const litigationProfileSchema = new Schema(
  {
    barCouncilId: String,
    activeCaseCount: { type: Number, default: 0 },
    location: {
      district: { type: String, default: "" },
      city: { type: String, default: "" },
    },
    specialisation: [String],
  },
  { _id: false }
);

const onboardingDocsSchema = new Schema(
  {
    panUrl:    { type: String, trim: true },
    aadharUrl: { type: String, trim: true },
    bankAccount: {
      holder:        { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifsc:          { type: String, trim: true, uppercase: true },
      bankName:      { type: String, trim: true },
    },
    cvUrl: { type: String, trim: true },
    academicDocs: [{ label: String, url: String }],
    priorExperience: { type: String, trim: true },
    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true },
    },
    otherDocs:   [{ label: String, url: String }],
    submittedAt: Date,
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"],
    },
    phone: String,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    employeeId: { type: String, unique: true, sparse: true, trim: true },
    joinedAt: Date,
    exitedAt: Date,
    communityProfile: communityProfileSchema,
    socialWorkerProfile: socialWorkerProfileSchema,
    litigationProfile: litigationProfileSchema,
    onboardingDocs: onboardingDocsSchema,
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "litigationProfile.location.district": 1, "litigationProfile.activeCaseCount": 1 });
userSchema.index({ "communityProfile.verificationStatus": 1 });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);

export default User;
