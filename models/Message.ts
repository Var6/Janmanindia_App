import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  /** Plain text body. Empty string when this is a pure voice message (audioUrl set). */
  text: string;
  /** Public URL of an uploaded audio clip — for community members who can't read/write. */
  audioUrl?: string;
  audioDurationSec?: number;
  readBy: mongoose.Types.ObjectId[];
  editedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation:     { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender:           { type: Schema.Types.ObjectId, ref: "User", required: true },
    text:             { type: String, default: "", maxlength: 4000 },
    audioUrl:         { type: String, trim: true },
    audioDurationSec: { type: Number, min: 0 },
    readBy:           { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    editedAt:         { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.path("text").validate(function (this: IMessage, v: string) {
  return Boolean(v && v.trim()) || Boolean(this.audioUrl);
}, "A message needs either text or a voice clip.");

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", messageSchema);

export default Message;
