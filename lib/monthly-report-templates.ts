/**
 * Monthly report templates — the single source of truth shared by the fill
 * form, the director view, and the PDF generator. Two templates: the
 * District Legal Fellowship monthly report (lawyers) and the Access to Justice
 * monthly report (social workers), transcribed from the official Janman forms.
 *
 * A template is a list of sections. Most sections are dynamic tables (the user
 * adds as many rows as needed). Part C sections are fixed-row grids (the rows
 * are predefined activity categories; the user fills the columns).
 */

export type ColumnType = "text" | "longtext" | "number" | "date" | "tel" | "yesno";

export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
  /** Relative width weight for the PDF/table layout (normalised per section). */
  w: number;
  hint?: string;
}

export interface ReportSection {
  /** Stable id used as the key in the stored `sections` object. */
  id: string;
  /** Display number/letter shown before the title, e.g. "A", "B", "V". */
  marker: string;
  title: string;
  /** Intro/help text shown under the heading. */
  note?: string;
  columns: ReportColumn[];
  /** Fixed rows (Part C). When present, rows aren't addable — each is a
   *  category; the user fills `columns` for each. */
  fixedRows?: { key: string; label: string }[];
  /** An optional free-text box under the section (e.g. lawyer §V future note). */
  noteField?: { key: string; label: string };
}

export interface ReportTemplate {
  type: "lawyer" | "socialworker";
  program: string;
  /** Header label for the person field ("Name of Lawyer" / "…Social Worker"). */
  nameLabel: string;
  sections: ReportSection[];
}

/** Common header fields on both forms (besides the person's name, which is
 *  auto-filled from the logged-in user, and Month). */
export const HEADER_FIELDS: { key: string; label: string; type: ColumnType }[] = [
  { key: "districtName", label: "District Name", type: "text" },
  { key: "workPeriod", label: "Work Period", type: "text" },
  { key: "resAddress", label: "Res. Address", type: "text" },
  { key: "mobile", label: "Mobile No.", type: "tel" },
  { key: "email", label: "Email", type: "text" },
];

// ───────────────────────────── Lawyer template ─────────────────────────────

const LAWYER: ReportTemplate = {
  type: "lawyer",
  program: "District Legal Fellowship Program",
  nameLabel: "Name of Lawyer",
  sections: [
    {
      id: "freshCases",
      marker: "A",
      title: "Fresh cases filed in the current reporting period",
      columns: [
        { key: "caseNumber", label: "Case Number", type: "text", w: 10 },
        { key: "causeTitle", label: "Cause title", type: "text", w: 16 },
        { key: "caseType", label: "Case Type", type: "text", w: 10 },
        { key: "beneficiaries", label: "On behalf of / Beneficiaries", type: "text", w: 14 },
        { key: "clientContact", label: "Contact Number of the Client", type: "tel", w: 12 },
        { key: "forum", label: "Forum", type: "text", w: 10 },
        { key: "brief", label: "Brief description", type: "longtext", w: 28, hint: "200–300 words" },
      ],
    },
    {
      id: "oldCases",
      marker: "B",
      title: "Old cases for which appearances have been made in court",
      columns: [
        { key: "caseNumber", label: "Case Number", type: "text", w: 14 },
        { key: "causeTitle", label: "Cause title", type: "text", w: 22 },
        { key: "reportedEarlier", label: "When the case was reported earlier", type: "text", w: 20 },
        { key: "proceedings", label: "Proceedings", type: "longtext", w: 44, hint: "20–100 words · one sentence for routine hearings (adjournment, filing, etc.)" },
      ],
    },
    {
      id: "legalAdvice",
      marker: "C",
      title: "Legal Advice / Consultation / Mediation",
      columns: [
        { key: "clientName", label: "Name of person (client)", type: "text", w: 22 },
        { key: "nature", label: "Nature of case", type: "longtext", w: 34, hint: "100–200 words" },
        { key: "action", label: "Action taken", type: "longtext", w: 22 },
        { key: "outcome", label: "Outcome / Result", type: "text", w: 22 },
      ],
    },
    {
      id: "meetingsOrganized",
      marker: "V",
      title: "Meetings (Organized / Co-organized)",
      note: "Training / workshop / meeting / campaigns / press meet / demonstration. The table is only a listing — please annex the detailed report.",
      columns: [
        { key: "title", label: "Title", type: "text", w: 20 },
        { key: "organisers", label: "Organisers / Co-organisers", type: "text", w: 18 },
        { key: "dates", label: "Date(s)", type: "text", w: 12 },
        { key: "accountsSettled", label: "Accounts settled", type: "yesno", w: 12 },
        { key: "initiative", label: "Initiative", type: "text", w: 16 },
        { key: "outcome", label: "Outcome", type: "text", w: 22 },
      ],
      noteField: { key: "futureNote", label: "Work towards a meeting planned for a future month (processes & progress)" },
    },
    {
      id: "meetingsParticipated",
      marker: "VI",
      title: "Meetings (Participated)",
      note: "Trainings / workshops / public hearings / meetings / fact findings / press meet.",
      columns: [
        { key: "title", label: "Title", type: "text", w: 18 },
        { key: "organisers", label: "Organisers", type: "text", w: 16 },
        { key: "dates", label: "Date(s)", type: "text", w: 10 },
        { key: "role", label: "Role (participant / resource person / paper presented)", type: "text", w: 16 },
        { key: "initiative", label: "Initiative", type: "text", w: 12 },
        { key: "outcome", label: "Outcome / Brief minutes", type: "longtext", w: 18 },
        { key: "accountsSettled", label: "Related accounts settled", type: "yesno", w: 10 },
      ],
    },
    {
      id: "visits",
      marker: "I",
      title: "Visits (Part B) — Jail (men/women), Children's homes / JJB, Community, Victim/Survivor home visit",
      columns: [
        { key: "institution", label: "Institution (Name/s)", type: "text", w: 20 },
        { key: "purpose", label: "Purpose", type: "text", w: 18 },
        { key: "dates", label: "Date(s)", type: "text", w: 12 },
        { key: "outcome", label: "Outcome", type: "text", w: 20 },
        { key: "followUp", label: "Follow up", type: "text", w: 16 },
        { key: "mainContact", label: "Main contact there", type: "text", w: 14 },
      ],
    },
    {
      id: "networking",
      marker: "II",
      title: "Networking activities (Part B)",
      columns: [
        { key: "institution", label: "Name of Institution", type: "text", w: 20 },
        { key: "contact", label: "Main Contact / Designation", type: "text", w: 18 },
        { key: "areas", label: "Areas of work / Type of institution (Govt., NGO, ors.)", type: "text", w: 22 },
        { key: "collaboration", label: "Collaboration / petitioners", type: "text", w: 18 },
        { key: "nature", label: "Nature of meeting / Outcome", type: "text", w: 22 },
      ],
    },
    {
      id: "nextMonth",
      marker: "C",
      title: "Part C — Next month's plans & priorities",
      note: "Important events and specific responsibilities scheduled for next month.",
      fixedRows: [
        { key: "factFindings", label: "Fact Findings" },
        { key: "legalAidCamp", label: "Legal Aid Camp" },
        { key: "anyVisit", label: "Any Visit" },
        { key: "trainings", label: "Trainings" },
        { key: "anyOther", label: "Any other" },
      ],
      columns: [
        { key: "issues", label: "Issues (topic)", type: "text", w: 32 },
        { key: "date", label: "Date", type: "text", w: 14 },
        { key: "organisers", label: "Organisers", type: "text", w: 22 },
        { key: "costs", label: "Costs (approximate)", type: "text", w: 16 },
        { key: "slic", label: "SLIC contact", type: "text", w: 16 },
      ],
    },
  ],
};

// ─────────────────────────── Social worker template ────────────────────────

const SOCIAL_WORKER: ReportTemplate = {
  type: "socialworker",
  program: "Access To Justice Program",
  nameLabel: "Name of Social Worker",
  sections: [
    {
      id: "freshCases",
      marker: "A",
      title: "Fresh cases scoped & crisis interventions in the current reporting period",
      columns: [
        { key: "nameAge", label: "Name & Age of Beneficiary / Survivor", type: "text", w: 16 },
        { key: "block", label: "Block / Panchayat / Ward", type: "text", w: 14 },
        { key: "issueCategory", label: "Issue Category (DV, POCSO, Eviction, Atrocity, Worker Safety, etc.)", type: "text", w: 16 },
        { key: "clientContact", label: "Contact No. of Client", type: "tel", w: 12 },
        { key: "referredTo", label: "Referred To", type: "text", w: 14 },
        { key: "brief", label: "Brief description of facts & immediate support", type: "longtext", w: 28, hint: "150–250 words" },
      ],
    },
    {
      id: "followUp",
      marker: "B",
      title: "Follow-up on previously reported cases & survivor rehabilitation",
      note: "Ongoing cases with home visits, hospital/police accompaniment, or psychosocial follow-ups.",
      columns: [
        { key: "caseNumber", label: "Case Number and Cause title", type: "text", w: 20 },
        { key: "beneficiary", label: "Name of Beneficiary / Survivor", type: "text", w: 20 },
        { key: "supportNature", label: "Nature of Support (home visit, MLC/hospital, CWC/OSC follow-up, witness safety)", type: "text", w: 28 },
        { key: "progress", label: "Progress & Current Status", type: "longtext", w: 32, hint: "20–100 words" },
      ],
    },
    {
      id: "psychosocial",
      marker: "C",
      title: "Psychosocial support, field counseling & welfare scheme linkages",
      columns: [
        { key: "beneficiaryVillage", label: "Name of Beneficiary & Village / Ward", type: "text", w: 20 },
        { key: "need", label: "Nature of Vulnerability / Need", type: "longtext", w: 26, hint: "100–150 words" },
        { key: "scheme", label: "Support / Scheme Facilitated (Victim Compensation, Pension, Ration Card, PM Awas, Jeevika, Labour/Sanitation Worker Scheme)", type: "text", w: 26 },
        { key: "authority", label: "Authority / Office Approached", type: "text", w: 14 },
        { key: "outcome", label: "Outcome / Result", type: "text", w: 14 },
      ],
    },
    {
      id: "fieldInspections",
      marker: "V",
      title: "Community field inspections & preliminary fact-findings conducted",
      note: "Systemic or community-wide issues: unlawful evictions, municipal/biomedical waste hazards, worker safety violations, denial of public services.",
      columns: [
        { key: "site", label: "Site / Location (Village, Ward, Riverbank, Workplace)", type: "text", w: 20 },
        { key: "date", label: "Date of Visit", type: "date", w: 12 },
        { key: "issue", label: "Core Issue Investigated", type: "text", w: 22 },
        { key: "affected", label: "No. of Affected Families / Workers", type: "number", w: 12 },
        { key: "evidence", label: "Evidence Collected (Photos, Videos, Testimonies, Notices)", type: "text", w: 17 },
        { key: "action", label: "Action Taken / Report Submitted to Legal Team", type: "text", w: 17 },
      ],
    },
    {
      id: "meetingsCamps",
      marker: "VI",
      title: "Meetings & camps (Organized / Co-organized / Participated)",
      columns: [
        { key: "title", label: "Title / Topic of Session", type: "text", w: 18 },
        { key: "location", label: "Location (Village / Tola / Ward)", type: "text", w: 16 },
        { key: "organizers", label: "Organizer / Co-organizers", type: "text", w: 14 },
        { key: "dates", label: "Date(s)", type: "text", w: 10 },
        { key: "participants", label: "No. of Participants", type: "number", w: 10 },
        { key: "accountsSettled", label: "Accounts Settled", type: "yesno", w: 10 },
        { key: "outcome", label: "Outcome & Cases Scoped", type: "text", w: 22 },
      ],
    },
    {
      id: "visits",
      marker: "I",
      title: "Visits to institutions, communities & survivor homes (Part B)",
      note: "Survivor Homes, Slums/Tolas, OSC, CWC/Children's Homes, Sadar Hospital/PHC, Block/Circle Office, Police Station / Mahila Help Desk, Detention/Shelter facilities.",
      columns: [
        { key: "institution", label: "Institution / Community Location", type: "text", w: 20 },
        { key: "purpose", label: "Purpose of Visit", type: "text", w: 18 },
        { key: "dates", label: "Date(s)", type: "text", w: 10 },
        { key: "outcome", label: "Outcome", type: "text", w: 20 },
        { key: "followUp", label: "Follow-Up Required", type: "yesno", w: 12 },
        { key: "mainContact", label: "Main Contact Person & Designation", type: "text", w: 20 },
      ],
    },
    {
      id: "networking",
      marker: "II",
      title: "Grassroots & institutional networking activities (Part B)",
      note: "Referral networks with Anganwadi, ASHA, Jeevika SHGs, Ward Members/Mukhiya, Protection Officers, Trade Unions, Sanitation Worker Groups, DLSA, and NGOs.",
      columns: [
        { key: "institution", label: "Name of Institution / Community Group", type: "text", w: 22 },
        { key: "contact", label: "Main Contact & Designation", type: "text", w: 18 },
        { key: "entityType", label: "Type of Entity (Govt., PRI, SHG, NGO, Worker Union)", type: "text", w: 20 },
        { key: "collaboration", label: "Area of Collaboration / Referral Linkage", type: "text", w: 20 },
        { key: "nature", label: "Nature of Meeting & Outcome", type: "text", w: 20 },
      ],
    },
    {
      id: "nextMonth",
      marker: "C",
      title: "Part C — Next month's plan & priorities",
      note: "Important community visits, Second-Saturday camps, fact-findings, and follow-up drives scheduled for next month.",
      fixedRows: [
        { key: "factFindings", label: "Field Fact-Findings / Spot Inspections" },
        { key: "communityCamp", label: "Community Visit / Legal Aid Camp" },
        { key: "survivorVisits", label: "Survivor Home Visits & Follow-ups" },
        { key: "welfareCamp", label: "Welfare Scheme / Entitlement Camp" },
        { key: "plvMobilization", label: "PLV / SHG Mobilization Meeting" },
        { key: "anyOther", label: "Any other" },
      ],
      columns: [
        { key: "issues", label: "Issues / Target Community (Topic & Location)", type: "text", w: 30 },
        { key: "date", label: "Proposed Date(s)", type: "text", w: 14 },
        { key: "team", label: "Team / Co-Organisers (DLF / PLVs)", type: "text", w: 22 },
        { key: "costs", label: "Costs (approximate)", type: "text", w: 16 },
        { key: "coordinator", label: "JPF Coordinator Contact", type: "text", w: 18 },
      ],
    },
  ],
};

export const MONTHLY_TEMPLATES: Record<"lawyer" | "socialworker", ReportTemplate> = {
  lawyer: LAWYER,
  socialworker: SOCIAL_WORKER,
};

/** Which template a role fills. */
export function templateForRole(role: string): ReportTemplate | null {
  if (role === "litigation") return LAWYER;
  if (role === "socialworker") return SOCIAL_WORKER;
  return null;
}

export function templateByType(type: string): ReportTemplate | null {
  if (type === "lawyer") return LAWYER;
  if (type === "socialworker") return SOCIAL_WORKER;
  return null;
}
