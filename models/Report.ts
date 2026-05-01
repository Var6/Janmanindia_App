import mongoose, { Schema, Document, Model } from "mongoose";

/** A submitted instance of one of the field-report templates defined in
 *  `lib/report-templates.ts`. The shape of `data` is *template-driven* and
 *  validated at the API layer using the registry — Mongoose stores it as
 *  a free-form mixed map so we can add new templates without migrations. */
export interface IReport extends Document {
  /** Stable id from the template registry, e.g. "legal-aid-camp", "fact-finding". */
  template: string;
  /** Question-id → answer pairs. Answers are scalars, arrays of scalars
   *  (checkbox groups), or string ISO dates depending on the question type. */
  data: Record<string, unknown>;
  submittedBy: mongoose.Types.ObjectId;
  submittedRole?: string;
  /** Convenience copy of common fields surfaced for list views — kept so the
   *  index page doesn't need to crack open `data` for each row. */
  summary?: {
    district?: string;
    title?: string;
    eventDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    template:      { type: String, required: true, index: true, trim: true },
    data:          { type: Schema.Types.Mixed, default: {} },
    submittedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submittedRole: { type: String, trim: true },
    summary: {
      district:  { type: String, trim: true },
      title:     { type: String, trim: true },
      eventDate: Date,
    },
  },
  { timestamps: true }
);

reportSchema.index({ template: 1, "summary.eventDate": -1 });
reportSchema.index({ submittedBy: 1, createdAt: -1 });

const Report: Model<IReport> =
  (mongoose.models.Report as Model<IReport>) ||
  mongoose.model<IReport>("Report", reportSchema);

export default Report;
