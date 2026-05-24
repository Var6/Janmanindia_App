export const COLORS = {
  bg: "#09101F",
  surface: "#101724",
  card: "#182030",
  border: "#1C2B46",
  accent: "#E8A243",
  accentSoft: "rgba(232, 162, 67, 0.09)",
  red: "#E05C5C",
  green: "#4CAF82",
  blue: "#4A90D9",
  purple: "#9B72CF",
  muted: "#3F5070",
  text: "#CBD8ED",
  dim: "#6278A0",
} as const;

export const BIHAR_DISTRICTS = [
  "Araria",
  "Arwal",
  "Aurangabad",
  "Banka",
  "Begusarai",
  "Bhagalpur",
  "Bhojpur",
  "Buxar",
  "Darbhanga",
  "East Champaran",
  "Gaya",
  "Gopalganj",
  "Jamui",
  "Jehanabad",
  "Kaimur",
  "Katihar",
  "Khagaria",
  "Kishanganj",
  "Lakhisarai",
  "Madhepura",
  "Madhubani",
  "Munger",
  "Muzaffarpur",
  "Nalanda",
  "Nawada",
  "Patna",
  "Purnia",
  "Rohtas",
  "Saharsa",
  "Samastipur",
  "Saran",
  "Sheikhpura",
  "Sheohar",
  "Sitamarhi",
  "Siwan",
  "Supaul",
  "Vaishali",
  "West Champaran",
] as const;

export const COURTS = [
  "Supreme Court of India",
  "Patna High Court",
  ...BIHAR_DISTRICTS.map((district) => `District Court, ${district}`),
  "Sessions Court, Purnia",
  "Sessions Court, Patna",
  "JMFC, Purnia",
  "JMFC, Patna",
  "CJM, Purnia",
  "CJM, Patna",
  "Family Court, Patna",
  "Family Court, Purnia",
  "POCSO Court, Purnia",
  "POCSO Court, Patna",
  "Consumer Forum, Patna",
  "Labour Court, Patna",
] as const;

export const CASE_TYPES = [
  "Anticipatory Bail",
  "Regular Bail",
  "Criminal Writ Petition",
  "Application u/s 156(3) CrPC",
  "Application u/s 482 CrPC",
  "Habeas Corpus",
  "PIL (Criminal)",
  "Criminal Revision",
  "Criminal Appeal",
  "POCSO Trial",
  "SC/ST Atrocities Trial",
  "Domestic Violence (PWDVA)",
  "Protection Order (PWDVA)",
  "Contempt (Criminal)",
  "FIR Complaint",
  "Representation to Authority",
  "Custodial Death Petition",
  "Writ Petition (Civil)",
  "PIL (Civil)",
  "Civil Suit",
  "Title Suit",
  "Partition Suit",
  "Injunction",
  "Maintenance u/s 125 CrPC",
  "Family Court Matter",
  "Guardianship",
  "Succession Certificate",
  "Consumer Complaint",
  "Motor Accident",
  "Execution Petition",
  "Civil Contempt",
  "RTI Appeal",
  "Land Acquisition",
  "Compensation Petition",
] as const;

export const ACTIVITY_TYPES = [
  "Legal Aid Camp",
  "PLV Training",
  "DLF Residential Training",
  "Annual Consultation",
  "Fact-Finding",
  "Community Outreach",
  "Networking Meeting",
  "Advocacy",
  "Representation",
  "OSC/DLSA Coordination",
  "Court Visit",
] as const;

export const GRANT_CATEGORIES = [
  "Core Grant",
  "Top-up Grant",
  "Donation",
  "CSR Contribution",
  "Government Aid",
  "Interest Income",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Salary/Honorarium",
  "Travel & Boarding",
  "Camp/Training Expenses",
  "Case Filing",
  "Printing & Materials",
  "Office Expenses",
  "Communication",
  "Audit & Compliance",
  "Other",
] as const;

export const TEAM_TYPES = [
  "mentor",
  "lawyer",
  "admin",
  "coordinator",
  "worker",
  "fellow",
  "consultant",
] as const;

export const CASE_STATUSES = ["active", "overdue", "stayed", "closed"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const TASK_STATUSES = ["pending", "done"] as const;
export const ACTIVITY_STATUSES = ["planned", "ongoing", "completed"] as const;
export const TEAM_STATUSES = ["active", "terminated"] as const;
export const MONTHLY_REPORT_KINDS = ["lawyer", "social_worker"] as const;
export const REPORT_TYPES = ["donor", "appi", "internal"] as const;
export const LEGAL_SOURCE_TYPES = [
  "act",
  "rule",
  "notification",
  "scheme",
  "case_law",
  "training_note",
] as const;
export const LEGAL_SOURCE_KINDS = ["primary", "secondary", "internal"] as const;
export const LEGAL_OUTPUT_MODES = [
  "statutory_explainer",
  "case_digest",
  "training_module",
  "flash_cards",
  "campaign_brief",
  "legal_aid_checklist",
] as const;
