import type {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  CASE_STATUSES,
  CASE_TYPES,
  EXPENSE_CATEGORIES,
  GRANT_CATEGORIES,
  LEGAL_OUTPUT_MODES,
  LEGAL_SOURCE_KINDS,
  LEGAL_SOURCE_TYPES,
  MONTHLY_REPORT_KINDS,
  PRIORITIES,
  REPORT_TYPES,
  TASK_STATUSES,
  TEAM_STATUSES,
  TEAM_TYPES,
} from "@/lib/jna-sourced/constants";

export type TeamType = (typeof TEAM_TYPES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CasePriority = (typeof PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export type GrantCategory = (typeof GRANT_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type CaseType = (typeof CASE_TYPES)[number];
export type MonthlyReportKind = (typeof MONTHLY_REPORT_KINDS)[number];
export type ReportType = (typeof REPORT_TYPES)[number];
export type LegalSourceType = (typeof LEGAL_SOURCE_TYPES)[number];
export type LegalSourceKind = (typeof LEGAL_SOURCE_KINDS)[number];
export type LegalOutputMode = (typeof LEGAL_OUTPUT_MODES)[number];

export type TeamMemberRecord = {
  id: string;
  uid: string;
  name: string;
  role: string;
  type: TeamType;
  loc: string;
  dist: string;
  phone: string;
  email: string;
  status: TeamStatus;
  qual: string;
  join: string;
  bio: string;
  terminatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type HearingRecord = {
  id: string;
  date: string;
  court: string;
  purpose: string;
  outcome: string;
  nextDate: string | null;
  by: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseDiaryRecord = {
  id: string;
  date: string;
  action: string;
  by: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseRecord = {
  id: string;
  title: string;
  client: string;
  respondent: string;
  court: string;
  caseNo: string;
  firNo: string;
  section: string;
  ps: string;
  type: CaseType;
  district: string;
  advocate: string;
  worker: string;
  status: CaseStatus;
  priority: CasePriority;
  facts: string;
  grounds: string;
  relief: string;
  documents: string[];
  createdAt: string;
  updatedAt: string;
  hearings: HearingRecord[];
  diary: CaseDiaryRecord[];
};

export type TaskRecord = {
  id: string;
  title: string;
  assignedTo: string;
  caseId: string | null;
  deadline: string;
  status: TaskStatus;
  priority: CasePriority;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ActivityParticipantRecord = {
  id: string;
  activityId: string;
  name: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ActivityRecord = {
  id: string;
  type: ActivityType;
  title: string;
  location: string;
  district: string;
  date: string;
  coordinator: string;
  conductedBy: string[];
  beneficiaries: number;
  casesIdentified: number;
  casesReferred: number;
  summary: string;
  status: ActivityStatus;
  followUp: string;
  linkedCases: string[];
  participants: ActivityParticipantRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type FinanceTransactionRecord = {
  id: string;
  date: string;
  type: "grant" | "expense";
  amount: number;
  category: GrantCategory | ExpenseCategory;
  project: string;
  description: string;
  approvedBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MonthlyReportFormData = Record<string, string>;

export type MonthlyReportRecord = {
  id: string;
  member: string;
  month: string;
  type: MonthlyReportKind;
  data: MonthlyReportFormData;
  summary: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AppUserRecord = {
  id: string;
  clerkUserId: string | null;
  email: string;
  role: "admin";
  createdAt?: string;
  updatedAt?: string;
};

export type LegalSourceRecord = {
  id: string;
  title: string;
  documentType: LegalSourceType;
  jurisdiction: string;
  issuingAuthority: string;
  citation: string;
  sourceKind: LegalSourceKind;
  sourceUrl: string;
  status: string;
  datePublished: string | null;
  dateEffective: string | null;
  plainLanguageSummary: string;
  content: string;
  tags: string[];
  audienceTags: string[];
  createdAt?: string;
  updatedAt?: string;
};
