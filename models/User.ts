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
  citizenProfile?: {
    govtIdUrl?: string;
    govtIdType?: "Aadhar" | "VoterId" | "Passport" | "DrivingLicense" | "Other";
    verificationStatus: "pending" | "verified" | "rejected";
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    rejectionReason?: string;
  };
  socialWorkerProfile?: {
    avgResolutionTimeDays: number;
    openTickets: number;
    resolvedTickets: number;
    slaBreaches: number;
    lastEodReportAt?: Date;
  };
  litigationProfile?: {
    barCouncilId?: string;
    activeCaseCount: number;
    location: { district: string; city: string };
    specialisation: string[];
  };
}

const citizenProfileSchema = new Schema(
  {
    govtIdUrl: String,
    govtIdType: {
      type: String,
      enum: ["Aadhar", "VoterId", "Passport", "DrivingLicense", "Other"],
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
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
    employeeId: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    joinedAt: Date,
    exitedAt: Date,
    citizenProfile: citizenProfileSchema,
    socialWorkerProfile: socialWorkerProfileSchema,
    litigationProfile: litigationProfileSchema,
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "litigationProfile.location.district": 1, "litigationProfile.activeCaseCount": 1 });
userSchema.index({ "citizenProfile.verificationStatus": 1 });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);

export default User;
