/**
 * Comprehensive list of case types from the Indian eCourts portal
 * (https://services.ecourts.gov.in / https://hcservices.ecourts.gov.in).
 *
 * Each entry carries:
 *   code     — the official eCourts short code shown on cause lists
 *   name     — human-readable English name
 *   hi       — Hindi name (best-effort)
 *   path     — which workflow this case follows in our app
 *              ("criminal" → criminalPath sub-document, "highcourt" → highCourtPath)
 *
 * Grouping keys mirror eCourts category buckets so users can scan quickly.
 */

export type WorkflowPath = "criminal" | "highcourt";

export interface CaseType {
  code: string;
  name: string;
  hi?: string;
  path: WorkflowPath;
}

export interface CaseTypeGroup {
  group: string;
  groupHi: string;
  description: string;
  types: CaseType[];
}

export const CASE_TYPES: CaseTypeGroup[] = [
  // ── 1. Criminal — Subordinate ─────────────────────────────────────────────
  {
    group: "Criminal — Subordinate Court",
    groupHi: "आपराधिक — अधीनस्थ न्यायालय",
    description: "FIR, sessions trial, magistrate complaints, bail",
    types: [
      { code: "FIR",     name: "First Information Report (FIR)",       hi: "प्राथमिकी",                path: "criminal" },
      { code: "ST",      name: "Sessions Trial",                       hi: "सत्र परीक्षण",              path: "criminal" },
      { code: "SC",      name: "Sessions Case",                        hi: "सत्र मुकदमा",               path: "criminal" },
      { code: "CC",      name: "Calendar Case (Magistrate Trial)",     hi: "कैलेंडर केस",               path: "criminal" },
      { code: "STC",     name: "Summons Trial Case",                   hi: "सम्मन केस",                 path: "criminal" },
      { code: "CR.MISC", name: "Criminal Miscellaneous Application",   hi: "आपराधिक विविध आवेदन",       path: "criminal" },
      { code: "CR.COMP", name: "Criminal Complaint Case",              hi: "आपराधिक शिकायत",           path: "criminal" },
      { code: "BA",      name: "Bail Application",                     hi: "जमानत आवेदन",               path: "criminal" },
      { code: "ABA",     name: "Anticipatory Bail Application",        hi: "अग्रिम जमानत आवेदन",        path: "criminal" },
      { code: "DV",      name: "Domestic Violence (DV Act 2005)",      hi: "घरेलू हिंसा अधिनियम",        path: "criminal" },
      { code: "MAINT",   name: "Maintenance — Section 125 BNSS",       hi: "गुजारा भत्ता — धारा 125",   path: "criminal" },
    ],
  },

  // ── 2. Special Acts ──────────────────────────────────────────────────────
  {
    group: "Special Act Cases",
    groupHi: "विशेष अधिनियम मुकदमे",
    description: "POCSO, SC/ST, NDPS, NI Act, JJ Act, etc.",
    types: [
      { code: "POCSO",   name: "POCSO Act (Child Sexual Offences)",    hi: "POCSO — बाल यौन अपराध",    path: "criminal" },
      { code: "SCST",    name: "SC/ST (Prevention of Atrocities) Act", hi: "SC/ST अत्याचार निवारण",     path: "criminal" },
      { code: "NDPS",    name: "NDPS Act (Narcotic Drugs)",            hi: "NDPS — नशीली दवाएँ",       path: "criminal" },
      { code: "NI.138",  name: "Negotiable Instruments §138 (Cheque Bounce)", hi: "चेक बाउंस — धारा 138", path: "criminal" },
      { code: "JJ",      name: "Juvenile Justice (JJ Act)",            hi: "किशोर न्याय अधिनियम",       path: "criminal" },
      { code: "PMLA",    name: "Prevention of Money Laundering Act",   hi: "PMLA — धन शोधन निवारण",   path: "criminal" },
      { code: "UAPA",    name: "Unlawful Activities (Prevention) Act", hi: "UAPA",                     path: "criminal" },
      { code: "ARMS",    name: "Arms Act",                             hi: "आयुध अधिनियम",              path: "criminal" },
      { code: "EXCISE",  name: "Excise / Prohibition Act",             hi: "आबकारी अधिनियम",            path: "criminal" },
      { code: "ELE.OFF", name: "Electricity Act Offences",             hi: "विद्युत अधिनियम अपराध",     path: "criminal" },
    ],
  },

  // ── 3. Civil — Subordinate ───────────────────────────────────────────────
  {
    group: "Civil — Subordinate Court",
    groupHi: "दीवानी — अधीनस्थ न्यायालय",
    description: "Suits, partition, eviction, money recovery, specific performance",
    types: [
      { code: "OS",      name: "Original Suit",                        hi: "मूल वाद",                   path: "highcourt" },
      { code: "TS",      name: "Title Suit",                           hi: "शीर्षक वाद",                path: "highcourt" },
      { code: "MS",      name: "Money Suit",                           hi: "धन वाद",                    path: "highcourt" },
      { code: "PS",      name: "Partition Suit",                       hi: "विभाजन वाद",                path: "highcourt" },
      { code: "RCP",     name: "Rent Control Petition / Eviction",     hi: "किराया नियंत्रण याचिका",    path: "highcourt" },
      { code: "SP",      name: "Specific Performance Suit",            hi: "विशिष्ट निष्पादन वाद",       path: "highcourt" },
      { code: "DEC",     name: "Declaratory Suit",                     hi: "घोषणात्मक वाद",             path: "highcourt" },
      { code: "INJ",     name: "Permanent / Temporary Injunction",     hi: "निषेधाज्ञा वाद",             path: "highcourt" },
      { code: "PROB",    name: "Probate / Letter of Administration",   hi: "वसीयतनामा / प्रशासन-पत्र", path: "highcourt" },
      { code: "SUCC",    name: "Succession Certificate",               hi: "उत्तराधिकार प्रमाणपत्र",     path: "highcourt" },
      { code: "EP",      name: "Execution Petition",                   hi: "निष्पादन याचिका",            path: "highcourt" },
      { code: "ARB",     name: "Arbitration Petition",                 hi: "मध्यस्थता याचिका",          path: "highcourt" },
    ],
  },

  // ── 4. Family Court ──────────────────────────────────────────────────────
  {
    group: "Family Court",
    groupHi: "पारिवारिक न्यायालय",
    description: "Divorce, custody, guardianship, restitution",
    types: [
      { code: "HMA",      name: "Divorce — Hindu Marriage Act",        hi: "तलाक — हिंदू विवाह अधिनियम", path: "highcourt" },
      { code: "MA",       name: "Marriage Act Petition",               hi: "विवाह अधिनियम याचिका",     path: "highcourt" },
      { code: "RFCR",     name: "Restitution of Conjugal Rights",      hi: "दाम्पत्य अधिकार पुनर्स्थापन", path: "highcourt" },
      { code: "GUARD",    name: "Guardianship / Custody",              hi: "संरक्षण / कस्टडी",          path: "highcourt" },
      { code: "CMA",      name: "Christian Marriage Act",              hi: "ईसाई विवाह अधिनियम",       path: "highcourt" },
      { code: "MWPA",     name: "Muslim Women (PRD) Act",              hi: "मुस्लिम महिला अधिकार अधि.",  path: "highcourt" },
      { code: "SMA",      name: "Special Marriage Act",                hi: "विशेष विवाह अधिनियम",       path: "highcourt" },
      { code: "ADOPT",    name: "Adoption Petition",                   hi: "गोद लेने की याचिका",        path: "highcourt" },
    ],
  },

  // ── 5. Motor Accident & Consumer ─────────────────────────────────────────
  {
    group: "Motor Accident & Consumer",
    groupHi: "मोटर दुर्घटना और उपभोक्ता",
    description: "MACT claims, consumer disputes, insurance",
    types: [
      { code: "MACT",     name: "Motor Accident Claim (MACT)",         hi: "मोटर दुर्घटना दावा",        path: "highcourt" },
      { code: "MAC.APP",  name: "Motor Accident Appeal",               hi: "मोटर दुर्घटना अपील",        path: "highcourt" },
      { code: "CC.CONS",  name: "Consumer Complaint",                  hi: "उपभोक्ता शिकायत",           path: "highcourt" },
      { code: "INS.CL",   name: "Insurance Claim Petition",            hi: "बीमा दावा याचिका",         path: "highcourt" },
    ],
  },

  // ── 6. Labour & Industrial ───────────────────────────────────────────────
  {
    group: "Labour & Industrial",
    groupHi: "श्रम और औद्योगिक",
    description: "Wages, ID Act, Workmen Compensation",
    types: [
      { code: "ID",       name: "Industrial Dispute",                  hi: "औद्योगिक विवाद",            path: "highcourt" },
      { code: "WC",       name: "Workmen's Compensation",              hi: "कामगार मुआवजा",             path: "highcourt" },
      { code: "LCA",      name: "Labour Court Appeal",                 hi: "श्रम न्यायालय अपील",        path: "highcourt" },
      { code: "PAY.WG",   name: "Payment of Wages Petition",           hi: "मजदूरी भुगतान याचिका",      path: "highcourt" },
      { code: "ESI",      name: "Employees' State Insurance",          hi: "कर्मचारी राज्य बीमा",       path: "highcourt" },
    ],
  },

  // ── 7. Revenue & Land ────────────────────────────────────────────────────
  {
    group: "Revenue & Land",
    groupHi: "राजस्व और भूमि",
    description: "Mutation, land records, ceiling, tenancy",
    types: [
      { code: "MUT",      name: "Mutation Petition",                   hi: "नामांतरण याचिका",           path: "highcourt" },
      { code: "LR",       name: "Land Records Correction",             hi: "भूमि अभिलेख सुधार",         path: "highcourt" },
      { code: "TEN",      name: "Tenancy Suit",                        hi: "कृषक वाद",                 path: "highcourt" },
      { code: "CEIL",     name: "Land Ceiling Case",                   hi: "भू-सीमा मुकदमा",           path: "highcourt" },
      { code: "ACQ",      name: "Land Acquisition Case",               hi: "भूमि अधिग्रहण",             path: "highcourt" },
    ],
  },

  // ── 8. High Court — Writ & Appeals ───────────────────────────────────────
  {
    group: "High Court — Writ & Appeals",
    groupHi: "उच्च न्यायालय — रिट और अपील",
    description: "Article 226/227 writs, civil/criminal appeals, revisions",
    types: [
      { code: "WP(C)",    name: "Writ Petition (Civil) — Art. 226",    hi: "रिट याचिका (दीवानी)",       path: "highcourt" },
      { code: "WP(Crl)",  name: "Writ Petition (Criminal) — Art. 226", hi: "रिट याचिका (आपराधिक)",      path: "highcourt" },
      { code: "PIL",      name: "Public Interest Litigation",          hi: "जनहित याचिका",              path: "highcourt" },
      { code: "CWJC",     name: "Civil Writ Jurisdiction Case",        hi: "सिविल रिट क्षेत्राधिकार",   path: "highcourt" },
      { code: "CA",       name: "Civil Appeal",                        hi: "दीवानी अपील",               path: "highcourt" },
      { code: "Crl.A",    name: "Criminal Appeal",                     hi: "आपराधिक अपील",              path: "criminal" },
      { code: "Crl.Rev",  name: "Criminal Revision",                   hi: "आपराधिक पुनरीक्षण",         path: "criminal" },
      { code: "Civil.Rev",name: "Civil Revision",                      hi: "दीवानी पुनरीक्षण",          path: "highcourt" },
      { code: "LPA",      name: "Letters Patent Appeal",               hi: "लेटर्स पेटेंट अपील",        path: "highcourt" },
      { code: "Crl.Misc", name: "Criminal Miscellaneous (HC)",         hi: "आपराधिक विविध (HC)",       path: "criminal" },
      { code: "Quash",    name: "Quashing Petition — §482 BNSS",       hi: "FIR/मुकदमा रद्द — धारा 482", path: "criminal" },
      { code: "TRP",      name: "Transfer Petition",                   hi: "स्थानांतरण याचिका",         path: "highcourt" },
      { code: "ContemptC",name: "Contempt of Court",                   hi: "न्यायालय अवमानना",          path: "highcourt" },
      { code: "MA",       name: "Miscellaneous Appeal",                hi: "विविध अपील",                path: "highcourt" },
      { code: "MJC",      name: "Miscellaneous Judicial Case",         hi: "विविध न्यायिक मुकदमा",      path: "highcourt" },
      { code: "FA",       name: "First Appeal",                        hi: "प्रथम अपील",               path: "highcourt" },
      { code: "SA",       name: "Second Appeal",                       hi: "द्वितीय अपील",             path: "highcourt" },
    ],
  },

  // ── 9. Supreme Court / Tribunals ─────────────────────────────────────────
  {
    group: "Supreme Court & Tribunals",
    groupHi: "सर्वोच्च न्यायालय और न्यायाधिकरण",
    description: "SLP, Article 32 writs, ITAT, NCLT, CAT, NGT",
    types: [
      { code: "SLP(C)",   name: "Special Leave Petition (Civil)",      hi: "विशेष अनुमति याचिका (दीवानी)",    path: "highcourt" },
      { code: "SLP(Crl)", name: "Special Leave Petition (Criminal)",   hi: "विशेष अनुमति याचिका (आपराधिक)",   path: "highcourt" },
      { code: "WP(SC)",   name: "SC Writ Petition — Art. 32",          hi: "SC रिट याचिका — अनु. 32",        path: "highcourt" },
      { code: "ITAT",     name: "Income Tax Appellate Tribunal",       hi: "आयकर अपीलीय न्यायाधिकरण",       path: "highcourt" },
      { code: "NCLT",     name: "National Company Law Tribunal",       hi: "NCLT",                          path: "highcourt" },
      { code: "CAT",      name: "Central Administrative Tribunal",     hi: "केंद्रीय प्रशासनिक न्यायाधिकरण", path: "highcourt" },
      { code: "NGT",      name: "National Green Tribunal",             hi: "राष्ट्रीय हरित न्यायाधिकरण",     path: "highcourt" },
      { code: "DRT",      name: "Debt Recovery Tribunal",              hi: "ऋण वसूली न्यायाधिकरण",          path: "highcourt" },
    ],
  },

  // ── 10. Other / Unclassified ─────────────────────────────────────────────
  {
    group: "Other",
    groupHi: "अन्य",
    description: "Anything not listed above",
    types: [
      { code: "OTHER",    name: "Other (describe in case title)",      hi: "अन्य",                     path: "highcourt" },
    ],
  },
];

/** Flat lookup: code → CaseType (with group). */
export interface FlatCaseType extends CaseType {
  group: string;
}

const FLAT_INDEX = new Map<string, FlatCaseType>();
for (const g of CASE_TYPES) {
  for (const t of g.types) {
    if (!FLAT_INDEX.has(t.code)) {
      FLAT_INDEX.set(t.code, { ...t, group: g.group });
    }
  }
}

export function lookupCaseType(code: string): FlatCaseType | undefined {
  return FLAT_INDEX.get(code);
}
