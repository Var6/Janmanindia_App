import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Daily Social Worker Report — the foundation's official end-of-day record
 * for survivor / victim cases. One report per (preparedBy, reportDate).
 * Mirrors the printed PDF section-by-section so the in-app form and the
 * printed/PDF copy stay in sync.
 *
 * Section A: reporting details
 * Section B: daily counters (auto-derivable from C, but stored as a snapshot)
 * Section C: case-wise activity rows
 * Section D: support-category checklist (free-form arrays, four buckets)
 * Section E: urgent escalations (table)
 * Section F: narrative notes
 * Section G: declaration / signature / supervisor review
 */

export type ReportStatus     = "draft" | "submitted" | "reviewed";
export type ContactMode      = "home_visit" | "phone" | "office" | "court" | "police" | "hospital" | "department" | "other";
export type RiskLevel        = "low" | "medium" | "high" | "immediate";

export interface IDailyCaseRow {
  case?: mongoose.Types.ObjectId;     // optional FK to Case (typeahead-picked)
  caseNumber?: string;                // snapshot for the printed copy
  clientCode?: string;
  caseType?: string;
  modeOfContact?: ContactMode;
  workDoneToday?: string;
  schemeLinkage?: string;             // scheme name, dept, application #, status
  rehabSupport?: string;              // shelter, compensation, education, livelihood, health, documents
  counsellingSupport?: string;
  legalAidCoordination?: string;      // lawyer contacted, court date, FIR, statement, documents
  networkingReferral?: string;
  riskSafety?: string;                // threat, pressure, non-cooperation, urgent need
  outcomeNextAction?: string;
}

export interface IDailyEscalationRow {
  case?: mongoose.Types.ObjectId;
  caseNumber?: string;
  issue?: string;
  riskLevel?: RiskLevel;
  actionRequested?: string;
  deadline?: Date;
  status?: string;
}

export interface IDailyReport extends Document {
  preparedBy: mongoose.Types.ObjectId;        // SW
  reportDate: Date;
  districtBlock?: string;

  summary: {
    totalCases?: number;
    newCases?: number;
    homeFieldVisits?: number;
    phoneFollowUps?: number;
    schemeApps?: number;
    urgentFlagged?: number;
    counsellingSessions?: number;
    legalAidFollowUps?: number;
    networkingMeetings?: number;
    documentsCollectedSubmitted?: number;
    rehabActions?: number;
    needSupervisorReview?: number;
  };

  caseRows: IDailyCaseRow[];

  supportChecklist: {
    legalAid: string[];                       // Section D — column 1 selections
    schemeLinkage: string[];                  // column 2
    rehabilitation: string[];                 // column 3
    counsellingProtection: string[];          // column 4
  };

  escalations: IDailyEscalationRow[];

  narrativeNotes?: string;

  signatureUrl?: string;                      // uploaded signature image (optional)
  submittedAt?: Date;
  supervisor?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  supervisorRemarks?: string;

  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const dailyCaseRowSchema = new Schema<IDailyCaseRow>(
  {
    case:                 { type: Schema.Types.ObjectId, ref: "Case" },
    caseNumber:           String,
    clientCode:           String,
    caseType:             String,
    modeOfContact:        { type: String, enum: ["home_visit", "phone", "office", "court", "police", "hospital", "department", "other"] },
    workDoneToday:        String,
    schemeLinkage:        String,
    rehabSupport:         String,
    counsellingSupport:   String,
    legalAidCoordination: String,
    networkingReferral:   String,
    riskSafety:           String,
    outcomeNextAction:    String,
  },
  { _id: true }
);

const dailyEscalationRowSchema = new Schema<IDailyEscalationRow>(
  {
    case:            { type: Schema.Types.ObjectId, ref: "Case" },
    caseNumber:      String,
    issue:           String,
    riskLevel:       { type: String, enum: ["low", "medium", "high", "immediate"] },
    actionRequested: String,
    deadline:        Date,
    status:          String,
  },
  { _id: true }
);

const dailyReportSchema = new Schema<IDailyReport>(
  {
    preparedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportDate:    { type: Date, required: true, index: true },
    districtBlock: String,

    summary: {
      totalCases:                   { type: Number, default: 0 },
      newCases:                     { type: Number, default: 0 },
      homeFieldVisits:              { type: Number, default: 0 },
      phoneFollowUps:               { type: Number, default: 0 },
      schemeApps:                   { type: Number, default: 0 },
      urgentFlagged:                { type: Number, default: 0 },
      counsellingSessions:          { type: Number, default: 0 },
      legalAidFollowUps:            { type: Number, default: 0 },
      networkingMeetings:           { type: Number, default: 0 },
      documentsCollectedSubmitted:  { type: Number, default: 0 },
      rehabActions:                 { type: Number, default: 0 },
      needSupervisorReview:         { type: Number, default: 0 },
    },

    caseRows: [dailyCaseRowSchema],

    supportChecklist: {
      legalAid:              [String],
      schemeLinkage:         [String],
      rehabilitation:        [String],
      counsellingProtection: [String],
    },

    escalations: [dailyEscalationRowSchema],

    narrativeNotes:    String,

    signatureUrl:      String,
    submittedAt:       Date,
    supervisor:        { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt:        Date,
    supervisorRemarks: String,

    status: { type: String, enum: ["draft", "submitted", "reviewed"], default: "draft", index: true },
  },
  { timestamps: true }
);

// One report per SW per date — keeps "today's report" predictable.
dailyReportSchema.index({ preparedBy: 1, reportDate: 1 }, { unique: true });

const DailyReport: Model<IDailyReport> =
  (mongoose.models.DailyReport as Model<IDailyReport>) ||
  mongoose.model<IDailyReport>("DailyReport", dailyReportSchema);

export default DailyReport;
