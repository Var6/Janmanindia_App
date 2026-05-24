export type TrainingModule = {
  id: string;
  title: string;
  hi: string;
  icon: string;
  content: string;
  hi_content: string;
  quiz: Array<{
    q: string;
    hi_q: string;
    options: string[];
    correct: number;
  }>;
};

export type TrainingAudience = "all" | "sw" | "pl" | "ls" | "lw";
export type TrainingCourseStatus = "live" | "coming_soon";

export type TrainingAcademyStats = {
  programmesLive: string;
  coursesAndTracks: string;
  hoursOfContent: string;
  caseAnalyses: string;
};

export type TrainingFlagshipTrack = {
  id: string;
  title: string;
  hi: string;
  icon: string;
  accent: string;
  summary: string;
  tags: string[];
  href: string;
  levels: Array<{
    label: string;
    title: string;
    summary: string;
  }>;
};

export type TrainingCourse = {
  id: string;
  title: string;
  hi: string;
  summary: string;
  audiences: TrainingAudience[];
  keywords: string[];
  levelsLabel: string;
  durationLabel: string;
  status: TrainingCourseStatus;
  accent: string;
  badge?: string;
  href?: string;
  certificate?: string;
};

export type TrainingLearningPath = {
  id: string;
  title: string;
  icon: string;
  summary: string;
  courseCount: string;
  duration: string;
  certificates: string;
  href: string;
  accent: string;
};

export const QUICK_PLV_MODULES: TrainingModule[] = [
  {
    id: "m1",
    title: "FIR — Your Rights",
    hi: "FIR — आपके अधिकार",
    icon: "📋",
    content:
      "You have the RIGHT to file an FIR at any police station for any cognisable offence. Police cannot refuse. Zero FIR means any station must register for any area. If refused: go to DSP/SP office, write to the Magistrate, or file a private complaint under BNSS.",
    hi_content:
      "आपको किसी भी संज्ञेय अपराध के लिए किसी भी थाने में FIR दर्ज कराने का अधिकार है। पुलिस मना नहीं कर सकती। Zero FIR का मतलब है कि किसी भी जिले का मामला हो, कोई भी थाना FIR दर्ज करेगा। मना करने पर DSP/SP, मजिस्ट्रेट, या BNSS के तहत शिकायत करें।",
    quiz: [
      {
        q: "Can police refuse to file Zero FIR?",
        hi_q: "क्या पुलिस Zero FIR दर्ज करने से मना कर सकती है?",
        options: [
          "Yes, if it is another district",
          "No — Zero FIR must be registered at any station",
          "Only SP can decide",
        ],
        correct: 1,
      },
    ],
  },
  {
    id: "m2",
    title: "Rights of Arrested Person",
    hi: "गिरफ्तार व्यक्ति के अधिकार",
    icon: "⚖",
    content:
      "When arrested, you have the RIGHT to know the reason, inform family immediately, meet a lawyer, be produced before a Magistrate within 24 hours, not be tortured, and receive free legal aid if you cannot afford a lawyer.",
    hi_content:
      "गिरफ्तारी पर कारण जानने, परिवार को सूचित करने, वकील से मिलने, 24 घंटे में मजिस्ट्रेट के सामने पेश होने, यातना से सुरक्षा, और जरूरत पर मुफ्त कानूनी सहायता का अधिकार है।",
    quiz: [
      {
        q: "Can police hold a person without producing before Magistrate for more than 24 hours?",
        hi_q: "क्या पुलिस 24 घंटे से ज्यादा बिना मजिस्ट्रेट के किसी को रख सकती है?",
        options: ["Yes, for 48 hours", "No, must produce within 24 hours", "Yes, up to 7 days"],
        correct: 1,
      },
    ],
  },
  {
    id: "m3",
    title: "POCSO — Protecting Children",
    hi: "POCSO — बच्चों की सुरक्षा",
    icon: "🛡",
    content:
      "POCSO Act 2012 protects all persons under 18 from sexual abuse. Any person with knowledge of abuse must report it to police or DCPU. Never disclose a child's identity. Call 1098 immediately when urgent help is needed.",
    hi_content:
      "POCSO Act 2012 18 वर्ष से कम सभी बच्चों को यौन हिंसा से सुरक्षा देता है। किसी भी व्यक्ति को जानकारी होने पर रिपोर्ट करना जरूरी है। बच्चे की पहचान कभी उजागर न करें। तुरंत मदद के लिए 1098 पर कॉल करें।",
    quiz: [
      {
        q: "If a teacher witnesses abuse of a student, must they report it?",
        hi_q: "अगर शिक्षक बच्चे के साथ दुर्व्यवहार देखे, क्या उसे रिपोर्ट करना जरूरी है?",
        options: ["Only if the parent asks", "No — it is optional", "Yes — reporting is mandatory"],
        correct: 2,
      },
    ],
  },
  {
    id: "m4",
    title: "Domestic Violence — Protection",
    hi: "घरेलू हिंसा — संरक्षण",
    icon: "🏠",
    content:
      "PWDVA 2005 protects women from physical, emotional, sexual, verbal, and economic violence by family members. Remedies include protection orders, residence orders, monetary relief, and child custody support.",
    hi_content:
      "PWDVA 2005 परिवार के सदस्यों द्वारा शारीरिक, भावनात्मक, यौन, मौखिक और आर्थिक हिंसा से महिलाओं की रक्षा करता है। संरक्षण आदेश, निवास का अधिकार, मुआवजा और बच्चों की अभिरक्षा जैसी राहत मिल सकती है।",
    quiz: [
      {
        q: "Does PWDVA cover a woman living in a live-in relationship?",
        hi_q: "क्या PWDVA लिव-इन संबंध में रह रही महिला को भी सुरक्षा देता है?",
        options: ["No — only married women", "Yes — covers married and live-in partners", "Only if they have children"],
        correct: 1,
      },
    ],
  },
  {
    id: "m5",
    title: "SC/ST Atrocities Act",
    hi: "SC/ST अत्याचार निवारण अधिनियम",
    icon: "✊",
    content:
      "The SC/ST Prevention of Atrocities Act 1989 protects SC/ST communities from violence, land seizure, insults, and social exclusion. FIR registration is mandatory and anticipatory bail is heavily restricted.",
    hi_content:
      "SC/ST अत्याचार निवारण अधिनियम 1989 SC/ST समुदायों को हिंसा, जमीन छीनने, अपमान और सामाजिक बहिष्कार से सुरक्षा देता है। FIR अनिवार्य है और अग्रिम जमानत पर कड़ा प्रतिबंध है।",
    quiz: [
      {
        q: "Can a person accused under the SC/ST Act get anticipatory bail?",
        hi_q: "क्या SC/ST Act के आरोपी को अग्रिम जमानत मिल सकती है?",
        options: ["Yes, from High Court", "No — anticipatory bail is not ordinarily available", "Only if victim agrees"],
        correct: 1,
      },
    ],
  },
  {
    id: "m6",
    title: "Land Rights in Bihar",
    hi: "बिहार में भूमि अधिकार",
    icon: "🌾",
    content:
      "Every landless family should know about homestead land rights, mutation rights, and land restoration remedies. If land is forcibly taken, combine revenue remedies with criminal protection where applicable.",
    hi_content:
      "हर भूमिहीन परिवार को होमस्टेड भूमि, नामांतरण और जमीन वापस पाने के उपायों की जानकारी होनी चाहिए। जबरन कब्जा होने पर राजस्व और आपराधिक दोनों उपाय जरूरी हो सकते हैं।",
    quiz: [
      {
        q: "Under Bihar Homestead protections, how much land is often discussed as a basic homestead entitlement?",
        hi_q: "बिहार होमस्टेड अधिकारों में बुनियादी अधिकार के रूप में कितनी जमीन का उल्लेख आता है?",
        options: ["10 decimals", "Up to 3 decimals", "1 bigha"],
        correct: 1,
      },
    ],
  },
];

export const TRAINING_ACADEMY_STATS: TrainingAcademyStats = {
  programmesLive: "3 live programmes",
  coursesAndTracks: "13 courses and tracks",
  hoursOfContent: "50+ hours",
  caseAnalyses: "30+ landmark case analyses",
};

export const FLAGSHIP_PLV_TRACKS: TrainingFlagshipTrack[] = [
  {
    id: "child-rights-plv",
    title: "Child Rights: Paralegal Volunteer Track",
    hi: "बाल अधिकार: पैरालीगल स्वयंसेवक ट्रैक",
    icon: "📋",
    accent: "#15803D",
    summary:
      "A structured PLV pathway focused on child protection complaints, DLSA support, compensation, RTI, and community action.",
    tags: ["3 levels", "Final certificate", "Child protection"],
    href: "https://shashwat-sys.github.io/janman-training/child-rights/paralegal/index.html",
    levels: [
      {
        label: "Level 1",
        title: "Legal Framework: POCSO, JJ Act & Child Offences",
        summary: "Build the doctrinal base that a PLV needs before field intake and referrals.",
      },
      {
        label: "Level 2",
        title: "Victim Support, Legal Aid & Compensation",
        summary: "Learn how to support survivors through aid, compensation, and referral systems.",
      },
      {
        label: "Level 3",
        title: "Field Practice: Complaints, RTI & Community Action",
        summary: "Move into complaints drafting, RTI, Childline coordination, and local mobilisation.",
      },
      {
        label: "Certificate",
        title: "Final Certification",
        summary: "Unlock the Jan Nyaya Abhiyan certificate after completing all levels.",
      },
    ],
  },
  {
    id: "gbv-programme",
    title: "Gender-Based Violence & Women's Protection Laws",
    hi: "जेंडर आधारित हिंसा और महिला संरक्षण कानून",
    icon: "⚖",
    accent: "#C2410C",
    summary:
      "A three-level programme spanning foundational law, detailed procedures, and advanced strategy for GBV response and litigation.",
    tags: ["3 levels", "GBV certificate", "Women's protection laws"],
    href: "https://shashwat-sys.github.io/janman-training/gbv/index.html",
    levels: [
      {
        label: "Level 1",
        title: "Foundational Women's Protection Laws",
        summary: "IPC/BNS, PWDVA, POCSO, POSH, PCMA, and the core structure of protection laws.",
      },
      {
        label: "Level 2",
        title: "Detailed Law & Procedures",
        summary: "ICC procedure, protection orders, reporting duties, BNS sections, and landmark judgments.",
      },
      {
        label: "Level 3",
        title: "Strategic Litigation & Evidence",
        summary: "Evidence collection, drafting, bail opposition, and advanced litigation strategy.",
      },
      {
        label: "Certificate",
        title: "Final GBV Training Certificate",
        summary: "Complete all modules to unlock a digitally signed certificate.",
      },
    ],
  },
  {
    id: "constitutional-rights",
    title: "Fundamental Rights & Directive Principles",
    hi: "मौलिक अधिकार एवं नीति निर्देशक तत्व",
    icon: "🏛",
    accent: "#1D4ED8",
    summary:
      "A constitutional literacy track that moves from Part III rights into DPSP, duties, PIL, and major Supreme Court jurisprudence.",
    tags: ["3 levels", "4 certificates", "PIL and jurisprudence"],
    href: "https://shashwat-sys.github.io/janman-training/fundamental-rights/index.html",
    levels: [
      {
        label: "Level 1",
        title: "Fundamental Rights",
        summary: "Articles 12–35, equality, freedom, exploitation, religion, and constitutional remedies.",
      },
      {
        label: "Level 2",
        title: "DPSP & Fundamental Duties",
        summary: "Part IV, Article 51A, FR-DPSP balance, and social justice obligations.",
      },
      {
        label: "Level 3",
        title: "Landmark Cases & PIL",
        summary: "Kesavananda, Maneka Gandhi, Minerva Mills, PIL practice, and recent constitutional developments.",
      },
      {
        label: "Certificate",
        title: "Certified Constitutional Law Practitioner",
        summary: "Complete all levels to earn the comprehensive final certificate.",
      },
    ],
  },
];

export const TRAINING_LIBRARY_COURSES: TrainingCourse[] = [
  {
    id: "gbv-core",
    title: "Gender-Based Violence & Women's Protection Laws",
    hi: "महिला संरक्षण कानून",
    summary:
      "IPC/BNS provisions, PWDVA, POCSO, POSH, PCMA, and landmark case analysis for frontline response and strategic advocacy.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["gbv", "gender violence", "pocso", "domestic violence", "posh", "pcma"],
    levelsLabel: "3 levels",
    durationLabel: "~6 hrs",
    status: "live",
    accent: "#C2410C",
    badge: "Popular",
    href: "https://shashwat-sys.github.io/janman-training/gbv/index.html",
    certificate: "Certificate",
  },
  {
    id: "gbv-social-worker",
    title: "GBV for Social Workers & OSC Staff",
    hi: "सामाजिक कार्यकर्ता ट्रैक",
    summary:
      "A field-focused track on survivor support, mandatory reporting, crisis intervention, referrals, and team coordination.",
    audiences: ["sw"],
    keywords: ["gbv", "social worker", "osc", "domestic violence", "first responder"],
    levelsLabel: "3 levels",
    durationLabel: "~5 hrs",
    status: "live",
    accent: "#EA580C",
    href: "https://shashwat-sys.github.io/janman-training/gbv/social-worker/index.html",
    certificate: "Certificate",
  },
  {
    id: "fundamental-rights",
    title: "Fundamental Rights & Directive Principles",
    hi: "मौलिक अधिकार एवं नीति निर्देशक तत्व",
    summary:
      "Articles 12–35 and 36–51 with PIL strategy, constitutional remedies, landmark writ jurisprudence, and socio-economic rights.",
    audiences: ["pl", "ls", "lw"],
    keywords: ["constitution", "fundamental rights", "dpsp", "article 21", "pil"],
    levelsLabel: "3 levels",
    durationLabel: "~7 hrs",
    status: "live",
    accent: "#2563EB",
    badge: "Updated",
    href: "https://shashwat-sys.github.io/janman-training/fundamental-rights/index.html",
    certificate: "Certificate",
  },
  {
    id: "child-rights-hub",
    title: "Child Rights & Protection — Full Programme",
    hi: "बाल अधिकार एवं संरक्षण",
    summary:
      "POCSO, JJ Act, child marriage, child labour, and RTE through 4 audience tracks and landmark case analysis.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["child rights", "pocso", "jj act", "child marriage", "cwc", "dcpu"],
    levelsLabel: "16 levels",
    durationLabel: "~20 hrs",
    status: "live",
    accent: "#0F766E",
    badge: "New",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/index.html",
    certificate: "Certificate",
  },
  {
    id: "child-rights-social-worker",
    title: "Child Rights: Social Worker Track",
    hi: "बाल अधिकार: सामाजिक कार्यकर्ता ट्रैक",
    summary:
      "POCSO fundamentals, JJ procedures, CWC referrals, convergence, SIR and ICP documentation, and field-response grids.",
    audiences: ["sw"],
    keywords: ["child rights", "social worker", "pocso", "cwc", "field practice"],
    levelsLabel: "3 levels",
    durationLabel: "~5 hrs",
    status: "live",
    accent: "#F97316",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/social-worker/index.html",
    certificate: "Certificate",
  },
  {
    id: "child-rights-plv",
    title: "Child Rights: Paralegal Track",
    hi: "बाल अधिकार: पैरालीगल ट्रैक",
    summary:
      "Section 164 statements, DLSA and NALSA aid, compensation, RTI, NHRC complaints, Childline, and VCPC mobilisation.",
    audiences: ["pl"],
    keywords: ["child rights", "paralegal", "legal aid", "childline", "rti", "nhrc"],
    levelsLabel: "3 levels",
    durationLabel: "~5 hrs",
    status: "live",
    accent: "#16A34A",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/paralegal/index.html",
    certificate: "Certificate",
  },
  {
    id: "child-rights-law-student",
    title: "Child Rights: Law Student Track",
    hi: "बाल अधिकार: विधि छात्र ट्रैक",
    summary:
      "Constitutional framework, landmark cases, PIL strategy, constitutional tort, moot scenarios, and recent child-rights jurisprudence.",
    audiences: ["ls"],
    keywords: ["child rights", "law student", "case law", "pil", "constitutional analysis"],
    levelsLabel: "3 levels",
    durationLabel: "~7 hrs",
    status: "live",
    accent: "#6366F1",
    badge: "New",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/law-student/index.html",
    certificate: "Certificate",
  },
  {
    id: "child-rights-lawyer",
    title: "Child Rights: Lawyer Track",
    hi: "बाल अधिकार: अधिवक्ता ट्रैक",
    summary:
      "Full legislative framework, 29 landmark cases, bail strategy, compensation, PIL drafting, and prosecution and defence strategy.",
    audiences: ["lw"],
    keywords: ["child rights", "lawyer", "bail strategy", "trial strategy", "compensation", "pil"],
    levelsLabel: "3 levels",
    durationLabel: "~8 hrs",
    status: "live",
    accent: "#BE185D",
    badge: "New",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/lawyer/index.html",
    certificate: "Certificate",
  },
  {
    id: "labour-rights",
    title: "Labour Laws & Workers' Rights",
    hi: "श्रम कानून",
    summary:
      "BOCW Act, MGNREGS, ESIC, bonded labour, minimum wages, and contract labour through a field and legal-aid lens.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["labour law", "workers rights", "mgnregs", "minimum wages", "bonded labour"],
    levelsLabel: "3+ levels planned",
    durationLabel: "Coming soon",
    status: "coming_soon",
    accent: "#475569",
  },
  {
    id: "scst-atrocities",
    title: "SC/ST Atrocities & Caste Discrimination",
    hi: "अनुसूचित जाति/जनजाति अधिनियम",
    summary:
      "POA Act 1989, PCR Act, 2018 amendment rights, FIR registration, landmark judgments, and compensation mechanisms.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["scst", "atrocities", "caste discrimination", "poa act", "compensation"],
    levelsLabel: "3+ levels planned",
    durationLabel: "Live track",
    status: "live",
    accent: "#7C3AED",
    badge: "New",
    href: "https://shashwat-sys.github.io/janman-training/scst-atrocities/index.html",
    certificate: "Certificate",
  },
  {
    id: "victim-compensation",
    title: "Victim Compensation & Rehabilitation",
    hi: "पीड़ित मुआवज़ा",
    summary:
      "SVCS, CrPC and BNSS compensation provisions, POCSO rules, constitutional compensation, and DLSA claim processes.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["victim compensation", "svcs", "bnss", "crpc 357a", "rehabilitation"],
    levelsLabel: "3+ levels planned",
    durationLabel: "Coming soon",
    status: "coming_soon",
    accent: "#0EA5E9",
  },
  {
    id: "mental-health",
    title: "Mental Health & Disability Rights Law",
    hi: "मानसिक स्वास्थ्य एवं विकलांगता",
    summary:
      "MHCA 2017, RPwD Act 2016, UNCRPD, legal capacity, advance directives, and psychosocial disability rights.",
    audiences: ["sw", "pl", "ls", "lw"],
    keywords: ["mental health", "disability rights", "mhca", "rpwd", "legal capacity"],
    levelsLabel: "3+ levels planned",
    durationLabel: "Coming soon",
    status: "coming_soon",
    accent: "#0D9488",
  },
  {
    id: "welfare-entitlements",
    title: "Social Security & Welfare Entitlements",
    hi: "सामाजिक सुरक्षा योजनाएं",
    summary:
      "PMAY, NFSA, Ayushman Bharat, pensions, PMMVY, UDID, exclusion errors, RTI, and grievance redressal.",
    audiences: ["sw", "pl"],
    keywords: ["welfare", "social security", "ration card", "ayushman", "pension", "pmay"],
    levelsLabel: "3+ levels planned",
    durationLabel: "Coming soon",
    status: "coming_soon",
    accent: "#16A34A",
  },
];

export const TRAINING_LIBRARY_PATHS: TrainingLearningPath[] = [
  {
    id: "frontline-path",
    title: "Frontline & OSC Worker Path",
    icon: "👷",
    summary:
      "From mandatory reporting to convergence SOPs, this path supports field workers protecting children and women.",
    courseCount: "6 courses",
    duration: "~12 hrs",
    certificates: "2 certificates",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/social-worker/index.html",
    accent: "#C2410C",
  },
  {
    id: "plv-path",
    title: "Paralegal Volunteer Path",
    icon: "📋",
    summary:
      "Complaint drafting, RTI, NALSA support, Childline coordination, and community legal aid work in one guided journey.",
    courseCount: "6 courses",
    duration: "~11 hrs",
    certificates: "2 certificates",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/paralegal/index.html",
    accent: "#15803D",
  },
  {
    id: "law-student-path",
    title: "Law Student Path",
    icon: "🎓",
    summary:
      "Bridge textbook law and real-world practice through constitutional analysis, PIL strategy, and landmark judgments.",
    courseCount: "5 courses",
    duration: "~15 hrs",
    certificates: "3 certificates",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/law-student/index.html",
    accent: "#2563EB",
  },
  {
    id: "lawyer-path",
    title: "Practising Lawyer Path",
    icon: "⚖",
    summary:
      "Deep-dive case law, trial strategy, compensation, and PIL drafting for lawyers handling socio-legal matters.",
    courseCount: "5 courses",
    duration: "~16 hrs",
    certificates: "3 certificates",
    href: "https://shashwat-sys.github.io/janman-training/child-rights/lawyer/index.html",
    accent: "#9D174D",
  },
];

export const TRAINING_RESOURCE_CENTRE_URL = "https://shashwat-sys.github.io/janman-training/index.html#";
