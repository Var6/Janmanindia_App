import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A dashboard: tabs of tiles (charts, KPIs, text, images) on a 12-column
 * grid, plus dashboard-wide filters (pick values, a number range or a date
 * range) that apply to every chart whose dataset has the field. One dashboard can be the organisation default for the Impact page;
 * each user can also pin their own.
 */
export type DashboardTile = {
  id: string;
  kind: "chart" | "kpi" | "text" | "image";
  refId?: string;
  text?: string;
  /** Image tiles: a file uploaded through the app, and its caption. */
  imageUrl?: string;
  caption?: string;
  /** Width in grid columns (1–12) and height in rows. */
  w: number;
  h: number;
};

export type DashboardTab = { id: string; title: string; tiles: DashboardTile[] };
export type DashboardFilterType = "value" | "number" | "date";
export type DashboardFilter = { field: string; label: string; type?: DashboardFilterType };

export interface IInsightDashboard extends Document {
  title: string;
  description?: string;
  tabs: DashboardTab[];
  filters: DashboardFilter[];
  isOrgDefault: boolean;
  /** Users who pinned this as their own Impact page (overrides the org default). */
  pinnedBy: mongoose.Types.ObjectId[];
  /** Staff roles that can view it read-only. Directors and superadmins always can. */
  visibleTo: string[];
  /** Named staff who can view it read-only. */
  sharedWith: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const insightDashboardSchema = new Schema<IInsightDashboard>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 500 },
    tabs: { type: Schema.Types.Mixed, default: [] },
    filters: { type: Schema.Types.Mixed, default: [] },
    isOrgDefault: { type: Boolean, default: false, index: true },
    pinnedBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], index: true },
    visibleTo: { type: [String], default: [], index: true },
    sharedWith: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, minimize: false }
);

const InsightDashboard: Model<IInsightDashboard> =
  (mongoose.models.InsightDashboard as Model<IInsightDashboard>) ??
  mongoose.model<IInsightDashboard>("InsightDashboard", insightDashboardSchema);

export default InsightDashboard;
