import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A monthly case review written by the assigned litigation member.
 *
 * Lifecycle rules (enforced in the API):
 *  - Due ~1 month after the case is created; the litigation fellow writes it.
 *  - Editable / deletable only within 24h of submission, then it locks.
 *  - Visible to directors / superadmins (read-only) plus the author.
 *  - Deleted automatically when the case is disposed (see the dispose handler
 *    in app/api/cases/[caseId]/route.ts).
 */
export interface ICaseReview extends Document {
  case: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorName?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Window (ms) during which the author may edit / delete their own review. */
export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A review is locked once it's older than the edit window. */
export function isReviewLocked(createdAt: Date | string): boolean {
  return Date.now() - new Date(createdAt).getTime() > REVIEW_EDIT_WINDOW_MS;
}

const caseReviewSchema = new Schema<ICaseReview>(
  {
    case: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Denormalised so the director's list renders without populating users.
    authorName: { type: String, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 8000 },
  },
  { timestamps: true }
);

caseReviewSchema.index({ case: 1, createdAt: -1 });

const CaseReview: Model<ICaseReview> =
  (mongoose.models.CaseReview as Model<ICaseReview>) ??
  mongoose.model<ICaseReview>("CaseReview", caseReviewSchema);

export default CaseReview;
