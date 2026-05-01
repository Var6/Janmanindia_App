import mongoose, { Schema, Document, Model } from "mongoose";

export type CaseStatus = "Open" | "Closed" | "Escalated" | "Pending" | "Dismissed";
export type CasePath = "criminal" | "highcourt";
export type OcrStatus = "pending" | "processing" | "processed" | "failed";

export interface IDocument {
  label: string;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  ocrStatus: OcrStatus;
  ocrText?: string;
  ocrProcessedAt?: Date;
}

export interface IDiaryEntry {
  date: Date;
  findings: string;
  writtenBy: mongoose.Types.ObjectId;
}

export interface IWitness {
  name: string;
  depositionUrl?: string;
  deposedAt?: Date;
}

export interface IHighCourtStep {
  filed: boolean;
  filedAt?: Date;
  doc?: IDocument;
  notes?: string;
}

/** Intake-time facts gathered when the case is first reported. Modelled on
 *  the original Janman "Case Enquiry" Google Form so social workers receive
 *  the same structured information they used to collect on paper. */
export interface IEnquiry {
  filerName?: string;
  filerPhone?: string;
  relationshipWithVictim?: string;
  victimName?: string;
  victimAddress?: string;
  /** Phone / email for the victim or a relative the lawyer can call. Often
   *  different from `filerPhone` when a paralegal or NGO worker is filing. */
  victimContact?: string;
  /** What the victim feels happened — orthogonal to the legal procedure
   *  (`caseType`). Multi-select from `lib/case-issues.ts`. */
  issues?: string[];
  accusedNames?: string;
  accusedCount?: number;
  factsOfTheCase?: string;
  firNumber?: string;
  policeStation?: string;
  placeOfOccurrence?: string;
  incidentDateTime?: Date;
}

/** Audit log entry — one row per mutation made to the case. Multiple
 *  people work on a single case (community → social worker → lawyer →
 *  director); the log answers "who did what when" without needing to
 *  diff two versions of the document. */
export interface IAuditEntry {
  /** Stable action key — e.g. "stage_advance", "stage_revert", "diary_added",
   *  "doc_uploaded", "appearance_logged", "status_changed", "metadata_updated". */
  action: string;
  /** Human-readable summary the UI renders verbatim. e.g.
   *  "Marked Chargesheet Filed done", "Uploaded FIR.pdf to FIR Document",
   *  "Status changed: Open → Pending". */
  summary: string;
  by: mongoose.Types.ObjectId;
  /** Cached role at the time of the action, so we can render audit rows
   *  without a join. Populated from session.role on the server. */
  byRole?: string;
  at: Date;
}

/** A single court appearance entry. Mirrors the Janman District Legal
 *  Fellowship Court Appearance Google Form so litigation members can record
 *  per-hearing notes without leaving the app. */
export interface ICourtAppearance {
  date: Date;
  currentStatus?: string;
  dailyOrderBrief: string;
  lastHearingDate?: Date;
  nextHearingDate?: Date;
  remarks?: string;
  loggedBy: mongoose.Types.ObjectId;
  loggedAt: Date;
}

export interface ICase extends Document {
  caseTitle: string;
  caseNumber: string;
  status: CaseStatus;
  path: CasePath;
  /** eCourts-style short code (e.g. "WP(C)", "FIR", "MACT", "POCSO"). */
  caseType?: string;
  /** District the matter is registered in (one of the Janman fellowship
   *  districts — Araria, Bhagalpur, Katihar, Kishanganj, Patna, Purnia). */
  district?: string;
  /** Court-side cause title — "Plaintiff vs Defendant" — distinct from the
   *  internal `caseTitle` which is a one-line description. */
  causeTitle?: string;
  /** Court's own case / registration number (e.g. "GR 123/2026"). Distinct
   *  from `caseNumber` which is the internal Janman tracker (JMI-…). */
  courtCaseNumber?: string;
  /** Name of the court where the matter is pending (e.g. "CJM Court, Patna",
   *  "Sessions Court, Purnia", "Patna High Court"). */
  courtName?: string;
  /** IPC / BNS / special-act sections charged. Free text since real-world
   *  charge sheets list multiple acts in inconsistent formats. */
  relevantSections?: string;
  /** Bail status + accused-appearance status, mirroring the District Legal
   *  Fellow Case Management form's combined field. Free-text on purpose. */
  bailAndAppearanceStatus?: string;
  /** Stage of the case (pre-trial, evidence, arguments, judgment, appeal). */
  stage?: string;
  /** Whether compensation has been awarded / disbursed in this matter. Free
   *  text so the lawyer can capture amount, status, and date in one line. */
  compensationStatus?: string;
  community: mongoose.Types.ObjectId;
  litigationMember?: mongoose.Types.ObjectId;
  socialWorker?: mongoose.Types.ObjectId;
  nextHearingDate?: Date;
  googleCalendarEventId?: string;
  documents: IDocument[];
  caseDiary: IDiaryEntry[];
  enquiry?: IEnquiry;
  courtAppearances: ICourtAppearance[];
  /** Append-only history of who did what to this case. */
  auditLog: IAuditEntry[];

  /** True when the case was registered for tracking purposes (it was already
   *  underway elsewhere — police station, lower court — when it landed in
   *  Janman). Lets the dashboard separate "we filed this" from "we're
   *  monitoring this". */
  isExistingCase?: boolean;
  /** Where the case is right now in real-world terms — free text entered at
   *  creation ("FIR filed at Patna Bypass PS, awaiting chargesheet"). */
  currentStep?: string;
  /** Free-form notes capturing the history before Janman got involved. */
  existingNotes?: string;

  // Criminal path
  criminalPath?: {
    firFiled: boolean;
    firDoc?: IDocument;
    chargesheetDueDate?: Date;
    chargesheetFiled: boolean;
    chargesheetDate?: Date;
    chargesheetAlertSent: boolean;
    cognizanceOrderDoc?: IDocument;
    chargesFramed: boolean;
    chargeDocs: IDocument[];
    trial: {
      prosecutionWitnesses: IWitness[];
      defenseWitnesses: IWitness[];
      evidenceDocs: IDocument[];
      forensicDocs: IDocument[];
    };
    verdict?: string;
    verdictDate?: Date;
  };

  // High Court path
  highCourtPath?: {
    petitionFiled: IHighCourtStep;
    supportingAffidavit: IHighCourtStep;
    admission: IHighCourtStep;
    counterAffidavit: IHighCourtStep;
    rejoinder: IHighCourtStep;
    pleaClose: IHighCourtStep;
    inducement: IHighCourtStep;
  };
}

const documentSchema = new Schema<IDocument>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
    ocrStatus: {
      type: String,
      enum: ["pending", "processing", "processed", "failed"],
      default: "pending",
    },
    ocrText: String,
    ocrProcessedAt: Date,
  },
  { _id: true }
);

const diaryEntrySchema = new Schema<IDiaryEntry>(
  {
    date: { type: Date, required: true },
    findings: { type: String, required: true },
    writtenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true }
);

const witnessSchema = new Schema<IWitness>(
  {
    name: { type: String, required: true },
    depositionUrl: String,
    deposedAt: Date,
  },
  { _id: true }
);

const enquirySchema = new Schema<IEnquiry>(
  {
    filerName: { type: String, trim: true },
    filerPhone: { type: String, trim: true },
    relationshipWithVictim: { type: String, trim: true },
    victimName: { type: String, trim: true },
    victimAddress: { type: String, trim: true },
    victimContact: { type: String, trim: true },
    issues: { type: [String], default: undefined },
    accusedNames: { type: String, trim: true },
    accusedCount: { type: Number, min: 0 },
    factsOfTheCase: { type: String, trim: true },
    firNumber: { type: String, trim: true },
    policeStation: { type: String, trim: true },
    placeOfOccurrence: { type: String, trim: true },
    incidentDateTime: Date,
  },
  { _id: false }
);

const courtAppearanceSchema = new Schema<ICourtAppearance>(
  {
    date: { type: Date, required: true },
    currentStatus: { type: String, trim: true },
    dailyOrderBrief: { type: String, required: true, trim: true },
    lastHearingDate: Date,
    nextHearingDate: Date,
    remarks: { type: String, trim: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const auditEntrySchema = new Schema<IAuditEntry>(
  {
    action:  { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    by:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    byRole:  { type: String, trim: true },
    at:      { type: Date, default: Date.now },
  },
  { _id: true }
);

const highCourtStepSchema = new Schema<IHighCourtStep>(
  {
    filed: { type: Boolean, default: false },
    filedAt: Date,
    doc: documentSchema,
    notes: String,
  },
  { _id: false }
);

const criminalPathSchema = new Schema(
  {
    firFiled: { type: Boolean, default: false },
    firDoc: documentSchema,
    chargesheetDueDate: Date,
    chargesheetFiled: { type: Boolean, default: false },
    chargesheetDate: Date,
    chargesheetAlertSent: { type: Boolean, default: false },
    cognizanceOrderDoc: documentSchema,
    chargesFramed: { type: Boolean, default: false },
    chargeDocs: [documentSchema],
    trial: {
      prosecutionWitnesses: [witnessSchema],
      defenseWitnesses: [witnessSchema],
      evidenceDocs: [documentSchema],
      forensicDocs: [documentSchema],
    },
    verdict: String,
    verdictDate: Date,
  },
  { _id: false }
);

const highCourtPathSchema = new Schema(
  {
    petitionFiled: highCourtStepSchema,
    supportingAffidavit: highCourtStepSchema,
    admission: highCourtStepSchema,
    counterAffidavit: highCourtStepSchema,
    rejoinder: highCourtStepSchema,
    pleaClose: highCourtStepSchema,
    inducement: highCourtStepSchema,
  },
  { _id: false }
);

const caseSchema = new Schema<ICase>(
  {
    caseTitle: { type: String, required: true },
    caseNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["Open", "Closed", "Escalated", "Pending", "Dismissed"],
      default: "Open",
    },
    path: { type: String, enum: ["criminal", "highcourt"], required: true },
    caseType: { type: String, trim: true, index: true },
    district: { type: String, trim: true, index: true },
    causeTitle: { type: String, trim: true },
    courtCaseNumber: { type: String, trim: true, index: true },
    courtName: { type: String, trim: true },
    relevantSections: { type: String, trim: true },
    bailAndAppearanceStatus: { type: String, trim: true },
    stage: { type: String, trim: true },
    compensationStatus: { type: String, trim: true },
    community: { type: Schema.Types.ObjectId, ref: "User", required: true },
    litigationMember: { type: Schema.Types.ObjectId, ref: "User" },
    socialWorker: { type: Schema.Types.ObjectId, ref: "User" },
    nextHearingDate: Date,
    googleCalendarEventId: String,
    documents: [documentSchema],
    caseDiary: [diaryEntrySchema],
    enquiry: enquirySchema,
    courtAppearances: { type: [courtAppearanceSchema], default: [] },
    auditLog: { type: [auditEntrySchema], default: [] },
    isExistingCase: { type: Boolean, default: false, index: true },
    currentStep:    { type: String, trim: true },
    existingNotes:  { type: String, trim: true },
    criminalPath: criminalPathSchema,
    highCourtPath: highCourtPathSchema,
  },
  { timestamps: true }
);

// Indexes
caseSchema.index({ status: 1 });
caseSchema.index({ community: 1 });
caseSchema.index({ litigationMember: 1, status: 1 });
caseSchema.index({ nextHearingDate: 1 });
caseSchema.index({ "documents.ocrStatus": 1 });
caseSchema.index({
  "criminalPath.chargesheetFiled": 1,
  "criminalPath.chargesheetAlertSent": 1,
  "criminalPath.chargesheetDueDate": 1,
});

// In dev, drop the cached model on hot reload so schema edits actually take
// effect without a manual server restart. Mirrors the same pattern in User.ts.
if (process.env.NODE_ENV !== "production" && mongoose.models.Case) {
  mongoose.deleteModel("Case");
}

const Case: Model<ICase> =
  mongoose.models.Case ?? mongoose.model<ICase>("Case", caseSchema);

export default Case;
