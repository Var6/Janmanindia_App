/**
 * Court taxonomy used by the litigation case-creation flow.
 *
 * The lookup chain a litigation member walks is:
 *   1. Pick a `CourtType` — supreme / highcourt / district / other
 *   2. For "highcourt": pick from HIGH_COURTS (one per HC, regardless of bench)
 *   3. For "district":  pick a state, then a district court inside it
 *   4. For "supreme":   no further pick — it's the Supreme Court of India
 *   5. For "other":     a free-text input (tribunals, consumer fora, etc.)
 *
 * The DISTRICT_COURTS list below is intentionally a *representative* slice,
 * not exhaustive — there are ~700 district courts in India and a flat list
 * would be unusable. Every state entry ends with an "Other (specify)" item
 * so a litigation member can always type in the actual court name. The
 * director can extend the list over time via PRs as new venues recur.
 */

export type CourtType = "supreme" | "highcourt" | "district" | "other";

export const COURT_TYPES: { value: CourtType; label: string; description: string }[] = [
  { value: "supreme",   label: "Supreme Court",                  description: "SLP, Article 32 writ, Civil/Criminal appeals to SC" },
  { value: "highcourt", label: "High Court",                     description: "Article 226/227 writ, civil/criminal appeals, revisions" },
  { value: "district",  label: "Civil / District Court",         description: "Trial courts — Sessions, CJM, Munsiff, MACT, Family" },
  { value: "other",     label: "Other (Tribunal / Forum / etc.)", description: "NCLT, NGT, CAT, Consumer Forum, DRT, HRC, etc." },
];

/** Indian states & UTs — used as the parent picker for district courts.
 *  Order matches the official Government of India listing. */
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories with their own court infrastructure
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu", "Lakshadweep",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** High Courts of India. One entry per HC even when its jurisdiction spans
 *  multiple states (e.g. Bombay HC covers Maharashtra + Goa + DNH-DD). */
export const HIGH_COURTS = [
  "Allahabad High Court",
  "Andhra Pradesh High Court",
  "Bombay High Court",
  "Calcutta High Court",
  "Chhattisgarh High Court",
  "Delhi High Court",
  "Gauhati High Court",
  "Gujarat High Court",
  "Himachal Pradesh High Court",
  "Jammu & Kashmir and Ladakh High Court",
  "Jharkhand High Court",
  "Karnataka High Court",
  "Kerala High Court",
  "Madhya Pradesh High Court",
  "Madras High Court",
  "Manipur High Court",
  "Meghalaya High Court",
  "Orissa High Court",
  "Patna High Court",
  "Punjab & Haryana High Court",
  "Rajasthan High Court",
  "Sikkim High Court",
  "Telangana High Court",
  "Tripura High Court",
  "Uttarakhand High Court",
] as const;

/** Representative district / civil court list per state. Each state ends
 *  with an "Other (specify)" sentinel — the form will surface a free-text
 *  input when this is selected so any court not in the list can still be
 *  recorded. Director-level edits to this map ship via code review (PR). */
export const DISTRICT_COURTS: Record<string, string[]> = {
  // Bihar — Janman fellowship districts get the most coverage; rest of Bihar
  // is one entry + "Other" for unfamiliar venues.
  "Bihar": [
    "District Court, Patna",
    "Civil Court, Patna",
    "Family Court, Patna",
    "POCSO Special Court, Patna",
    "District Court, Bhagalpur",
    "District Court, Purnia",
    "District Court, Katihar",
    "District Court, Kishanganj",
    "District Court, Araria",
    "Other (specify)",
  ],
  "Delhi": [
    "Tis Hazari Courts",
    "Patiala House Courts",
    "Karkardooma Courts",
    "Saket District Courts",
    "Rohini District Courts",
    "Dwarka District Courts",
    "Rouse Avenue Courts",
    "Other (specify)",
  ],
  "Maharashtra": [
    "City Civil Court, Mumbai",
    "Sessions Court, Mumbai",
    "Family Court, Mumbai",
    "District Court, Pune",
    "District Court, Nagpur",
    "District Court, Aurangabad",
    "District Court, Thane",
    "Other (specify)",
  ],
  "Uttar Pradesh": [
    "District Court, Lucknow",
    "District Court, Kanpur Nagar",
    "District Court, Varanasi",
    "District Court, Allahabad (Prayagraj)",
    "District Court, Agra",
    "District Court, Ghaziabad",
    "District Court, Meerut",
    "District Court, Noida (Gautam Buddha Nagar)",
    "Other (specify)",
  ],
  "West Bengal": [
    "City Civil Court, Calcutta",
    "City Sessions Court, Calcutta",
    "District Court, Howrah",
    "District Court, Darjeeling",
    "Other (specify)",
  ],
  "Karnataka": [
    "City Civil Court, Bengaluru",
    "City Sessions Court, Bengaluru",
    "District Court, Mysuru",
    "District Court, Mangalore",
    "Other (specify)",
  ],
  "Tamil Nadu": [
    "City Civil Court, Chennai",
    "Sessions Court, Chennai",
    "District Court, Coimbatore",
    "District Court, Madurai",
    "Other (specify)",
  ],
  "Kerala": [
    "District Court, Thiruvananthapuram",
    "District Court, Kochi (Ernakulam)",
    "District Court, Kozhikode",
    "Other (specify)",
  ],
  "Telangana": [
    "City Civil Court, Hyderabad",
    "Metropolitan Sessions Court, Hyderabad",
    "Family Court, Hyderabad",
    "Other (specify)",
  ],
  "Andhra Pradesh": [
    "District Court, Vijayawada",
    "District Court, Visakhapatnam",
    "Other (specify)",
  ],
  "Gujarat": [
    "City Civil & Sessions Court, Ahmedabad",
    "District Court, Surat",
    "District Court, Vadodara",
    "Other (specify)",
  ],
  "Rajasthan": [
    "District Court, Jaipur",
    "District Court, Jodhpur",
    "District Court, Udaipur",
    "Other (specify)",
  ],
  "Madhya Pradesh": [
    "District Court, Bhopal",
    "District Court, Indore",
    "District Court, Jabalpur",
    "Other (specify)",
  ],
  "Odisha": [
    "District Court, Cuttack",
    "District Court, Bhubaneswar (Khordha)",
    "Other (specify)",
  ],
  "Punjab": [
    "District Court, Ludhiana",
    "District Court, Amritsar",
    "District Court, Jalandhar",
    "Other (specify)",
  ],
  "Haryana": [
    "District Court, Gurugram",
    "District Court, Faridabad",
    "District Court, Hisar",
    "Other (specify)",
  ],
  "Jharkhand": [
    "District Court, Ranchi",
    "District Court, Jamshedpur (East Singhbhum)",
    "District Court, Dhanbad",
    "Other (specify)",
  ],
  "Chhattisgarh": [
    "District Court, Raipur",
    "District Court, Bilaspur",
    "Other (specify)",
  ],
  "Assam": [
    "District Court, Guwahati (Kamrup-Metro)",
    "District Court, Dibrugarh",
    "Other (specify)",
  ],
  "Uttarakhand": [
    "District Court, Dehradun",
    "District Court, Nainital",
    "Other (specify)",
  ],
  "Himachal Pradesh": [
    "District Court, Shimla",
    "Other (specify)",
  ],
  "Goa": [
    "District Court, Panaji (North Goa)",
    "District Court, Margao (South Goa)",
    "Other (specify)",
  ],
  "Chandigarh": [
    "District Court, Chandigarh",
    "Other (specify)",
  ],
  "Jammu & Kashmir": [
    "District Court, Srinagar",
    "District Court, Jammu",
    "Other (specify)",
  ],
};

/** Format hint strings shown next to the case-number input on the create
 *  form. None of these are validated server-side — court numbering is too
 *  inconsistent across states and case categories for a regex to be safe.
 *  These are *examples* meant to guide the litigation member. */
export const CASE_NUMBER_HINTS: Record<CourtType, string> = {
  supreme:   "e.g. SLP(C) 1234/2026 · WP(Crl) 56/2026 · Diary No. 7890/2026",
  highcourt: "e.g. WP(C) 1234/2026 · CRL.M.C. 56/2026 · LPA 78/2026 · CRA 89/2026",
  district:  "e.g. CC/123/2026 · GR 456/2026 · ST 78/2026 · MACT 12/2026 · OS 345/2026",
  other:     "Whatever number the tribunal / forum uses — free text",
};

/** Filing status — used when a case is being prepared but doesn't yet have
 *  a court-assigned number. Once a number arrives the litigation member
 *  fills `courtCaseNumber` and the filingStatus typically goes to "filed". */
export const FILING_STATUSES = [
  { value: "drafting",  label: "Drafting in progress",  description: "Petition / pleadings being prepared" },
  { value: "filing",    label: "Filing",                description: "Submitted to registry, awaiting number" },
  { value: "filed",     label: "Filed",                 description: "Number assigned, case on the rolls" },
] as const;

/** Stamp / scrutiny reporting status from the registry. "Conflict" means
 *  the registry returned defects; the form then captures a deadline so the
 *  dashboard can warn before it lapses. */
export const REPORTING_STATUSES = [
  { value: "pending",  label: "Pending",  description: "Awaiting registry scrutiny" },
  { value: "success",  label: "Cleared",  description: "Reported — no defects" },
  { value: "conflict", label: "Defect",   description: "Registry raised defects — must be cured by the deadline" },
] as const;

/** Case-status enum the litigation team works with. The Case model still
 *  accepts the legacy values (Open / Closed / Escalated / Pending /
 *  Dismissed) for old rows; new UIs prefer this shorter set. */
export const LITIGATION_STATUSES = [
  { value: "Pending",   label: "Pending",   description: "Sub judice — being heard"            },
  { value: "Disposal",  label: "Disposal",  description: "Disposed of by the court"            },
  { value: "Withdrawn", label: "Withdrawn", description: "Withdrawn by the petitioner / party" },
] as const;

/** True when the supplied state has a curated district-court list. The form
 *  falls back to free text when this is false. */
export function hasDistrictCourtList(state: string): boolean {
  return Boolean(DISTRICT_COURTS[state]?.length);
}
