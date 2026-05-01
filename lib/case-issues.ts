/**
 * Issue categories that classify what the *victim* feels has happened —
 * orthogonal to the legal procedure (`caseType` in `lib/case-types.ts`).
 *
 * Sourced from the original Janman "Case Enquiry" intake form so social
 * workers continue to see the same options they'd see on the Google Form.
 *
 * A case can have multiple issues (e.g. "Domestic Violence" + "Dowry and
 * Cruelty") so this is always stored as `string[]` on the case enquiry.
 */

export interface CaseIssue {
  /** Stable English label persisted in the DB. */
  value: string;
  /** Hindi translation shown alongside in the UI. */
  hi?: string;
}

export const CASE_ISSUES: CaseIssue[] = [
  { value: "Domestic Violence",            hi: "घरेलू हिंसा" },
  { value: "Sexual Harassment",            hi: "यौन उत्पीड़न" },
  { value: "POCSO" },
  { value: "Human Trafficking",            hi: "मानव तस्करी" },
  { value: "Acid Attack",                  hi: "एसिड अटैक" },
  { value: "Dowry and Cruelty",            hi: "दहेज और क्रूरता" },
  { value: "Matrimonial Dispute",          hi: "वैवाहिक विवाद" },
  { value: "Dalit Atrocities",             hi: "दलित अत्याचार" },
  { value: "Housing Rights",               hi: "आवास अधिकार" },
  { value: "Environmental Rights",         hi: "पर्यावरण अधिकार" },
  { value: "Displacement and Rehabilitation", hi: "विस्थापन एवं पुनर्वास" },
  { value: "Police Atrocities",            hi: "पुलिस अत्याचार" },
  { value: "Prisoner's Right",             hi: "कैदी का अधिकार" },
  { value: "Medical Negligence" },
  { value: "Murder" },
  { value: "Compensation Cases" },
  { value: "Custodial Death" },
];

const ISSUE_VALUES = new Set(CASE_ISSUES.map(i => i.value));

/** Reject anything not in the taxonomy. "Other" free-text is captured via
 *  `enquiry.factsOfTheCase` so the multi-select stays a controlled vocabulary. */
export function filterValidIssues(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v === "string" && ISSUE_VALUES.has(v) && !out.includes(v)) {
      out.push(v);
    }
  }
  return out;
}

/** Janman fellowship districts. Used by both the enquiry form (where the
 *  incident occurred) and the court appearance form (where the matter is
 *  registered). */
export const JANMAN_DISTRICTS = [
  "Araria",
  "Bhagalpur",
  "Katihar",
  "Kishanganj",
  "Patna",
  "Purnia",
] as const;

export type JanmanDistrict = (typeof JANMAN_DISTRICTS)[number];
