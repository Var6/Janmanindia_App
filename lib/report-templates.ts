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
