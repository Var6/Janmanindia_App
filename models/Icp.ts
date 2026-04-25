import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Individual Care Plan (ICP) — the official intake / rehabilitation document
 * the foundation uses for every case. One ICP per case. Pre-filled where
 * possible from the case + the community member's profile, then completed by
 * the social worker over time. Designed to mirror the printed PDF format so
 * the same data renders in-app and on paper.
 */

export type Religion  = "hindu" | "muslim" | "christian" | "sikh" | "buddhist" | "jain" | "other";
export type CasteCat  = "SC" | "ST" | "OBC" | "GEN";
export type Gender    = "male" | "female" | "other";

export interface IIcpFamilyMember {
  name?: string;
  age?: number;
  relationship?: string;
  education?: string;
  primaryOccupation?: string;
  primarySalaryPerMonth?: number;
  otherIncomeSource?: string;
  otherIncomePerMonth?: number;
  aspirations?: string;
  livelihoodSkills?: string;
  isPrimaryEarner?: boolean;
}

export interface IIcpIdCard {
  hasIt: boolean;
  issueDate?: Date;
  notes?: string;
}

export interface IIcp extends Document {
  case: mongoose.Types.ObjectId;          // 1:1 with a case
  community: mongoose.Types.ObjectId;     // beneficiary
  interviewer: mongoose.Types.ObjectId;   // SW who filled it
  interviewDate: Date;

  /* Basic info */
  beneficiaryName?: string;
  address?: string;
  phone?: string;
  village?: string;
  blockTaluka?: string;
  fatherOrHusbandName?: string;
  motherName?: string;
  gender?: Gender;
  ageYears?: number;
  dob?: Date;
  dobVerified?: boolean;
  religion?: Religion;
  casteCategory?: CasteCat;
  casteName?: string;
  tribeName?: string;

  /* Victim details */
  currentLocation?: string;             // home / relative / other
  currentLocationNotes?: string;
  schooling?: { inSchool: boolean; currentClass?: string; lastClassFinished?: string };
  specialNeeds?: { has: boolean; mental?: string; physical?: string; emotional?: string };
  substanceUse?: { uses: boolean; alcohol?: boolean; tobacco?: string; drugs?: boolean; details?: string };
  professionalSkills?: string[];
  appearance?: string[];                // shy / confident / unhappy / etc
  appearanceNotes?: string;
  criminalNetwork?: { linked: boolean; details?: string };
  nutrition?: { mealsPerDay?: number; ingredients?: string };
  abuseHistory?: {
    clingy?: boolean;
    fearOfSpaces?: boolean;
    fearOfPeople?: boolean;
    unexplainedBruises?: boolean;
    soreness?: boolean;
    nonResponsive?: boolean;
    inTrauma?: boolean;
    other?: string;
    none?: boolean;
    details?: string;
  };
  medicalIntervention?: {
    needs: boolean;
    skin?: boolean;
    dental?: boolean;
    heart?: boolean;
    respiratory?: boolean;
    abdomen?: boolean;
    other?: string;
    workInjury?: string;
    nonWorkInjury?: string;
  };
  hygiene?: { nailsClean?: boolean; otherIssues?: string; sanitationFacility?: boolean; observations?: string };
  missingPersonCase?: { filed: boolean; filedWhere?: string; filedBy?: string; willingToFile?: boolean; complaintAgainst?: string };
  victimSkills?: string;
  victimCurrentOccupation?: string;
  victimCurrentEarning?: number;
  victimAssessment?: string;
  victimAspirations?: string;

  /* Family */
  familyMembers: IIcpFamilyMember[];
  primaryBreadwinnerNotes?: string;
  widow?: { present: boolean; receivesPension?: boolean; pensionAmount?: number; pensionFrequency?: string; interventionNeeded?: string };
  familyAddiction?: { present: boolean; relationship?: string; alcohol?: boolean; tobacco?: string; drugs?: boolean; details?: string };
  familyHealth?: { present: boolean; relationship?: string; symptoms?: string; durationDescription?: string };
  familySpecialNeeds?: { present: boolean; relationship?: string; description?: string };
  recentShocks?: { occurred: boolean; description?: string; loanTaken?: boolean; loanAmount?: number; impact?: string };
  bankAccount?: { hasOne: boolean; bankName?: string; accountNumber?: string };
  credit?: { type?: "formal" | "informal" | "none"; lender?: string; amount?: number; interestRate?: string; repaid?: number; repaymentMethod?: string; assessment?: string };
  land?: { ownsLand: boolean; sizeAcres?: number; usage?: string; ecScope?: boolean; ecScopeNotes?: string };
  livelihoodResources?: {
    livestock?: string;
    skills?: string;
    naturalResources?: string;
    vocationalTraining?: string;
    nearbyIndustry?: string;
    industryDistanceKm?: number;
    industryNotes?: string;
    upcomingConstruction?: string;
  };
  supportMembership?: string;
  migration?: {
    pattern?: "none" | "seasonal" | "permanent";
    seasonMonths?: string;
    destination?: string;
    workType?: string;
    monthlyEarning?: number;
    whoMigrates?: string;
    willingToMigrate?: boolean;
    willingState?: "within" | "outside" | "either";
    assessment?: string;
  };
  counseling?: { health?: boolean; emotional?: boolean; observations?: string };
  schemes?: {
    needsLinkage?: string[];     // ["IAY", "BPL", "MGNREGA", "PDS", "Disability Pension", ...]
    awareness?: string[];        // ["MidDayMeal-Anganwadi", "MidDayMeal-Govt", "School Uniform", ...]
    govtBodyEffectiveness?: string;
    assessment?: string;
  };

  /* Community */
  community_context?: {
    droughtLastFiveYears?: boolean;
    floodLastFiveYears?: boolean;
    access?: {
      newspaper?: boolean; tv?: boolean; mobile?: boolean; radio?: boolean;
      schoolDistanceKm?: number; safeWater?: boolean; electricity?: boolean;
      sanitation?: boolean; bank?: string; policeStation?: boolean; rationShop?: boolean;
      communityHall?: boolean; communityLand?: boolean; marketDistanceKm?: number;
      postOffice?: boolean; roadTransport?: boolean; healthCentreDistanceKm?: number; icds?: boolean;
    };
    childrenLeftForWork?: { below14?: number; age15to17?: number; age18plus?: number; workType?: string; goWith?: string; earning?: number; destinations?: string };
  };

  /* Identity cards + compensation */
  idCards?: {
    birthCertificate?: IIcpIdCard;
    schoolCertificate?: IIcpIdCard;
    casteCertificate?: IIcpIdCard;
    bplCard?: IIcpIdCard;
    disabilityCertificate?: IIcpIdCard;
    immunizationCard?: IIcpIdCard;
    rationCard?: IIcpIdCard;
    aadhaarCard?: IIcpIdCard;
    govtCompensation?: IIcpIdCard;
  };

  /* Plans */
  shortTermPlan?: string;
  longTermPlan?: string;

  status: "draft" | "complete" | "archived";
  finalisedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const familyMemberSchema = new Schema<IIcpFamilyMember>(
  {
    name: String, age: Number, relationship: String, education: String,
    primaryOccupation: String, primarySalaryPerMonth: Number,
    otherIncomeSource: String, otherIncomePerMonth: Number,
    aspirations: String, livelihoodSkills: String,
    isPrimaryEarner: { type: Boolean, default: false },
  },
  { _id: true }
);

const idCardSchema = new Schema<IIcpIdCard>({ hasIt: Boolean, issueDate: Date, notes: String }, { _id: false });

const icpSchema = new Schema<IIcp>(
  {
    case:        { type: Schema.Types.ObjectId, ref: "Case", required: true, unique: true, index: true },
    community:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    interviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    interviewDate: { type: Date, default: Date.now },

    beneficiaryName: String, address: String, phone: String,
    village: String, blockTaluka: String,
    fatherOrHusbandName: String, motherName: String,
    gender: { type: String, enum: ["male", "female", "other"] },
    ageYears: Number, dob: Date, dobVerified: Boolean,
    religion: { type: String, enum: ["hindu", "muslim", "christian", "sikh", "buddhist", "jain", "other"] },
    casteCategory: { type: String, enum: ["SC", "ST", "OBC", "GEN"] },
    casteName: String, tribeName: String,

    currentLocation: String,
    currentLocationNotes: String,
    schooling: { inSchool: Boolean, currentClass: String, lastClassFinished: String },
    specialNeeds: { has: Boolean, mental: String, physical: String, emotional: String },
    substanceUse: { uses: Boolean, alcohol: Boolean, tobacco: String, drugs: Boolean, details: String },
    professionalSkills: [String],
    appearance: [String],
    appearanceNotes: String,
    criminalNetwork: { linked: Boolean, details: String },
    nutrition: { mealsPerDay: Number, ingredients: String },
    abuseHistory: {
      clingy: Boolean, fearOfSpaces: Boolean, fearOfPeople: Boolean,
      unexplainedBruises: Boolean, soreness: Boolean, nonResponsive: Boolean,
      inTrauma: Boolean, other: String, none: Boolean, details: String,
    },
    medicalIntervention: {
      needs: Boolean, skin: Boolean, dental: Boolean, heart: Boolean,
      respiratory: Boolean, abdomen: Boolean, other: String,
      workInjury: String, nonWorkInjury: String,
    },
    hygiene: { nailsClean: Boolean, otherIssues: String, sanitationFacility: Boolean, observations: String },
    missingPersonCase: { filed: Boolean, filedWhere: String, filedBy: String, willingToFile: Boolean, complaintAgainst: String },
    victimSkills: String, victimCurrentOccupation: String, victimCurrentEarning: Number,
    victimAssessment: String, victimAspirations: String,

    familyMembers: [familyMemberSchema],
    primaryBreadwinnerNotes: String,
    widow: { present: Boolean, receivesPension: Boolean, pensionAmount: Number, pensionFrequency: String, interventionNeeded: String },
    familyAddiction: { present: Boolean, relationship: String, alcohol: Boolean, tobacco: String, drugs: Boolean, details: String },
    familyHealth: { present: Boolean, relationship: String, symptoms: String, durationDescription: String },
    familySpecialNeeds: { present: Boolean, relationship: String, description: String },
    recentShocks: { occurred: Boolean, description: String, loanTaken: Boolean, loanAmount: Number, impact: String },
    bankAccount: { hasOne: Boolean, bankName: String, accountNumber: String },
    credit: {
      type: { type: String, enum: ["formal", "informal", "none"] },
      lender: String, amount: Number, interestRate: String,
      repaid: Number, repaymentMethod: String, assessment: String,
    },
    land: { ownsLand: Boolean, sizeAcres: Number, usage: String, ecScope: Boolean, ecScopeNotes: String },
    livelihoodResources: {
      livestock: String, skills: String, naturalResources: String,
      vocationalTraining: String, nearbyIndustry: String,
      industryDistanceKm: Number, industryNotes: String, upcomingConstruction: String,
    },
    supportMembership: String,
    migration: {
      pattern: { type: String, enum: ["none", "seasonal", "permanent"] },
      seasonMonths: String, destination: String, workType: String,
      monthlyEarning: Number, whoMigrates: String,
      willingToMigrate: Boolean, willingState: { type: String, enum: ["within", "outside", "either"] },
      assessment: String,
    },
    counseling: { health: Boolean, emotional: Boolean, observations: String },
    schemes: {
      needsLinkage: [String], awareness: [String],
      govtBodyEffectiveness: String, assessment: String,
    },

    community_context: {
      droughtLastFiveYears: Boolean, floodLastFiveYears: Boolean,
      access: {
        newspaper: Boolean, tv: Boolean, mobile: Boolean, radio: Boolean,
        schoolDistanceKm: Number, safeWater: Boolean, electricity: Boolean,
        sanitation: Boolean, bank: String, policeStation: Boolean, rationShop: Boolean,
        communityHall: Boolean, communityLand: Boolean, marketDistanceKm: Number,
        postOffice: Boolean, roadTransport: Boolean, healthCentreDistanceKm: Number, icds: Boolean,
      },
      childrenLeftForWork: { below14: Number, age15to17: Number, age18plus: Number, workType: String, goWith: String, earning: Number, destinations: String },
    },

    idCards: {
      birthCertificate: idCardSchema, schoolCertificate: idCardSchema,
      casteCertificate: idCardSchema, bplCard: idCardSchema,
      disabilityCertificate: idCardSchema, immunizationCard: idCardSchema,
      rationCard: idCardSchema, aadhaarCard: idCardSchema, govtCompensation: idCardSchema,
    },

    shortTermPlan: String,
    longTermPlan: String,

    status: { type: String, enum: ["draft", "complete", "archived"], default: "draft", index: true },
    finalisedAt: Date,
  },
  { timestamps: true }
);

const Icp: Model<IIcp> =
  (mongoose.models.Icp as Model<IIcp>) ||
  mongoose.model<IIcp>("Icp", icpSchema);

export default Icp;
