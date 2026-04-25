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

export interface ICase extends Document {
  caseTitle: string;
  caseNumber: string;
  status: CaseStatus;
  path: CasePath;
  /** eCourts-style short code (e.g. "WP(C)", "FIR", "MACT", "POCSO"). */
  caseType?: string;
  community: mongoose.Types.ObjectId;
  litigationMember?: mongoose.Types.ObjectId;
  socialWorker?: mongoose.Types.ObjectId;
  nextHearingDate?: Date;
  googleCalendarEventId?: string;
  documents: IDocument[];
  caseDiary: IDiaryEntry[];

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
    community: { type: Schema.Types.ObjectId, ref: "User", required: true },
    litigationMember: { type: Schema.Types.ObjectId, ref: "User" },
    socialWorker: { type: Schema.Types.ObjectId, ref: "User" },
    nextHearingDate: Date,
    googleCalendarEventId: String,
    documents: [documentSchema],
    caseDiary: [diaryEntrySchema],
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

const Case: Model<ICase> =
  mongoose.models.Case ?? mongoose.model<ICase>("Case", caseSchema);

export default Case;
