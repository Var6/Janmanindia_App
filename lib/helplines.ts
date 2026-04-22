export interface Helpline {
  name: string;
  hi: string;
  number: string;
  hours?: string;
  scope: "national" | "bihar";
}

export const NATIONAL_EMERGENCY: Helpline[] = [
  { name: "Police Emergency",          hi: "पुलिस आपातकाल",       number: "112",   scope: "national", hours: "24×7" },
  { name: "Women in Distress",         hi: "महिला हेल्पलाइन",        number: "181",   scope: "national", hours: "24×7" },
  { name: "Child Helpline (Childline)",hi: "चाइल्डलाइन",            number: "1098",  scope: "national", hours: "24×7" },
  { name: "Free Legal Aid (NALSA)",    hi: "नि:शुल्क कानूनी सहायता",  number: "15100", scope: "national", hours: "24×7" },
  { name: "Ayushman Bharat",           hi: "आयुष्मान भारत",          number: "14555", scope: "national" },
];

export const BIHAR_HELPLINES: Helpline[] = [
  { name: "Kanya Utthan Yojana",       hi: "कन्या उत्थान योजना",     number: "0612-2233333", scope: "bihar" },
  { name: "Student Credit Card",       hi: "स्टूडेंट क्रेडिट कार्ड",   number: "1800-3456-444", scope: "bihar" },
  { name: "Maha Dalit Vikas Mission",  hi: "महादलित विकास मिशन",   number: "0612-2217870",  scope: "bihar" },
];

export const ALL_HELPLINES = [...NATIONAL_EMERGENCY, ...BIHAR_HELPLINES];
