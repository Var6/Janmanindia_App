import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One Copilot question in progress. When approval is on, the model's
 * proposed queries wait here until the person approves or skips them; the
 * conversation so far is kept on the server so the browser cannot alter what
 * is sent to the model. It holds totals only, and is removed after six hours.
 */
export interface IInsightCopilotRun extends Document {
  user: mongoose.Types.ObjectId;
  /** Anthropic message params (user / assistant turns, tool calls, results). */
  messages: unknown[];
  /** Queries waiting for a decision. */
  pending: { id: string; spec: unknown; summary: string }[];
  /** Results already known for tool calls in the same turn (invalid queries). */
  held: { tool_use_id: string; content: string; is_error?: boolean }[];
  /** What has been asked of the data so far, for "How this was worked out". */
  trace: { spec: unknown; summary?: string; result?: unknown; error?: string; skipped?: boolean }[];
  toolCalls: number;
  status: "awaiting" | "done";
  createdAt: Date;
}

const insightCopilotRunSchema = new Schema<IInsightCopilotRun>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    messages: { type: Schema.Types.Mixed, default: [] },
    pending: { type: Schema.Types.Mixed, default: [] },
    held: { type: Schema.Types.Mixed, default: [] },
    trace: { type: Schema.Types.Mixed, default: [] },
    toolCalls: { type: Number, default: 0 },
    status: { type: String, enum: ["awaiting", "done"], default: "awaiting" },
    createdAt: { type: Date, default: Date.now, expires: 6 * 3600 },
  },
  { minimize: false }
);

const InsightCopilotRun: Model<IInsightCopilotRun> =
  (mongoose.models.InsightCopilotRun as Model<IInsightCopilotRun>) ??
  mongoose.model<IInsightCopilotRun>("InsightCopilotRun", insightCopilotRunSchema);

export default InsightCopilotRun;
