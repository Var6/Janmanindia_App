import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A lightweight in-app notification for a single user. Currently used to alert
 * directors when a litigation member misses a case review by 2+ days, but the
 * shape is generic so other features can reuse it.
 */
export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body?: string;
  /** In-app link the notification points to (e.g. a case detail page). */
  link?: string;
  /** Arbitrary context — e.g. { caseId } — used to de-duplicate. */
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    link: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ??
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
