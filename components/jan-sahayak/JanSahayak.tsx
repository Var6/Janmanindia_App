// @ts-nocheck
"use client";
import React, { useState } from "react";
import {
  ArrowLeft, ChevronRight, AlertTriangle, CheckCircle2, Sparkles, UserPlus, Phone,
} from "lucide-react";
import { claudeCall } from "@/lib/ai-client";

/** Jan Sahayak — citizen-facing legal aid app for rural Bihar.
 *  Bilingual Hindi/English, trauma-informed. AI triage via /api/ai/draft. */

const W = {
  accent: "#C84B31", green: "#2E7D32", purple: "#6A1B9A", blue: "#1565C0",
  cream: "#FAF6EE", paper: "#FFFCF6", ink: "#231812", inkSoft: "#5C4A3F",
  clay: "#EBDDC9", amber: "#E59500", crimson: "#B71C1C",
};

const BIHAR_DISTRICTS = [
  "Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar",
  "Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar",
  "Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur",
  "Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura",
  "Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran",
];

const HELPLINES = [
  { name: "Police Emergency",        hi: "पुलिस आपातकाल",            phone: "112",            cat: "emergency" },
  { name: "Women Helpline",          hi: "महिला हेल्पलाइन",           phone: "181",            cat: "women" },
  { name: "Childline",               hi: "चाइल्डलाइन",                phone: "1098",           cat: "child" },
  { name: "National Legal Aid",      hi: "राष्ट्रीय कानूनी सहायता",   phone: "15100",          cat: "legal" },
  { name: "NCW",                     hi: "राष्ट्रीय महिला आयोग",      phone: "7827170170",     cat: "women" },
  { name: "NHRC",                    hi: "राष्ट्रीय मानवाधिकार आयोग", phone: "14433",          cat: "hr" },
  { name: "SC/ST Helpline",          hi: "अनुसूचित जाति/जनजाति",      phone: "14566",          cat: "sc" },
  { name: "Senior Citizen Helpline", hi: "वृद्धजन हेल्पलाइन",         phone: "14567",          cat: "senior" },
  { name: "Mental Health (KIRAN)",   hi: "मानसिक स्वास्थ्य",          phone: "1800-599-0019",  cat: "health" },
  { name: "Anti-trafficking",        hi: "मानव तस्करी विरोधी",        phone: "1098",           cat: "women" },
  { name: "Disability",              hi: "दिव्यांगजन",                phone: "011-23386054",   cat: "disability" },
  { name: "Bihar Police WhatsApp",   hi: "बिहार पुलिस व्हाट्सऐप",     phone: "7070000100",     cat: "emergency" },
];

const SCHEMES = [
  { id: "pmay",   name: "PMAY-G — Pradhan Mantri Awas Yojana", hi: "प्रधानमंत्री आवास योजना (ग्रामीण)", icon: "🏠", desc: "Pucca house for rural families below poverty line.", eligibility: ["Below poverty line","No pucca house","Houseless or kutcha house","SECC 2011 list"], docs: ["Aadhaar","Bank account","Job card (NREGA)","SECC list verification"], benefit: "₹1.20 lakh in plain areas, ₹1.30 lakh in hilly/IAP areas", apply: "Gram Panchayat / BDO office" },
  { id: "nfsa",   name: "NFSA — Ration Card (Antyodaya / PHH)", hi: "राष्ट्रीय खाद्य सुरक्षा (राशन कार्ड)", icon: "🍚", desc: "5kg foodgrains per person per month at ₹2-3/kg.", eligibility: ["Income criteria (state-specific)","Resident of Bihar","Not income tax payer"], docs: ["Aadhaar of all family members","Bank account","Residence proof"], benefit: "5kg/person rice/wheat at subsidised rate; Antyodaya: 35kg/family", apply: "Block office / epds.bihar.gov.in" },
  { id: "mgnrega",name: "MGNREGA — 100 days wage employment", hi: "मनरेगा (100 दिन रोज़गार)", icon: "⛏️", desc: "Guaranteed 100 days unskilled work per year.", eligibility: ["Adult member of rural household","Resident of Bihar","Willing to do unskilled manual work"], docs: ["Aadhaar","Photo","Job card application"], benefit: "₹228/day (Bihar 2024-25); unemployment allowance if work not provided within 15 days", apply: "Gram Panchayat — job card" },
  { id: "pension",name: "Old Age Pension (IGNOAPS + Bihar State)", hi: "वृद्धावस्था पेंशन", icon: "👴", desc: "Monthly pension for elderly poor.", eligibility: ["Age 60+","BPL family","No regular income"], docs: ["Age proof","Aadhaar","Bank account","BPL certificate"], benefit: "₹400/month (60-79 yrs), ₹500/month (80+); plus Bihar state top-up", apply: "Block office / rtps.bihar.gov.in" },
  { id: "widow",  name: "Widow Pension (IGNWPS)", hi: "विधवा पेंशन", icon: "🤍", desc: "Monthly pension for widows from BPL families.", eligibility: ["Widow aged 18-79","BPL family"], docs: ["Husband's death certificate","Aadhaar","Bank account","BPL certificate"], benefit: "₹400/month + Bihar top-up", apply: "Block office / rtps.bihar.gov.in" },
  { id: "disability", name: "Disability Pension (IGNDPS + UDID)", hi: "दिव्यांग पेंशन", icon: "♿", desc: "Monthly pension; UDID card; reservation in jobs/education.", eligibility: ["40%+ benchmark disability","BPL family"], docs: ["Disability certificate (UDID)","Aadhaar","Bank account"], benefit: "₹400/month + state top-up; UDID card", apply: "Civil Surgeon (certificate) — swavlambancard.gov.in" },
  { id: "ayushman",   name: "Ayushman Bharat — PMJAY", hi: "आयुष्मान भारत (PMJAY)", icon: "🏥", desc: "₹5 lakh/family/year health cover.", eligibility: ["SECC 2011 deprivation criteria"], docs: ["Aadhaar","Family ID","Income certificate (if needed)"], benefit: "₹5 lakh/year cashless treatment in empanelled hospitals", apply: "CSC / mera.pmjay.gov.in" },
  { id: "pmmvy",  name: "PMMVY — Pregnancy/Maternity Benefit", hi: "मातृत्व सहायता", icon: "🤱", desc: "₹5,000 cash benefit for first child.", eligibility: ["Pregnant/lactating woman","First child"], docs: ["Aadhaar","Bank account","MCP card","LMP date"], benefit: "₹5,000 in 2 installments + JSY at delivery", apply: "Anganwadi / ASHA" },
];

const RIGHTS = [
  { id: "arrest", title: "Rights at the time of arrest", hi: "गिरफ्तारी के समय अधिकार", icon: "⚖", color: W.crimson, points: [
    "You have the right to know why you are being arrested (Article 22, D.K. Basu v. State of W.B. (1997))",
    "Right to be produced before a Magistrate within 24 hours",
    "Right to legal counsel of your choice from the moment of arrest",
    "Right to inform a friend/relative of arrest (S. 50A CrPC / S. 47 BNSS)",
    "Arnesh Kumar v. State of Bihar (2014) — police MUST issue notice u/s 41A CrPC instead of immediate arrest for offences with imprisonment ≤7 years",
    "No third degree, no torture, no detention beyond 24 hours without Magistrate's authorisation",
  ] },
  { id: "women",  title: "Women's Rights", hi: "महिला अधिकार", icon: "👩", color: W.purple, points: [
    "Right to register an FIR at ANY police station (Zero FIR — Lalita Kumari v. State of UP)",
    "Domestic Violence Act 2005 — right to residence, protection order, monetary relief, custody of children",
    "S. 498A IPC / S. 85 BNS — cruelty by husband and relatives",
    "Female complainants in sexual offences can give statement at home / before a woman officer",
    "Free legal aid mandatory in rape, DV, dowry cases (LSA Act 1987)",
    "No arrest of woman before sunrise or after sunset (S. 46(4) CrPC / BNSS)",
  ] },
  { id: "child",  title: "Child Rights", hi: "बाल अधिकार", icon: "🧒", color: W.blue, points: [
    "POCSO Act 2012 — special procedure, in-camera trial, no cross of victim by accused",
    "Children below 18 are presumed to be victims, not accomplices",
    "Right to education (RTE) up to 14 years — free and compulsory",
    "Child labour prohibited below 14 (and hazardous work below 18)",
    "Child marriage is voidable; PCMA 2006 — punishment for those who solemnise/permit",
    "Juvenile in conflict with law: special procedure (JJ Act 2015)",
  ] },
  { id: "sc",     title: "SC/ST Atrocities Act Rights", hi: "एससी/एसटी अधिकार", icon: "✊", color: W.green, points: [
    "SC/ST (Prevention of Atrocities) Act 1989 — special offences and enhanced punishment",
    "Mandatory registration of FIR; non-bailable offences",
    "Investigation by Dy. SP or higher rank officer",
    "Trial in Special Court",
    "Compensation under Rule 12(4): ₹85,000 to ₹8.25 lakhs depending on offence",
    "S. 18 — no anticipatory bail (except SC has held judicial scrutiny permitted: Prathvi Raj Chauhan)",
  ] },
  { id: "food",   title: "Right to Food (NFSA)", hi: "खाद्य का अधिकार", icon: "🍚", color: W.amber, points: [
    "5kg foodgrains/person/month at ₹2-3/kg (PHH); 35kg/family (Antyodaya)",
    "Ration shop must function; supply records must be public",
    "Right to grievance redressal: District Grievance Redressal Officer",
    "PUCL v. Union of India — judicially enforceable right",
    "Mid-day meal in schools, ICDS for children 0-6, pregnant/lactating women",
  ] },
  { id: "labour", title: "Labour Rights (MGNREGA)", hi: "श्रम अधिकार (मनरेगा)", icon: "⛏️", color: W.green, points: [
    "Right to 100 days work per household per year (MGNREGA 2005)",
    "₹228/day wage in Bihar (2024-25); paid within 15 days",
    "Unemployment allowance if work not provided within 15 days",
    "Worksite facilities: shade, drinking water, crèche, first aid",
    "Social audit: gram sabha right to verify works and expenditure",
  ] },
];

const BigBtn = ({ icon, label, hi, color, onClick }) => (
  <button onClick={onClick} className="w-full p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left transition hover:shadow-md hover:-translate-y-0.5 bg-white" style={{ borderLeft: `6px solid ${color}` }}>
    <div className="text-3xl">{icon}</div>
    <div className="flex-1">
      <div className="font-bold text-lg" style={{ color: W.ink }}>{label}</div>
      <div className="text-sm" style={{ color: W.inkSoft }}>{hi}</div>
    </div>
    <ChevronRight size={20} className="text-stone-400" />
  </button>
);

function HomeScreen({ onNav, lang }) {
  const features = [
    { id: "intake",    icon: "🆘", color: W.crimson, en: "I need legal help",      hi: "मुझे कानूनी मदद चाहिए" },
    { id: "schemes",   icon: "📜", color: W.amber,   en: "Government schemes",     hi: "मेरी सरकारी योजनाएं" },
    { id: "rights",    icon: "⚖",  color: W.blue,    en: "Know your rights",       hi: "अपने अधिकार जानें" },
    { id: "report",    icon: "🚨", color: "#B71C1C", en: "Report abuse / atrocity",hi: "अत्याचार की रिपोर्ट" },
    { id: "helplines", icon: "📞", color: W.green,   en: "Helplines",              hi: "हेल्पलाइन" },
    { id: "plv",       icon: "🤝", color: W.purple,  en: "Become a Nyaya Sahayak", hi: "न्याय सहायक बनें" },
  ];
  return (
    <div className="space-y-5">
      <div className="text-center py-6">
        <div className="text-5xl mb-3">🏛️</div>
        <h1 className="text-3xl font-bold" style={{ color: W.ink }}>Jan Sahayak</h1>
        <p className="text-base mt-1" style={{ color: W.inkSoft }}>आपका कानूनी साथी · Your legal companion</p>
      </div>
      <div className="space-y-3">
        {features.map((f) => (
          <BigBtn key={f.id} icon={f.icon} color={f.color} label={lang === "hi" ? f.hi : f.en} hi={lang === "hi" ? f.en : f.hi} onClick={() => onNav(f.id)} />
        ))}
      </div>
    </div>
  );
}

function IntakeScreen({ onBack }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ category: "", details: "", district: "Patna", phone: "" });
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const cats = [
    { id: "dv",    label: "Domestic violence",         hi: "घरेलू हिंसा",       color: W.crimson },
    { id: "dowry", label: "Dowry harassment",          hi: "दहेज प्रताड़ना",     color: W.crimson },
    { id: "caste", label: "Caste atrocity",            hi: "जातीय अत्याचार",     color: W.purple  },
    { id: "land",  label: "Land / property dispute",   hi: "भूमि / सम्पत्ति विवाद", color: W.amber },
    { id: "bail",  label: "Bail / arrest matter",      hi: "जमानत / गिरफ्तारी",   color: W.blue    },
    { id: "work",  label: "Wage / MGNREGA issue",      hi: "मज़दूरी / मनरेगा",   color: W.green   },
    { id: "child", label: "Child-related (POCSO etc)", hi: "बाल अधिकार",         color: W.blue    },
    { id: "other", label: "Other",                     hi: "अन्य",                color: W.inkSoft },
  ];
  const triage = async () => {
    setLoading(true); setAdvice("");
    const sys = "You are a trauma-informed legal triage assistant for citizens in rural Bihar, India. Provide step-by-step practical advice in clear, simple English. Always include: (1) immediate safety steps, (2) which law applies (BNS/IPC, POCSO, DV Act, SC/ST Act, etc), (3) what document to prepare, (4) where to go, (5) which helpline to call. Be warm, non-judgmental, do not say 'I am not a lawyer'.";
    const reply = await claudeCall(sys, [{ role: "user", content: `Citizen in ${form.district} district, Bihar.\nCategory: ${form.category}\nDetails: ${form.details}\n\nProvide practical legal triage in 5-6 short paragraphs.` }], 1500);
    setAdvice(reply); setLoading(false); setStep(2);
  };
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: W.ink }}>Tell us what happened</h1>
      <p className="text-sm text-stone-600 mb-5">आपके साथ क्या हुआ?</p>
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-700">What kind of problem are you facing?</p>
          {cats.map((c) => (
            <button key={c.id} onClick={() => { setForm((f) => ({ ...f, category: c.label })); setStep(1); }} className="w-full p-4 rounded-xl bg-white shadow-sm text-left flex items-center gap-3 hover:shadow-md transition" style={{ borderLeft: `5px solid ${c.color}` }}>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: W.ink }}>{c.label}</div>
                <div className="text-sm text-stone-500">{c.hi}</div>
              </div>
              <ChevronRight size={18} className="text-stone-400" />
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900"><strong>Category:</strong> {form.category}</div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Tell us more (in your own words)</label>
            <textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} rows={5} placeholder="What happened? When? Who is involved?" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#C84B31] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">District</label>
              <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">
                {BIHAR_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
            </div>
          </div>
          <button onClick={triage} disabled={loading || !form.details} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: W.accent }}>
            {loading ? "Analysing..." : "Get legal guidance →"}
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm ring-1" style={{ borderColor: W.clay }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} style={{ color: W.accent }} />
              <span className="font-bold" style={{ color: W.ink }}>Your Legal Guidance</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{advice}</div>
          </div>
          <button onClick={() => { setStep(0); setForm({ category: "", details: "", district: "Patna", phone: "" }); setAdvice(""); }} className="w-full py-3 rounded-xl border border-stone-300 text-sm font-semibold">Start over / नया प्रश्न</button>
        </div>
      )}
    </div>
  );
}

const Section = ({ title, items }) => (
  <div className="mb-3">
    <div className="text-xs uppercase font-bold text-stone-600 mb-1.5">{title}</div>
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
          <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

function SchemesScreen({ onBack }) {
  const [pick, setPick] = useState(null);
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      {!pick && (
        <>
          <h1 className="text-2xl font-bold" style={{ color: W.ink }}>Government Schemes</h1>
          <p className="text-sm text-stone-600 mb-5">सरकारी योजनाएं</p>
          <div className="grid gap-3">
            {SCHEMES.map((s) => (
              <button key={s.id} onClick={() => setPick(s)} className="w-full p-4 bg-white rounded-2xl shadow-sm text-left flex items-start gap-3 hover:shadow-md transition">
                <div className="text-3xl">{s.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: W.ink }}>{s.name}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{s.hi}</div>
                  <div className="text-xs text-stone-600 mt-1.5">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {pick && (
        <div className="space-y-4">
          <button onClick={() => setPick(null)} className="flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> All schemes</button>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="text-4xl mb-2">{pick.icon}</div>
            <h2 className="text-xl font-bold" style={{ color: W.ink }}>{pick.name}</h2>
            <p className="text-sm text-stone-500 mb-3">{pick.hi}</p>
            <p className="text-sm text-stone-700 mb-4">{pick.desc}</p>
            <Section title="Eligibility" items={pick.eligibility} />
            <Section title="Documents" items={pick.docs} />
            <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-xs uppercase text-emerald-700 font-bold">Benefit / लाभ</div>
              <div className="text-sm text-emerald-900 mt-1">{pick.benefit}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs uppercase text-amber-700 font-bold">Where to apply</div>
              <div className="text-sm text-amber-900 mt-1">{pick.apply}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RightsScreen({ onBack }) {
  const [pick, setPick] = useState(null);
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      {!pick && (
        <>
          <h1 className="text-2xl font-bold" style={{ color: W.ink }}>Know Your Rights</h1>
          <p className="text-sm text-stone-600 mb-5">अपने अधिकार जानें</p>
          <div className="grid gap-3">
            {RIGHTS.map((r) => (
              <button key={r.id} onClick={() => setPick(r)} className="w-full p-4 bg-white rounded-2xl shadow-sm text-left flex items-center gap-3 hover:shadow-md transition" style={{ borderLeft: `6px solid ${r.color}` }}>
                <div className="text-3xl">{r.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: W.ink }}>{r.title}</div>
                  <div className="text-sm text-stone-500">{r.hi}</div>
                </div>
                <ChevronRight size={18} className="text-stone-400" />
              </button>
            ))}
          </div>
        </>
      )}
      {pick && (
        <div className="space-y-4">
          <button onClick={() => setPick(null)} className="flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> All rights</button>
          <div className="bg-white rounded-2xl shadow-sm p-5" style={{ borderTop: `4px solid ${pick.color}` }}>
            <div className="text-3xl mb-2">{pick.icon}</div>
            <h2 className="text-xl font-bold" style={{ color: W.ink }}>{pick.title}</h2>
            <p className="text-sm text-stone-500 mb-4">{pick.hi}</p>
            <ul className="space-y-3">
              {pick.points.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: pick.color + "20", color: pick.color }}>{i + 1}</div>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportScreen({ onBack }) {
  const [form, setForm] = useState({ type: "", where: "", when: "", what: "", who: "", district: "Patna", anon: true });
  const [sent, setSent] = useState(false);
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 text-red-900 font-bold"><AlertTriangle size={18} /> Emergency: call 112 immediately</div>
        <p className="text-sm text-red-800 mt-1">For ongoing violence, life-threatening situations: dial 112 / 100 first. This form is for reporting and documentation.</p>
      </div>
      <h1 className="text-2xl font-bold" style={{ color: W.ink }}>Report Abuse / Atrocity</h1>
      <p className="text-sm text-stone-600 mb-5">अत्याचार की रिपोर्ट</p>
      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-3" />
          <div className="text-lg font-bold text-emerald-900">Report Received</div>
          <p className="text-sm text-emerald-800 mt-2">A Nyaya Sahayak will reach out within 24 hours. You are not alone.</p>
          <button onClick={() => { setSent(false); setForm({ type: "", where: "", when: "", what: "", who: "", district: "Patna", anon: true }); }} className="mt-4 px-4 py-2 rounded-lg bg-white border border-emerald-300 text-sm font-semibold">New report</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Type of incident</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">
              <option value="">Select...</option>
              <option>Caste atrocity (SC/ST)</option>
              <option>Domestic violence</option>
              <option>Sexual assault / rape</option>
              <option>Child abuse (POCSO)</option>
              <option>Mob lynching / hate crime</option>
              <option>Custodial violence</option>
              <option>Manual scavenging / sewer death</option>
              <option>Bonded labour</option>
              <option>Trafficking</option>
              <option>Police inaction</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Where</label>
              <input value={form.where} onChange={(e) => setForm((f) => ({ ...f, where: e.target.value }))} placeholder="Village / location" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">District</label>
              <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">
                {BIHAR_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">When</label>
            <input value={form.when} onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))} placeholder="Date & approximate time" className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">What happened</label>
            <textarea value={form.what} onChange={(e) => setForm((f) => ({ ...f, what: e.target.value }))} rows={5} placeholder="Describe what happened in your own words..." className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Who is involved</label>
            <textarea value={form.who} onChange={(e) => setForm((f) => ({ ...f, who: e.target.value }))} rows={2} placeholder="Names, descriptions of the people involved..." className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
          </div>
          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.anon} onChange={(e) => setForm((f) => ({ ...f, anon: e.target.checked }))} className="mt-0.5" />
            <span>Keep my identity anonymous (Nyaya Sahayak will reach out via a community connect only)</span>
          </label>
          <button onClick={() => setSent(true)} disabled={!form.type || !form.what} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: W.accent }}>Submit Report</button>
        </div>
      )}
    </div>
  );
}

function HelplinesScreen({ onBack }) {
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      <h1 className="text-2xl font-bold" style={{ color: W.ink }}>Helplines</h1>
      <p className="text-sm text-stone-600 mb-5">हेल्पलाइन नंबर</p>
      <div className="space-y-2">
        {HELPLINES.map((h) => (
          <a key={h.phone} href={`tel:${h.phone}`} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition">
            <div>
              <div className="font-semibold" style={{ color: W.ink }}>{h.name}</div>
              <div className="text-sm text-stone-500">{h.hi}</div>
            </div>
            <div className="flex items-center gap-2"><Phone size={14} style={{ color: W.accent }} /><span className="font-bold text-base" style={{ color: W.accent }}>{h.phone}</span></div>
          </a>
        ))}
      </div>
    </div>
  );
}

function PLVScreen({ onBack }) {
  const [form, setForm] = useState({ name: "", age: "", phone: "", district: "Patna", panchayat: "", education: "", motivation: "" });
  const [sent, setSent] = useState(false);
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-stone-600"><ArrowLeft size={14} /> Back</button>
      <h1 className="text-2xl font-bold" style={{ color: W.ink }}>Become a Nyaya Sahayak</h1>
      <p className="text-sm text-stone-600 mb-5">न्याय सहायक बनें</p>
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="font-bold text-lg" style={{ color: W.ink }}>What is a Nyaya Sahayak?</h2>
        <p className="text-sm text-stone-700 mt-2 leading-relaxed">A trained community paralegal who helps neighbours access legal aid, government schemes, and rights. Recognised under the Legal Services Authorities Act 1987.</p>
        <div className="mt-3 space-y-1.5 text-sm text-stone-700">
          <div className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 mt-1 flex-shrink-0" />Free training in legal aid, rights, schemes</div>
          <div className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 mt-1 flex-shrink-0" />Connect community members to lawyers and DLSA</div>
          <div className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 mt-1 flex-shrink-0" />Monthly stipend during fellowship period</div>
          <div className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 mt-1 flex-shrink-0" />Network of 6 districts in Seemanchal</div>
        </div>
      </div>
      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <UserPlus size={48} className="mx-auto text-emerald-600 mb-3" />
          <div className="text-lg font-bold text-emerald-900">Application Received</div>
          <p className="text-sm text-emerald-800 mt-2">Our team will reach out within 7 days. Thank you for stepping forward.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">District</label>
              <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">
                {BIHAR_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Panchayat / Village</label>
              <input value={form.panchayat} onChange={(e) => setForm((f) => ({ ...f, panchayat: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Education</label>
            <select value={form.education} onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white">
              <option value="">Select...</option>
              <option>Class 8</option>
              <option>Class 10 / Matric</option>
              <option>Class 12 / Inter</option>
              <option>Graduate</option>
              <option>Post-graduate</option>
              <option>Law degree</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Why do you want to be a Nyaya Sahayak?</label>
            <textarea value={form.motivation} onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))} rows={4} placeholder="Tell us briefly..." className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
          </div>
          <button onClick={() => setSent(true)} disabled={!form.name || !form.phone} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: W.accent }}>Submit Application</button>
        </div>
      )}
    </div>
  );
}

export default function JanSahayak() {
  const [screen, setScreen] = useState("home");
  const [lang, setLang] = useState("en");
  return (
    <div className="min-h-screen" style={{ background: W.cream }}>
      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ background: W.paper + "E0", borderBottom: `1px solid ${W.clay}` }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: W.accent }}>JS</div>
            <div>
              <div className="font-bold text-sm" style={{ color: W.ink }}>Jan Sahayak</div>
              <div className="text-[10px] text-stone-500">जन सहायक</div>
            </div>
          </div>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="px-3 py-1.5 rounded-lg text-xs font-bold ring-1" style={{ background: W.paper, color: W.accent, borderColor: W.clay }}>{lang === "en" ? "हिं" : "EN"}</button>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-5 pb-20">
        {screen === "home"      && <HomeScreen onNav={setScreen} lang={lang} />}
        {screen === "intake"    && <IntakeScreen onBack={() => setScreen("home")} />}
        {screen === "schemes"   && <SchemesScreen onBack={() => setScreen("home")} />}
        {screen === "rights"    && <RightsScreen onBack={() => setScreen("home")} />}
        {screen === "report"    && <ReportScreen onBack={() => setScreen("home")} />}
        {screen === "helplines" && <HelplinesScreen onBack={() => setScreen("home")} />}
        {screen === "plv"       && <PLVScreen onBack={() => setScreen("home")} />}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 py-2 text-center text-[10px] text-stone-500" style={{ background: W.paper, borderTop: `1px solid ${W.clay}` }}>
        Janman People's Foundation · Jan Nyaya Abhiyan
      </footer>
    </div>
  );
}
