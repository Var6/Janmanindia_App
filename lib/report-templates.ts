/** Field-report templates. Each entry mirrors a Google Form the field team
 *  used to submit (Legal Aid Camp, Fact Finding, Legal Training, …). The
 *  `Report` model stores question-id → answer pairs against one of these
 *  template ids, and the dynamic ReportForm renders the questions defined
 *  here.
 *
 *  Adding a new template is the *only* code change required to ship a new
 *  form — the API, list page, form renderer, and detail viewer all pick it
 *  up via this registry. */

export type FieldType =
  | "short_text"      // single-line text
  | "long_text"       // multi-line textarea
  | "number"          // numeric input
  | "date"            // YYYY-MM-DD date picker
  | "dropdown"        // single-select <select>
  | "radio"           // single-select radio group
  | "checkbox"        // multi-select checkbox group
  | "url";            // single short URL string (e.g. photo album link)

export interface FieldDef {
  id: string;
  label: string;
  /** Optional helper text rendered under the label. */
  hint?: string;
  type: FieldType;
  /** Required for dropdown / radio / checkbox. */
  options?: string[];
  required?: boolean;
  /** Cap the rendered width of single-line inputs so the form stays scannable. */
  small?: boolean;
}

export interface ReportTemplate {
  id: string;
  /** Plain-language name shown in the list / index. */
  name: string;
  /** One-line description rendered above the form. */
  description?: string;
  /** Roles allowed to submit this report. Anyone can read their own; the API
   *  rejects POSTs from outside this list. Always excludes "community". */
  authorRoles: string[];
  /** Question definitions in display order. */
  fields: FieldDef[];
  /** Field id whose value is copied into Report.summary for list rendering.
   *  Optional — leave undefined when nothing is meaningful. */
  summary?: {
    titleField?:    string;  // headline shown on the list row
    districtField?: string;
    dateField?:     string;
  };
}

/** Districts the Janman field team operates in. Reused by every template
 *  that needs a "where" question. Keep in sync with the Google Forms. */
export const BIHAR_DISTRICTS = ["Patna", "Purnea", "Bhagalpur", "Kishanganj", "Araria", "Katihar"];

/** Legal-issue catalogue used in the Legal Aid Camp form. Pulled verbatim
 *  from the live form so historical reports can later be merged. */
export const LEGAL_ISSUE_OPTIONS = [
  "Domestic Violence",
  "Bonded Labour",
  "Road Accident deaths",
  "Trafficking",
  "Dowry Harassment",
  "Floods damages & compensation",
  "Maintenance",
  "Rape",
  "Caste Atrocities",
  "Murder",
  "Housing rights",
  "Land Dispute",
  "Medical negligence",
  "Unnatural Death",
  "Labour Issue",
  "Police Atrocity",
  "POCSO",
];

/** Roles that can submit any field report (everyone except community). */
const STAFF_AUTHORS = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

/** Social-category buckets used in the Legal Awareness Training report. Order
 *  matches the live Google Form so historical responses align cleanly. */
const SOCIAL_CATEGORIES = ["SC", "ST", "OBC", "EBC", "Minority", "General", "Persons with Disabilities", "Other"];

/** Age-band buckets used in the Legal Awareness Training report. */
const AGE_GROUPS = ["Children (Under 18)", "Youth (18–30)", "Adults (30–60)", "Elderly (60+)"];

/** Stakeholders typically present at a community legal awareness session. */
const TRAINING_STAKEHOLDERS = [
  "Sarpanch / Ward Member",
  "School Teachers",
  "ASHA/Anganwadi Workers",
  "Police/Thana Representative",
  "SHG Women",
  "Community-Based Organizations",
];

/** Topics covered in the legal awareness curriculum. Distinct from
 *  LEGAL_ISSUE_OPTIONS (which catalogues *issue types* raised in legal aid
 *  camps); these are *training subjects* taught at awareness sessions. */
const TRAINING_CONTENT_TOPICS = [
  "Rights of Arrested Persons",
  "Domestic Violence",
  "POCSO",
  "Dowry Harassment",
  "Human Trafficking",
  "Child Marriage",
  "Police Atrocity",
  "SC/ST Atrocities Act",
  "Legal Aid Services and How to Access Them",
  "Filing an FIR",
  "Bail Rights",
];

/** Pedagogical methods used to deliver the training. */
const TRAINING_METHODS = [
  "Poster Display",
  "Street Play / Nukkad Natak",
  "Storytelling / Case Studies",
  "Role Play",
  "Group Discussion",
  "Visual Aids",
  "Legal Pamphlets",
  "Q&A Session",
];

/** Stakeholder taxonomy for the Stakeholder Engagement Report. Order matches
 *  the live Google Form so historical responses align cleanly. */
const STAKEHOLDER_TYPES = [
  "Grassroots NGOs / CBOs",
  "Local Community Leaders",
  "Social Activists",
  "Political Activists",
  "Police Officials (Thana / SHO / IOs)",
  "Government Officials (BDO, CO, CDPO, PO, etc.)",
  "DLSA Secretary",
  "Members of DLSA Panel",
  "Public Prosecutors",
  "District Judge / Judicial Officer",
  "LDAC Members",
  "Nyaya Mitra",
];

/** Reasons a fellow / SW would engage a stakeholder — used as the "purpose"
 *  multi-select on the engagement report. */
const ENGAGEMENT_PURPOSES = [
  "Building Partnerships",
  "Referrals for Cases",
  "Information Sharing",
  "Coordinating Rescue or Legal Aid",
  "Awareness/Training Collaboration",
  "Administrative Support",
  "Case Updates",
];

/** Weekly Plan of Action — option lists. Each "section" of the original
 *  Google Form is a checkbox grid where the row label is the section name
 *  and the column labels are the activity types. Stored as flat checkbox
 *  fields here. Order matches the live form. */
const WEEKLY_POA_COMMUNITY_OUTREACH = [
  "Para Legal Training",
  "Legal Aid Camp",
  "Legal Awareness and Advocacy",
  "Fact Finding Mission",
];

const WEEKLY_POA_NETWORKING = [
  "Meeting with grassroot activists/NGOs/CSOs and CBOs",
  "Meeting with CWC Members/Chairperson",
  "Meeting with Special Public Prosecutors",
  "Meeting with DLSA Secretary",
  "Meeting with Union leaders",
  "Meeting with Panchayat Raj Representative",
  "Meeting with Street Vendors and Hawkers",
];

const WEEKLY_POA_CASE_FILING = [
  "Filing before the trial court",
  "Filing before the high court",
  "Filing before Human Rights Commission",
  "Filing before tribunals",
  "Filing before consumer forums",
  "Filing before district administrations/revenue officers",
];

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "legal-aid-camp",
    name: "Legal Aid Camp Report",
    description: "After-action report for a community legal aid camp — attendance, issues raised, follow-up actions.",
    authorRoles: STAFF_AUTHORS,
    summary: { titleField: "venue", districtField: "district", dateField: "campDate" },
    fields: [
      { id: "district",        label: "District",                              type: "dropdown",   options: BIHAR_DISTRICTS, required: true },
      { id: "block",           label: "Block",                                 type: "short_text", required: true },
      { id: "panchayat",       label: "Panchayat",                             type: "short_text", required: true },
      { id: "village",         label: "Village",                               type: "short_text", required: true },
      { id: "venue",           label: "Venue / location of the camp",          type: "short_text", required: true },
      { id: "campDate",        label: "Date of legal aid camp",                type: "date",       required: true },
      { id: "organisingTeam",  label: "Organising team members present",       type: "long_text",  required: true,
        hint: "Names + roles, comma-separated." },
      { id: "localAuthorities",label: "Local authorities present",             type: "long_text",  required: true,
        hint: "Sarpanch, BDO, SHO, DLSA panel lawyer, etc." },
      { id: "attendance",      label: "Total community members attended",      type: "long_text",  required: true,
        hint: "Break it down: women / Dalit / Adivasi / minority / persons with disabilities / children." },
      { id: "casesRegistered", label: "Total legal aid cases registered",      type: "number",     required: true, small: true },
      { id: "legalIssues",     label: "Nature of legal issues raised",         type: "checkbox",   options: LEGAL_ISSUE_OPTIONS, required: true },
      { id: "firsAssisted",    label: "FIRs drafted or assisted",              type: "number",     required: true, small: true },
      { id: "referrals",       label: "Referrals made to DLSA / police / other bodies", type: "number", required: true, small: true },
      { id: "seriousCases",    label: "Serious cases needing immediate legal action / fact-finding", type: "long_text", required: true,
        hint: "Brief case summaries — name(s) optional, district + nature of issue mandatory." },
      { id: "challenges",      label: "Challenges faced during the camp",      type: "long_text",  required: true },
      { id: "photosUrl",       label: "Photos / attendance link",              type: "url",        required: false,
        hint: "Drive folder or shared album URL, if any." },
    ],
  },

  // ── Fact Finding Report ─────────────────────────────────────────────────
  // Mirrors the bilingual (English / Hindi) Google Form. Field labels keep
  // both languages so the field team's mental model carries over from the
  // original form. The last 4 fields are inferred from typical fact-finding
  // structure — review and rename if the live form differs.
  {
    id: "fact-finding",
    name: "Fact Finding Report / तथ्य जांच रिपोर्ट",
    description: "Detailed incident write-up for a fact-finding mission — client + witness statements, evidence, legal assessment, follow-up.",
    authorRoles: STAFF_AUTHORS,
    summary: { titleField: "clientName", districtField: "incidentLocation", dateField: "incidentDate" },
    fields: [
      // Section 1 — Report meta
      { id: "reportNumber",     label: "Report number / रिपोर्ट संख्या",                   type: "short_text", required: true,
        hint: "Unique identifier for this report (e.g. FF-2026-001)." },
      { id: "reportDate",       label: "Report preparation date / रिपोर्ट तैयार करने की तारीख", type: "date", required: true },
      { id: "preparedBy",       label: "Prepared by / रिपोर्ट तैयार करने वाला",              type: "short_text", required: true,
        hint: "Name and title of the person filing this report." },

      // Section 2 — Client (the person the case is about)
      { id: "clientName",       label: "Client name / व्यक्ति का नाम",                       type: "short_text", required: true },
      { id: "clientAge",        label: "Age / आयु",                                          type: "number",     required: true, small: true },
      { id: "clientGender",     label: "Gender / लिंग",                                      type: "short_text", required: true,
        hint: "Self-described — open text in the original form." },
      { id: "clientAddress",    label: "Address / पता",                                      type: "long_text",  required: true },
      { id: "clientContact",    label: "Contact information / संपर्क जानकारी",                type: "short_text", required: true,
        hint: "Phone, email, or alternate contact." },

      // Section 3 — Incident
      { id: "incidentDate",     label: "Date of incident / घटना की तारीख",                  type: "date",       required: true },
      { id: "incidentLocation", label: "Location of incident / घटना का स्थान",                type: "short_text", required: true,
        hint: "Specific location — village, panchayat, district." },
      { id: "incidentDesc",     label: "Description of incident / घटना का विवरण",            type: "long_text",  required: true,
        hint: "Detailed account of what happened, in the client's words where possible." },

      // Section 4 — Witness
      { id: "witnessNames",     label: "Witness name(s) / साक्षी का(के) नाम",                type: "long_text",  required: true,
        hint: "Comma-separate multiple witnesses." },
      { id: "witnessContact",   label: "Witness contact details / साक्षी का संपर्क",         type: "long_text",  required: true,
        hint: "Phone numbers / addresses, one per witness." },
      { id: "witnessAccount",   label: "Witness account / साक्षी कथन",                      type: "long_text",  required: true,
        hint: "What the witness saw or heard — verbatim where possible." },
      { id: "otherPartyStatement", label: "Other party statement / दूसरी पार्टी का वक्तव्य", type: "long_text",  required: false,
        hint: "Optional — record only if the team was able to speak with the other side." },

      // Section 5 — Evidence
      { id: "evidenceType",     label: "Type of evidence / साक्ष्य का प्रकार",               type: "radio",
        options: ["Taken", "Family does not have any document"], required: true,
        hint: "Photos, videos, documents — or note that no documentation exists." },
      { id: "evidenceCustodian",label: "Evidence is with / साक्ष्य कहाँ है",                 type: "short_text", required: true,
        hint: "Janman team member currently holding the evidence." },

      // Section 6 — Legal assessment
      { id: "legalAssessment",  label: "Legal assessment / कानूनी मूल्यांकन",                type: "long_text",  required: true,
        hint: "Lawyer's read on what laws have been violated and the strength of the case." },
      { id: "firFiled",         label: "Has FIR been filed? / क्या FIR दर्ज हो गई है?",       type: "radio",
        options: ["Yes", "No", "Maybe"], required: true },
      { id: "firNumber",        label: "FIR number (if yes) / FIR नंबर (यदि हां)",           type: "short_text", required: false,
        hint: "Leave blank if no FIR has been filed." },
      { id: "preliminaryOpinion", label: "Preliminary legal opinion / प्रारंभिक कानूनी राय", type: "long_text",  required: true,
        hint: "Lawyer's opinion on next legal steps — file a writ, escalate to HRC, refer to DLSA, etc." },
      { id: "applicableLaws",   label: "Applicable laws & rights violated / लागू कानून और उल्लंघन किए गए अधिकार", type: "long_text", required: true,
        hint: "Sections of IPC / CrPC / SC-ST Act / POCSO / etc., and the constitutional or statutory rights violated." },

      // Section 7 — Follow-up (last 4 fields inferred — may need rename)
      { id: "recommendations",  label: "Recommendations & next steps / सिफारिशें और अगले कदम", type: "long_text", required: true,
        hint: "Concrete actions: file FIR, draft writ, refer to DLSA, schedule follow-up visit." },
      { id: "followUpDate",     label: "Next follow-up date / अगली अनुवर्ती तिथि",            type: "date",       required: false },
      { id: "evidenceUrl",      label: "Photos / documents folder URL",                       type: "url",        required: false,
        hint: "Drive folder or album link with photos / scanned documents." },
      { id: "fieldTeam",        label: "Field team members / फील्ड टीम सदस्य",               type: "long_text",  required: false,
        hint: "Everyone who was on the fact-finding visit — names + roles." },
    ],
  },

  // ── Weekly Plan of Action ───────────────────────────────────────────────
  // Submitted every Sunday by district legal fellows ahead of the weekly
  // review meeting. Three sections (community outreach, networking, case
  // filing); each is a checkbox of planned activity types plus a free-text
  // explainer. Mirrors the original Google Form one-to-one.
  {
    id: "weekly-plan-of-action",
    name: "Weekly Plan of Action",
    description: "District legal fellows' upcoming-week plan — community outreach, networking, and case filing activities. Submit by Sunday for the weekly meeting.",
    authorRoles: STAFF_AUTHORS,
    summary: { titleField: "fellowName", districtField: "district", dateField: "weekOf" },
    fields: [
      { id: "fellowName",     label: "Name",                                       type: "short_text", required: true,
        hint: "Name of the district legal fellow filing this plan." },
      { id: "district",       label: "District",                                   type: "dropdown",   options: BIHAR_DISTRICTS, required: true },
      { id: "weekOf",         label: "Date",                                       type: "date",       required: true,
        hint: "Sunday the plan is being submitted for — covers the week ahead." },

      // Section 1 — Community Outreach
      { id: "communityOutreachActivities", label: "Community outreach activities planned", type: "checkbox",
        options: WEEKLY_POA_COMMUNITY_OUTREACH, required: false,
        hint: "Pick the activity types you plan to run this week." },
      { id: "communityOutreachPlan", label: "Community outreach plan of action", type: "long_text", required: false,
        hint: "Where, with whom, what's the goal — keep it concrete enough to follow up on Sunday." },

      // Section 2 — Networking Activities
      { id: "networkingActivities", label: "Networking activities planned",       type: "checkbox",
        options: WEEKLY_POA_NETWORKING, required: false,
        hint: "Meetings with stakeholders, allies, or government bodies." },
      { id: "networkingPlan",       label: "Networking plan of action",            type: "long_text", required: false,
        hint: "Who you intend to meet, why, and the desired outcome." },

      // Section 3 — Case Filing
      { id: "caseFilingActivities", label: "Case filing activities planned",      type: "checkbox",
        options: WEEKLY_POA_CASE_FILING, required: false,
        hint: "Forums you intend to file matters before this week." },
      { id: "caseFilingPlan",       label: "Case filings plan of action",          type: "long_text", required: false,
        hint: "Which matters, before which forum, and the relief being sought." },
    ],
  },

  // ── PIL Lead Identification ─────────────────────────────────────────────
  // Captures a potential public interest litigation lead so the litigation
  // team can triage and decide whether to convert it into a PIL filing.
  // Restricted to legal/admin staff — community members route concerns
  // through the case enquiry form instead.
  {
    id: "pil-lead-identification",
    name: "PIL Lead Identification",
    description: "Capture a potential public interest litigation lead — affected groups, why it warrants PIL, urgency. Reviewed by the litigation team for triage.",
    authorRoles: ["socialworker", "litigation", "administrator", "director", "superadmin"],
    summary: { titleField: "issueSummary", districtField: "district", dateField: "incidentDate" },
    fields: [
      { id: "submitterName",     label: "Name of person submitting the lead",          type: "short_text", required: true },
      { id: "designation",       label: "Designation",                                  type: "short_text", required: true,
        hint: "Your role — district legal fellow, social worker, paralegal volunteer, etc." },
      { id: "district",          label: "District",                                     type: "dropdown", options: BIHAR_DISTRICTS, required: true },
      { id: "block",             label: "Block",                                        type: "short_text", required: true },
      { id: "panchayat",         label: "Panchayat",                                    type: "short_text", required: true },
      { id: "incidentDate",      label: "Date of incident / onset of issue",            type: "date",       required: true },
      { id: "issueSummary",      label: "What is the issue? (Brief summary)",           type: "long_text",  required: true },
      { id: "pilJustification",  label: "Why does it require Public Interest Litigation?", type: "long_text", required: true,
        hint: "What makes this collective / systemic rather than an individual matter — affected community, absence of alternative remedy, fundamental rights at stake." },
      { id: "affectedGroups",    label: "Who is affected by the issue?",                type: "checkbox",
        options: ["Dalits", "Adivasis", "Minorities", "Women", "Children", "LGBTQ+", "Others"], required: true,
        hint: "Pick all that apply." },
      { id: "affectedCount",     label: "How many people are affected (approximate)",   type: "short_text", required: true,
        hint: "A number where possible; otherwise a description like 'entire panchayat (~2,000)' or 'all street vendors in the block'." },
      { id: "priorLegalAction",  label: "Has there been any prior legal action or representation?", type: "long_text", required: true,
        hint: "Yes/No + brief detail (case number, body approached, outcome)." },
      { id: "urgency",           label: "Urgency level of the issue",                   type: "radio",
        options: ["Low", "Medium", "High"], required: true },
    ],
  },

  // ── Legal Awareness Training Report ─────────────────────────────────────
  // After-action report for a community legal awareness training session —
  // location, attendance breakdowns, training content, methods used, and
  // any cases that surfaced during the session. Mirrors the Google Form
  // one-to-one.
  {
    id: "legal-awareness-training",
    name: "Legal Awareness Training Report",
    description: "After-action report for a community legal awareness training — venue, attendance breakdowns, content covered, methods used, and follow-up cases.",
    authorRoles: STAFF_AUTHORS,
    summary: { titleField: "venue", districtField: "district", dateField: "trainingDate" },
    fields: [
      // Section 1 — Where & when
      { id: "district",        label: "District",                              type: "dropdown",   options: BIHAR_DISTRICTS, required: true },
      { id: "block",           label: "Block",                                 type: "short_text", required: true },
      { id: "panchayat",       label: "Panchayat",                             type: "short_text", required: true },
      { id: "village",         label: "Village",                               type: "short_text", required: true },
      { id: "venue",           label: "Venue / location",                      type: "short_text", required: true },
      { id: "trainingDate",    label: "Date of legal awareness training",      type: "date",       required: true },

      // Section 2 — Who was there
      { id: "organisingTeam",  label: "Organising team members present",       type: "long_text",  required: true,
        hint: "Names + roles, comma-separated." },
      { id: "localAuthorities",label: "Local authorities present",             type: "long_text",  required: true,
        hint: "Sarpanch, BDO, SHO, DLSA panel lawyer, etc." },
      { id: "attendanceBreakdown", label: "Total community members attended", type: "long_text",  required: true,
        hint: "Break it down: Women / Dalit / Adivasi / Minority / Persons with Disabilities / Children." },
      { id: "socialCategories",label: "Social category of participants",       type: "checkbox",   options: SOCIAL_CATEGORIES, required: true },
      { id: "ageGroups",       label: "Age group of participants",             type: "checkbox",   options: AGE_GROUPS, required: true },
      { id: "stakeholders",    label: "Stakeholders present",                  type: "checkbox",   options: TRAINING_STAKEHOLDERS, required: true },

      // Section 3 — What was taught
      { id: "trainingContent", label: "Training content",                      type: "checkbox",   options: TRAINING_CONTENT_TOPICS, required: false,
        hint: "Pick all topics covered during the session." },
      { id: "keyMessages",     label: "Key messages shared",                   type: "long_text",  required: true,
        hint: "The headline messages you wanted participants to walk away with." },
      { id: "methodsUsed",     label: "Methods used",                          type: "checkbox",   options: TRAINING_METHODS, required: false },

      // Section 4 — Outcomes
      { id: "casesReported",   label: "Were any legal cases reported during the session?", type: "radio",
        options: ["Yes", "No"], required: true },
      { id: "casesReportedDetails", label: "If cases reported, their details", type: "long_text", required: false,
        hint: "Brief case summaries — district + nature of issue mandatory; names optional." },
      { id: "challenges",      label: "Challenges faced during the training",  type: "long_text",  required: true },
      { id: "submittedBy",     label: "Name of person submitting the report",  type: "short_text", required: true },
    ],
  },

  // ── Stakeholder Engagement Report ───────────────────────────────────────
  // Records a fellow / SW's engagement with external stakeholders — who was
  // met, why, what came of it, what's next. Restricted to director +
  // superadmin per organisational decision (rolled up to leadership level).
  {
    id: "stakeholder-engagement",
    name: "Stakeholder Engagement Report",
    description: "Record an engagement with external stakeholders — types, purpose, outcomes, follow-ups, and any new contacts identified.",
    authorRoles: ["director", "superadmin"],
    summary: { titleField: "fellowName", districtField: "district", dateField: "engagementDate" },
    fields: [
      { id: "fellowName",            label: "Name of the fellow / SW",                      type: "short_text", required: true },
      { id: "district",              label: "District",                                     type: "dropdown", options: BIHAR_DISTRICTS, required: true },
      { id: "engagementDate",        label: "Date",                                         type: "date",       required: true },

      { id: "stakeholderTypes",      label: "Types of stakeholders engaged",                type: "checkbox",
        options: STAKEHOLDER_TYPES, required: true,
        hint: "Pick all that apply." },
      { id: "meetingContext",        label: "Meeting with stakeholders",                    type: "short_text", required: false,
        hint: "Where / how the meeting happened (e.g. DLSA office Patna, weekly LDAC review)." },
      { id: "stakeholdersMet",       label: "Name(s) and designation(s) of stakeholders met", type: "long_text", required: true,
        hint: "One per line — name, designation, and (where relevant) the office/body." },

      { id: "engagementPurpose",     label: "Purpose of engagement",                        type: "checkbox",
        options: ENGAGEMENT_PURPOSES, required: true },
      { id: "interactionsSummary",   label: "Brief summary of key interactions",            type: "long_text",  required: false,
        hint: "What was discussed, asked, or agreed in the meeting." },
      { id: "followUpActions",       label: "Any follow-up actions required or planned",    type: "long_text",  required: false },

      { id: "supportOffered",        label: "Did the stakeholder offer any support / commitments?", type: "radio",
        options: ["Yes", "No"], required: true },
      { id: "supportDescription",    label: "If yes, please describe",                      type: "long_text",  required: false,
        hint: "Capture what was offered + by whom; leave blank if you answered No above." },

      { id: "engagementChallenges",  label: "Challenges faced in engagement (if any)",      type: "long_text",  required: true },
      { id: "newStakeholders",       label: "Any new stakeholders identified for future engagement?", type: "long_text", required: true,
        hint: "Names + designations + how to reach them — even one-line entries are useful." },
      { id: "submissionDate",        label: "Date of submission",                           type: "date",       required: true },
    ],
  },
];

export function lookupTemplate(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.id === id);
}

/** Validate a submitted `data` object against a template. Returns either a
 *  cleaned data record (with stripped extra keys, coerced types) or the
 *  first validation error encountered. Run on the server inside POST. */
export function validateAgainstTemplate(
  template: ReportTemplate,
  raw: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {};

  for (const f of template.fields) {
    const v = raw[f.id];
    const missing = v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
    if (missing) {
      if (f.required) return { ok: false, error: `"${f.label}" is required.` };
      continue;
    }

    switch (f.type) {
      case "short_text":
      case "long_text":
      case "url": {
        if (typeof v !== "string") return { ok: false, error: `"${f.label}" must be text.` };
        out[f.id] = v.trim().slice(0, f.type === "long_text" ? 5000 : 500);
        break;
      }
      case "number": {
        const n = typeof v === "number" ? v : Number(String(v).trim());
        if (!Number.isFinite(n)) return { ok: false, error: `"${f.label}" must be a number.` };
        out[f.id] = n;
        break;
      }
      case "date": {
        const s = String(v);
        const d = new Date(s);
        if (isNaN(d.getTime())) return { ok: false, error: `"${f.label}" must be a valid date.` };
        // Persist as YYYY-MM-DD to keep timezone semantics out of the way.
        out[f.id] = s.length === 10 ? s : d.toISOString().slice(0, 10);
        break;
      }
      case "dropdown":
      case "radio": {
        if (typeof v !== "string" || !f.options?.includes(v)) {
          return { ok: false, error: `"${f.label}" must be one of: ${f.options?.join(", ") ?? "(no options)"}` };
        }
        out[f.id] = v;
        break;
      }
      case "checkbox": {
        if (!Array.isArray(v)) return { ok: false, error: `"${f.label}" must be a list of selections.` };
        const allowed = new Set(f.options ?? []);
        const cleaned = v.filter((x): x is string => typeof x === "string" && allowed.has(x));
        if (f.required && cleaned.length === 0) {
          return { ok: false, error: `Pick at least one option for "${f.label}".` };
        }
        out[f.id] = cleaned;
        break;
      }
    }
  }
  return { ok: true, data: out };
}
