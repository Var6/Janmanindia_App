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
};

const TABLES: Record<Lang, Record<string, string>> = { en: {}, hi };

/** Translate an English source string into `lang`. Falls back to the source. */
export function translate(lang: Lang, source: string): string {
  if (lang === "en") return source;
  return TABLES[lang]?.[source] ?? source;
}
