import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVoiceMessage extends Document {
  from: mongoose.Types.ObjectId;
  fromName: string;
  audioUrl: string;
  durationSec?: number;
  message?: string;
  status: "new" | "heard" | "responded";
  heardBy?: mongoose.Types.ObjectId;
  heardAt?: Date;
  responseNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const voiceMessageSchema = new Schema<IVoiceMessage>(
  {
    from:         { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromName:     { type: String, required: true, trim: true },
    audioUrl:     { type: String, required: true },
    durationSec:  Number,
    message:      { type: String, trim: true },
    status:       { type: String, enum: ["new", "heard", "responded"], default: "new", index: true },
    heardBy:      { type: Schema.Types.ObjectId, ref: "User" },
    heardAt:      Date,
    responseNote: { type: String, trim: true },
  },
  { timestamps: true }
);

const VoiceMessage: Model<IVoiceMessage> =
  (mongoose.models.VoiceMessage as Model<IVoiceMessage>) ||
  mongoose.model<IVoiceMessage>("VoiceMessage", voiceMessageSchema);

export default VoiceMessage;
