import mongoose, { Schema, Document, Model } from "mongoose";

export type ConversationType = "dm" | "group";

export interface IConversation extends Document {
  type: ConversationType;
  /** Sorted ascending for stable lookup of DMs (participants[0] < participants[1]). */
  participants: mongoose.Types.ObjectId[];
  title?: string;            // group only
  createdBy: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type:               { type: String, enum: ["dm", "group"], default: "dm", index: true },
    participants:       { type: [{ type: Schema.Types.ObjectId, ref: "User" }], required: true, index: true },
    title:              { type: String, trim: true },
    createdBy:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt:      { type: Date, index: true },
    lastMessagePreview: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, type: 1 });

const Conversation: Model<IConversation> =
  (mongoose.models.Conversation as Model<IConversation>) ||
  mongoose.model<IConversation>("Conversation", conversationSchema);

export default Conversation;
