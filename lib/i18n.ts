/**
 * Lightweight app-wide i18n.
 *
 * Strings are translated *by their English source text* — call `t("Dashboard")`
 * and it returns the Hindi string when the active language is Hindi, otherwise
 * the original English. Missing keys fall back to the source string, so wrapping
 * a string in `t()` is always safe even before its translation is added here.
 *
 * The active language lives in a `lang` cookie + localStorage (see
 * components/i18n/LanguageProvider). To translate a new string, wrap it in
 * `t()` in a client component and add an entry to the `hi` map below.
 */

export type Lang = "en" | "hi";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi",   native: "हिन्दी" },
];

export const DEFAULT_LANG: Lang = "en";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "hi";
}

/** English source string → Hindi. */
const hi: Record<string, string> = {
  // ── Sidebar nav labels ──────────────────────────────────────────────
  "Dashboard": "डैशबोर्ड",
  "Overview": "अवलोकन",
  "Cases": "मामले",
  "All Cases": "सभी मामले",
  "Cases & Appointments": "मामले और अपॉइंटमेंट",
  "Appointments": "अपॉइंटमेंट",
  "Hearings": "सुनवाई",
  "Activities": "गतिविधियाँ",
  "Assign": "सौंपें",
  "Assign Tasks": "कार्य सौंपें",
  "Attendance": "उपस्थिति",
  "Care Plans": "देखभाल योजनाएँ",
  "Chat": "चैट",
  "Daily Report": "दैनिक रिपोर्ट",
  "Daily Reports": "दैनिक रिपोर्टें",
  "Escalate": "एस्केलेट करें",
  "Event Pipeline": "इवेंट पाइपलाइन",
  "Expense Approvals": "व्यय अनुमोदन",
  "Expense Verify": "व्यय सत्यापन",
  "Expenses": "व्यय",
  "My Expenses": "मेरे व्यय",
  "Finance": "वित्त",
  "Grievance": "शिकायत",
  "Grievances": "शिकायतें",
  "Head Lawyers": "मुख्य वकील",
  "Help & Support": "सहायता और समर्थन",
  "Helplines": "हेल्पलाइन",
  "HR": "मानव संसाधन",
  "Invoice Approvals": "चालान अनुमोदन",
  "Invoices": "चालान",
  "JNA Pro": "JNA प्रो",
  "Legal Tools": "कानूनी उपकरण",
  "Litigation": "मुकदमेबाज़ी",
  "Logistics": "लॉजिस्टिक्स",
  "Media Scanning": "मीडिया स्कैनिंग",
  "Offboarding": "ऑफबोर्डिंग",
  "Offices": "कार्यालय",
  "Onboarding": "ऑनबोर्डिंग",
  "PLV Requests": "PLV अनुरोध",
  "Policies": "नीतियाँ",
  "Projects": "परियोजनाएँ",
  "Queries": "प्रश्न",
  "Salaries": "वेतन",
  "Team Calendar": "टीम कैलेंडर",
  "Ticket Inbox": "टिकट इनबॉक्स",
  "Training": "प्रशिक्षण",
  "Users": "उपयोगकर्ता",
  "Voice Messages": "वॉइस संदेश",
  "Aangan (Child)": "आँगन (बाल)",
  "Notifications": "सूचनाएँ",
  "Profile": "प्रोफ़ाइल",
  "My Profile": "मेरी प्रोफ़ाइल",
  "Settings": "सेटिंग्स",

  // ── Role labels ─────────────────────────────────────────────────────
  "Administrator": "प्रशासक",
  "Director": "निदेशक",
  "Social Worker": "सामाजिक कार्यकर्ता",
  "Community Portal": "समुदाय पोर्टल",
  "HR Department": "मानव संसाधन विभाग",
  "Litigation Team": "मुकदमेबाज़ी टीम",
  "Super Admin": "सुपर एडमिन",

  // ── Common actions ──────────────────────────────────────────────────
  "Log out": "लॉग आउट",
  "Logout": "लॉग आउट",
  "Sign out": "साइन आउट",
  "Save": "सहेजें",
  "Saving…": "सहेजा जा रहा है…",
  "Cancel": "रद्द करें",
  "Edit": "संपादित करें",
  "Delete": "हटाएँ",
  "Search": "खोजें",
  "Loading…": "लोड हो रहा है…",

  // ── Settings page ───────────────────────────────────────────────────
  "Profile & Settings": "प्रोफ़ाइल और सेटिंग्स",
  "Account": "खाता",
  "Language": "भाषा",
  "Choose the language for the entire app.": "पूरे ऐप के लिए भाषा चुनें।",
  "Full name": "पूरा नाम",
  "Email": "ईमेल",
  "Email address": "ईमेल पता",
  "Password": "पासवर्ड",
  "New password": "नया पासवर्ड",
  "About": "परिचय",
  "Save changes": "परिवर्तन सहेजें",
  "Profile saved successfully.": "प्रोफ़ाइल सफलतापूर्वक सहेजी गई।",
  "No active session": "कोई सक्रिय सत्र नहीं",
  "Please sign in before updating your profile.": "अपनी प्रोफ़ाइल अपडेट करने से पहले कृपया साइन इन करें।",
  "Go to Login": "लॉगिन पर जाएँ",

  // ── Create-case form ────────────────────────────────────────────────
  "Add new case": "नया मामला जोड़ें",
  "Fill what you have. Anything not yet known can be added later from the case page.":
    "जो जानकारी उपलब्ध है वह भरें। बाकी बाद में मामले के पृष्ठ से जोड़ी जा सकती है।",
  "7. Community member": "7. समुदाय सदस्य",
  "Whose case is this? Optional — you can link the beneficiary later.":
    "यह किसका मामला है? वैकल्पिक — लाभार्थी को बाद में जोड़ा जा सकता है।",
  "Create case": "मामला बनाएँ",
  "Creating…": "बनाया जा रहा है…",

  // ── On-demand data translation (Translatable button) ────────────────
  "Translate": "अनुवाद करें",
  "Show original": "मूल दिखाएँ",
  "Translating…": "अनुवाद हो रहा है…",
  "Translation failed": "अनुवाद विफल",

  // ── Common actions / words ──────────────────────────────────────────
  "Change": "बदलें",
  "Remove": "हटाएँ",
  "Add": "जोड़ें",
  "Close": "बंद करें",
  "Open": "खोलें",
  "Yes": "हाँ",
  "No": "नहीं",
  "Status": "स्थिति",
  "Searching…": "खोज रहे हैं…",
  "No matches": "कोई मिलान नहीं",
  "total": "कुल",
  "Date / time of incident": "घटना की तारीख / समय",
  "Not assigned": "असाइन नहीं किया गया",
  "Not set": "सेट नहीं है",
  "locked": "लॉक किया गया",

  // ── Case detail — header & parties ──────────────────────────────────
  "Filed": "दायर किया गया",
  "Last updated": "अंतिम अद्यतन",
  "Next Hearing": "अगली सुनवाई",
  "Update Next Hearing Date": "अगली सुनवाई की तारीख अपडेट करें",
  "Save & Sync Calendar": "सहेजें और कैलेंडर सिंक करें",
  "Community": "समुदाय",
  "Litigation Member": "मुकदमेबाज़ी सदस्य",
  "Criminal": "आपराधिक",
  "High Court": "उच्च न्यायालय",

  // ── Case detail — tabs ──────────────────────────────────────────────
  "Legal Progress": "कानूनी प्रगति",
  "Individual Care Plan": "व्यक्तिगत देखभाल योजना",
  "Case Finance": "मामला वित्त",

  // ── Case detail — sections ──────────────────────────────────────────
  "Court appearances": "अदालत में उपस्थिति",
  "Case diary": "मामला डायरी",
  "Case History": "मामले का इतिहास",
  "Activity log": "गतिविधि लॉग",
  "Court & Parties": "अदालत और पक्ष",
  "Parties": "पक्ष",
  "Subject": "विषय",
  "Petitioner(s)": "याचिकाकर्ता",
  "Respondent(s) / Defendant(s)": "प्रतिवादी / बचाव पक्ष",
  "Case Management — Court Details": "मामला प्रबंधन — अदालत विवरण",
  "Case Enquiry — Intake Facts": "मामला पूछताछ — प्रारंभिक तथ्य",
  "Edit Intake Facts": "प्रारंभिक तथ्य संपादित करें",
  "Verdict": "फैसला",

  // ── Case detail — buttons / forms ───────────────────────────────────
  "Add Diary Entry": "डायरी प्रविष्टि जोड़ें",
  "Add Entry": "प्रविष्टि जोड़ें",
  "Log Court Appearance": "अदालत उपस्थिति दर्ज करें",
  "Edit Appearance": "उपस्थिति संपादित करें",
  "Edit Subject": "विषय संपादित करें",
  "Edit Parties": "पक्ष संपादित करें",
  "Edit title": "शीर्षक संपादित करें",
  "Change status": "स्थिति बदलें",
  "Rename": "नाम बदलें",
  "Record verdict": "फैसला दर्ज करें",
  "Add details": "विवरण जोड़ें",
  "Add parties": "पक्ष जोड़ें",
  "Add subject": "विषय जोड़ें",
  "Add intake facts": "प्रारंभिक तथ्य जोड़ें",
  "No documents attached yet.": "अभी तक कोई दस्तावेज़ संलग्न नहीं है।",
  "No diary entries yet.": "अभी तक कोई डायरी प्रविष्टि नहीं है।",
  "No court appearances logged yet.": "अभी तक कोई अदालत उपस्थिति दर्ज नहीं की गई है।",
  "No verdict recorded yet.": "अभी तक कोई फैसला दर्ज नहीं किया गया है।",
  "No intake facts recorded yet.": "अभी तक कोई प्रारंभिक तथ्य दर्ज नहीं किया गया है।",
  "No court details recorded yet.": "अभी तक कोई अदालत विवरण दर्ज नहीं किया गया है।",
  "No subject notes yet.": "अभी तक कोई विषय टिप्पणी नहीं है।",
  "No parties recorded yet.": "अभी तक कोई पक्ष दर्ज नहीं किया गया है।",

  // ── Case detail — field labels ──────────────────────────────────────
  "Court Type": "अदालत का प्रकार",
  "State": "राज्य",
  "Court / Forum": "अदालत / मंच",
  "Court Name": "अदालत का नाम",
  "Court Case / Registration No.": "अदालत मामला / पंजीकरण संख्या",
  "Relevant Sections": "प्रासंगिक धाराएँ",
  "Stage of the Case": "मामले की अवस्था",
  "Bail / Accused Appearance": "जमानत / अभियुक्त उपस्थिति",
  "Compensation status": "मुआवजा स्थिति",
  "Compensation": "मुआवजा",
  "Subject of the court": "अदालत का विषय",
  "Our points": "हमारे बिंदु",
  "Why we believe we have a case": "हमें क्यों लगता है कि हमारा मामला बनता है",
  "Date of Appearance": "उपस्थिति की तारीख",
  "Current Status": "वर्तमान स्थिति",
  "Daily Order Brief": "दैनिक आदेश सारांश",
  "Last Date of Hearing": "पिछली सुनवाई की तारीख",
  "Next Date of Hearing": "अगली सुनवाई की तारीख",
  "Remarks": "टिप्पणियाँ",
  "District": "जिला",
  "Cause Title": "वाद शीर्षक",
  "Victim": "पीड़ित",
  "Victim Name": "पीड़ित का नाम",
  "Victim Contact": "पीड़ित संपर्क",
  "Victim Address": "पीड़ित का पता",
  "Filer": "दाखिल करने वाला",
  "Filer Name": "दाखिल करने वाले का नाम",
  "Filer Phone": "दाखिल करने वाले का फ़ोन",
  "Relationship with Victim": "पीड़ित से संबंध",
  "Accused": "अभियुक्त",
  "Accused Name(s)": "अभियुक्त का नाम",
  "Accused Count": "अभियुक्तों की संख्या",
  "FIR No.": "एफआईआर संख्या",
  "FIR Number": "एफआईआर संख्या",
  "Police Station": "थाना",
  "Place of Occurrence": "घटना स्थल",
  "Issues": "मुद्दे",
  "Facts of the case": "मामले के तथ्य",
  "Filing Status": "दाखिल स्थिति",
  "Reporting": "रिपोर्टिंग",
  "e-Courts link": "ई-कोर्ट्स लिंक",
  "Supreme Court": "उच्चतम न्यायालय",
  "Civil / District Court": "सिविल / जिला न्यायालय",
  "Tribunal / Forum": "न्यायाधिकरण / मंच",
  "Drafting": "मसौदा तैयार",
  "Filing": "दाखिल किया जा रहा",
  "Defect": "त्रुटि",
  "Cleared": "स्वीकृत",
  "Pending": "लंबित",
  "Cure by": "तक ठीक करें",

  // ── Danger zone ─────────────────────────────────────────────────────
  "Danger Zone": "खतरा क्षेत्र",
  "Delete this case": "इस मामले को हटाएँ",
  "Delete permanently": "स्थायी रूप से हटाएँ",
  "Deleting…": "हटाया जा रहा है…",
};

const TABLES: Record<Lang, Record<string, string>> = { en: {}, hi };

/** Translate an English source string into `lang`. Falls back to the source. */
export function translate(lang: Lang, source: string): string {
  if (lang === "en") return source;
  return TABLES[lang]?.[source] ?? source;
}
