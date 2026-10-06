import type { Model } from "mongoose";
import Case from "@/models/Case";
import Activity from "@/models/Activity";
import Expense from "@/models/Expense";
import CarePlan from "@/models/CarePlan";
import TrainingSession from "@/models/TrainingSession";
import StaffDailyReport from "@/models/StaffDailyReport";
import Grievance from "@/models/Grievance";
import User from "@/models/User";
import { districtExpr } from "@/lib/insights/districts";

/**
 * The datasets Insights can query, and the fields on each.
 *
 * This registry is the security boundary of the module. A chart, KPI, alert
 * or Copilot question can only name a dataset key and field keys from here;
 * the query engine turns those into an aggregation pipeline. Nothing from the
 * browser is ever passed to MongoDB as an operator or a path. Free text that
 * can identify a person (case titles, party names, addresses, notes,
 * documents) is deliberately NOT exposed as a field.
 */

export type FieldType = "string" | "number" | "date" | "boolean";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  /** Aggregation expression that yields the value for one record. */
  expr: unknown;
  /** Can be used to group (bar categories, pie slices, pivot rows). */
  dimension?: boolean;
  /** Numeric field that can be summed / averaged. */
  measurable?: boolean;
  /** Value is an ObjectId to be shown as a person's or project's name. */
  lookup?: "user" | "project";
  /** Value is an array (e.g. a case's several lawyers). Grouping by it
   *  counts the record once per element. */
  multi?: boolean;
  /** Known values, for filter pick-lists. */
  values?: string[];
};

export type DatasetDef = {
  key: string;
  label: string;
  description: string;
  /** What one record is, plural ("Cases", "Hearings"). */
  unit: string;
  model: () => Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  baseMatch?: Record<string, unknown>;
  /** Path to unwind before projecting (one record per array element). */
  unwind?: string;
  /** Default date field for time series and period filters. */
  defaultDate: string;
  fields: FieldDef[];
};

const LIVE = ["Open", "Pending", "Escalated"];
const CASE_STATUSES = ["Open", "Pending", "Escalated", "Disposal", "Withdrawn", "Closed", "Dismissed"];

/** A case's lawyers: litigationMembers[], or the lead for older rows. */
const caseMembersExpr = {
  $cond: [
    { $gt: [{ $size: { $ifNull: ["$litigationMembers", []] } }, 0] },
    "$litigationMembers",
    { $cond: [{ $ifNull: ["$litigationMember", false] }, ["$litigationMember"], []] },
  ],
};

/** Readable case type: the new caseType code when set, else the legacy path. */
const caseKindExpr = {
  $ifNull: [
    "$caseType",
    { $cond: [{ $eq: ["$path", "highcourt"] }, "High Court (legacy)", "Criminal (legacy)"] },
  ],
};

const lastHearingExpr = { $max: { $ifNull: ["$courtAppearances.date", []] } };

export const DATASETS: DatasetDef[] = [
  {
    key: "cases",
    label: "Cases",
    unit: "Cases",
    description: "Every non-private case, one record per case.",
    model: () => Case,
    baseMatch: { isPrivate: { $ne: true } },
    defaultDate: "createdAt",
    fields: [
      { key: "status", label: "Status", type: "string", expr: "$status", dimension: true, values: CASE_STATUSES },
      { key: "live", label: "Live or finished", type: "string", dimension: true, values: ["Live", "Finished"],
        expr: { $cond: [{ $in: ["$status", LIVE] }, "Live", "Finished"] } },
      { key: "district", label: "District", type: "string", dimension: true, expr: districtExpr("$district", "$courtName") },
      { key: "forum", label: "Forum", type: "string", dimension: true, values: ["Criminal / district", "High Court"],
        expr: { $cond: [{ $eq: ["$path", "highcourt"] }, "High Court", "Criminal / district"] } },
      { key: "flow", label: "Case flow", type: "string", dimension: true, expr: { $ifNull: ["$flow", "Not set"] } },
      { key: "caseType", label: "Case type", type: "string", dimension: true, expr: caseKindExpr },
      { key: "courtType", label: "Court level", type: "string", dimension: true, expr: { $ifNull: ["$courtType", "Not set"] } },
      { key: "court", label: "Court", type: "string", dimension: true, expr: { $ifNull: ["$courtName", "Not set"] } },
      { key: "stage", label: "Stage", type: "string", dimension: true, expr: { $ifNull: ["$stage", "Not set"] } },
      { key: "filingStatus", label: "Filing status", type: "string", dimension: true, expr: { $ifNull: ["$filingStatus", "Not set"] } },
      { key: "origin", label: "Origin", type: "string", dimension: true, values: ["Imported (existing)", "Taken up by Janman"],
        expr: { $cond: ["$isExistingCase", "Imported (existing)", "Taken up by Janman"] } },
      { key: "lawyer", label: "Lawyer", type: "string", dimension: true, lookup: "user", multi: true, expr: caseMembersExpr },
      { key: "socialWorker", label: "Social worker", type: "string", dimension: true, lookup: "user", expr: { $ifNull: ["$socialWorker", null] } },
      { key: "project", label: "Project", type: "string", dimension: true, lookup: "project", expr: { $ifNull: ["$project", null] } },
      { key: "hasClient", label: "Client linked", type: "boolean", dimension: true, expr: { $cond: [{ $ifNull: ["$community", false] }, true, false] } },
      { key: "hasNextHearing", label: "Next hearing set", type: "boolean", dimension: true, expr: { $cond: [{ $ifNull: ["$nextHearingDate", false] }, true, false] } },
      { key: "hearingOverdue", label: "Next hearing date passed (live cases)", type: "boolean", dimension: true,
        expr: { $and: [{ $in: ["$status", LIVE] }, { $lt: ["$nextHearingDate", "$$NOW"] }, { $ne: [{ $ifNull: ["$nextHearingDate", null] }, null] }] } },
      { key: "hearingsLogged", label: "Hearings logged", type: "number", measurable: true, expr: { $size: { $ifNull: ["$courtAppearances", []] } } },
      { key: "createdAt", label: "Added to the app", type: "date", expr: "$createdAt" },
      { key: "filedDate", label: "Filed on", type: "date", expr: "$filedDate" },
      { key: "nextHearingDate", label: "Next hearing", type: "date", expr: "$nextHearingDate" },
      { key: "lastHearingDate", label: "Last hearing", type: "date", expr: lastHearingExpr },
      { key: "disposedAt", label: "Disposed on", type: "date", expr: "$disposedAt" },
    ],
  },
  {
    key: "hearings",
    label: "Hearings",
    unit: "Hearings",
    description: "Every hearing logged on a case (court appearances), one record per hearing.",
    model: () => Case,
    baseMatch: { isPrivate: { $ne: true } },
    unwind: "$courtAppearances",
    defaultDate: "date",
    fields: [
      { key: "date", label: "Hearing date", type: "date", expr: "$courtAppearances.date" },
      { key: "nextDate", label: "Next date given", type: "date", expr: "$courtAppearances.nextHearingDate" },
      { key: "district", label: "District", type: "string", dimension: true, expr: districtExpr("$district", "$courtName") },
      { key: "forum", label: "Forum", type: "string", dimension: true, values: ["Criminal / district", "High Court"],
        expr: { $cond: [{ $eq: ["$path", "highcourt"] }, "High Court", "Criminal / district"] } },
      { key: "caseType", label: "Case type", type: "string", dimension: true, expr: caseKindExpr },
      { key: "court", label: "Court", type: "string", dimension: true, expr: { $ifNull: ["$courtName", "Not set"] } },
      { key: "loggedBy", label: "Logged by", type: "string", dimension: true, lookup: "user", expr: "$courtAppearances.loggedBy" },
      { key: "caseStatus", label: "Case status", type: "string", dimension: true, values: CASE_STATUSES, expr: "$status" },
    ],
  },
  {
    key: "activities",
    label: "Activities",
    unit: "Activities",
    description: "Planner activities: camps, trainings, field visits, meetings.",
    model: () => Activity,
    defaultDate: "dueDate",
    fields: [
      { key: "category", label: "Category", type: "string", dimension: true,
        values: ["fieldwork", "meeting", "court", "training", "documentation", "outreach", "research", "admin", "other"], expr: "$category" },
      { key: "status", label: "Status", type: "string", dimension: true, values: ["planned", "in_progress", "done", "cancelled"], expr: "$status" },
      { key: "priority", label: "Priority", type: "string", dimension: true, values: ["low", "medium", "high"], expr: "$priority" },
      { key: "assignee", label: "Assignee", type: "string", dimension: true, lookup: "user", expr: "$assignee" },
      { key: "overdue", label: "Overdue", type: "boolean", dimension: true,
        expr: { $and: [{ $in: ["$status", ["planned", "in_progress"]] }, { $lt: ["$dueDate", "$$NOW"] }, { $ne: [{ $ifNull: ["$dueDate", null] }, null] }] } },
      { key: "dueDate", label: "Due", type: "date", expr: "$dueDate" },
      { key: "completedAt", label: "Completed", type: "date", expr: "$completedAt" },
      { key: "createdAt", label: "Created", type: "date", expr: "$createdAt" },
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    unit: "Expense claims",
    description: "Requisitions and reimbursements against projects, cases and activities.",
    model: () => Expense,
    defaultDate: "submittedAt",
    fields: [
      { key: "amount", label: "Amount (₹)", type: "number", measurable: true, expr: { $ifNull: ["$amount", 0] } },
      { key: "status", label: "Status", type: "string", dimension: true,
        values: ["submitted", "hr_verified", "director_approved", "paid", "rejected"], expr: "$status" },
      { key: "category", label: "Category", type: "string", dimension: true,
        values: ["admin", "training", "exploration", "staff", "travel", "legal", "other"], expr: "$category" },
      { key: "kind", label: "Kind", type: "string", dimension: true, values: ["Requisition", "Reimbursement"],
        expr: { $cond: ["$paidByOrg", "Requisition", "Reimbursement"] } },
      { key: "scope", label: "Charged to", type: "string", dimension: true, values: ["Project", "Case", "Activity"],
        expr: { $cond: [{ $ifNull: ["$case", false] }, "Case", { $cond: [{ $ifNull: ["$activity", false] }, "Activity", "Project"] }] } },
      { key: "project", label: "Project", type: "string", dimension: true, lookup: "project", expr: { $ifNull: ["$project", null] } },
      { key: "submittedBy", label: "Submitted by", type: "string", dimension: true, lookup: "user", expr: "$submittedBy" },
      { key: "selfVerified", label: "Verified by the person who filed it", type: "boolean", dimension: true,
        expr: { $eq: ["$hrVerification.by", "$submittedBy"] } },
      { key: "submittedAt", label: "Submitted", type: "date", expr: { $ifNull: ["$submittedAt", "$createdAt"] } },
      { key: "incurredAt", label: "Incurred", type: "date", expr: "$incurredAt" },
      { key: "paidAt", label: "Paid", type: "date", expr: "$payment.at" },
    ],
  },
  {
    key: "carePlans",
    label: "Care plans",
    unit: "Care plans",
    description: "Psychosocial care plans for clients (counselling, shelter, medical and so on).",
    model: () => CarePlan,
    defaultDate: "createdAt",
    fields: [
      { key: "category", label: "Support type", type: "string", dimension: true,
        values: ["counselling", "medical", "shelter", "education", "rehabilitation", "legal_support", "financial_aid", "other"], expr: "$category" },
      { key: "status", label: "Status", type: "string", dimension: true, values: ["active", "on_hold", "completed", "cancelled"], expr: "$status" },
      { key: "priority", label: "Priority", type: "string", dimension: true, values: ["low", "medium", "high", "critical"], expr: "$priority" },
      { key: "sessions", label: "Sessions held", type: "number", measurable: true, expr: { $size: { $ifNull: ["$sessions", []] } } },
      { key: "clients", label: "Client", type: "string", lookup: "user", expr: "$community" },
      { key: "createdAt", label: "Opened", type: "date", expr: "$createdAt" },
      { key: "closedAt", label: "Closed", type: "date", expr: "$closedAt" },
    ],
  },
  {
    key: "trainings",
    label: "Training sessions",
    unit: "Sessions",
    description: "Offline trainings scheduled by the team, with enrolments.",
    model: () => TrainingSession,
    defaultDate: "date",
    fields: [
      { key: "district", label: "District", type: "string", dimension: true, expr: districtExpr("$district") },
      { key: "status", label: "Status", type: "string", dimension: true, values: ["scheduled", "ongoing", "completed", "cancelled"], expr: "$status" },
      { key: "enrolled", label: "People enrolled", type: "number", measurable: true, expr: { $size: { $ifNull: ["$enrollments", []] } } },
      { key: "capacity", label: "Capacity", type: "number", measurable: true, expr: { $ifNull: ["$capacity", 0] } },
      { key: "date", label: "Date", type: "date", expr: "$date" },
    ],
  },
  {
    key: "dailyReports",
    label: "Daily reports",
    unit: "Reports filed",
    description: "Staff daily reports, one record per person per day filed.",
    model: () => StaffDailyReport,
    defaultDate: "day",
    fields: [
      { key: "author", label: "Staff member", type: "string", dimension: true, lookup: "user", expr: "$author" },
      { key: "role", label: "Role", type: "string", dimension: true, expr: { $ifNull: ["$authorRole", "Not set"] } },
      { key: "day", label: "Day", type: "date", expr: { $dateFromString: { dateString: "$dateKey", onError: null, onNull: null } } },
    ],
  },
  {
    key: "grievances",
    label: "Grievances",
    unit: "Grievances",
    description: "Staff grievances. Counts only: no submitter, subject or description is exposed.",
    model: () => Grievance,
    defaultDate: "createdAt",
    fields: [
      { key: "category", label: "Category", type: "string", dimension: true,
        values: ["harassment", "discrimination", "workload", "compensation", "facilities", "interpersonal", "policy", "other"], expr: "$category" },
      { key: "status", label: "Status", type: "string", dimension: true, values: ["open", "in_review", "responded", "closed"], expr: "$status" },
      { key: "createdAt", label: "Submitted", type: "date", expr: "$createdAt" },
      { key: "respondedAt", label: "Responded", type: "date", expr: "$respondedAt" },
    ],
  },
  {
    key: "users",
    label: "People",
    unit: "Accounts",
    description: "Staff and client accounts by role.",
    model: () => User,
    defaultDate: "createdAt",
    fields: [
      { key: "role", label: "Role", type: "string", dimension: true,
        values: ["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"], expr: "$role" },
      { key: "active", label: "Active", type: "boolean", dimension: true, expr: { $ifNull: ["$isActive", false] } },
      { key: "district", label: "District", type: "string", dimension: true,
        expr: districtExpr({ $ifNull: ["$litigationProfile.location.district", { $ifNull: ["$socialWorkerProfile.district", "$communityProfile.district"] }] }) },
      { key: "createdAt", label: "Joined", type: "date", expr: "$createdAt" },
    ],
  },
];

export function getStaticDataset(key: string): DatasetDef | undefined {
  return DATASETS.find((d) => d.key === key);
}

/** Field metadata safe to send to the browser (no expressions). */
export function publicDataset(d: DatasetDef) {
  return {
    key: d.key,
    label: d.label,
    description: d.description,
    unit: d.unit,
    defaultDate: d.defaultDate,
    fields: d.fields.map((f) => ({
      key: f.key, label: f.label, type: f.type, dimension: !!f.dimension,
      measurable: !!f.measurable, lookup: f.lookup, multi: !!f.multi, values: f.values,
    })),
  };
}
