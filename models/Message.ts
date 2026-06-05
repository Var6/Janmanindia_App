import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  /** Plain text body. Empty string when this is a pure voice message (audioUrl set). */
  text: string;
  /** Public URL of an uploaded audio clip — for community members who can't read/write. */
  audioUrl?: string;
  audioDurationSec?: number;
  /** Optional attached case reference — lets people pull a case into the chat
   *  for discussion. Denormalised number/title so we don't populate per render. */
  caseRef?: { case: mongoose.Types.ObjectId; caseNumber: string; caseTitle: string };
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
    caseRef: {
      type: new Schema(
        {
          case:       { type: Schema.Types.ObjectId, ref: "Case", required: true },
          caseNumber: { type: String, default: "" },
          caseTitle:  { type: String, default: "" },
        },
        { _id: false }
      ),
      required: false,
    },
    readBy:           { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    editedAt:         { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.path("text").validate(function (this: IMessage, v: string) {
  return Boolean(v && v.trim()) || Boolean(this.audioUrl) || Boolean(this.caseRef?.case);
}, "A message needs text, a voice clip, or a case reference.");

messageSchema.index({ conversation: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Message) {
  mongoose.deleteModel("Message");
}
const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", messageSchema);

export default Message;
