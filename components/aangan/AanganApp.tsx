// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import {
  Home, Users, ClipboardList, Activity, Plus, Search, MapPin, Calendar,
  AlertTriangle, CheckCircle2, X, TrendingUp, UserCircle2,
} from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

/** Aangan-style child protection field reporting tool — Bihar.
 *  In-memory state only for v1 (seed + add); persistence will plug into a
 *  `children` / `home_visits` / `child_interventions` collection in a follow-up. */

const RISK = {
  school_dropout:   { label: "Out of School",         tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  child_labour:     { label: "Child Labour",          tone: "bg-rose-50 text-rose-900 ring-rose-200" },
  early_marriage:   { label: "Early Marriage",        tone: "bg-pink-50 text-pink-900 ring-pink-200" },
  unsafe_migration: { label: "Unsafe Migration",      tone: "bg-violet-50 text-violet-900 ring-violet-200" },
  home_violence:    { label: "Domestic Violence",     tone: "bg-orange-50 text-orange-900 ring-orange-200" },
  orphan:           { label: "Single Parent / Orphan",tone: "bg-stone-100 text-stone-800 ring-stone-300" },
  substance:        { label: "Substance in Home",     tone: "bg-teal-50 text-teal-900 ring-teal-200" },
};

const CONCERN = {
  low:      { label: "Low",      tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  medium:   { label: "Medium",   tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  high:     { label: "High",     tone: "bg-rose-50 text-rose-900 ring-rose-200" },
  critical: { label: "Critical", tone: "bg-red-100 text-red-900 ring-red-300" },
};

const SEED_CHILDREN = [
  { id: "c1", name: "Pooja Kumari",   age: 13, gender: "F", village: "Bishunpur",    district: "Purnia",     risks: ["school_dropout","early_marriage"], concern: "high",     fw: "Sachina", lastVisit: "2026-05-02" },
  { id: "c2", name: "Mohit Mandal",   age: 11, gender: "M", village: "Sirsa Kalan",  district: "Araria",     risks: ["child_labour"],                    concern: "medium",   fw: "Nawaz",   lastVisit: "2026-05-06" },
  { id: "c3", name: "Asha Devi",      age: 15, gender: "F", village: "Kasba",        district: "Purnia",     risks: ["early_marriage","home_violence"],  concern: "critical", fw: "Sachina", lastVisit: "2026-05-09" },
  { id: "c4", name: "Rakesh Sah",     age: 14, gender: "M", village: "Banmankhi",    district: "Purnia",     risks: ["unsafe_migration"],                concern: "high",     fw: "Tausif",  lastVisit: "2026-04-29" },
  { id: "c5", name: "Sunita Khatun",  age: 12, gender: "F", village: "Forbesganj",   district: "Araria",     risks: ["school_dropout","substance"],      concern: "medium",   fw: "Nawaz",   lastVisit: "2026-05-04" },
  { id: "c6", name: "Imran Ansari",   age: 10, gender: "M", village: "Bahadurganj",  district: "Kishanganj", risks: ["child_labour","orphan"],           concern: "high",     fw: "Pintu",   lastVisit: "2026-05-01" },
  { id: "c7", name: "Khushboo Rani",  age: 16, gender: "F", village: "Manihari",     district: "Katihar",    risks: ["early_marriage"],                  concern: "medium",   fw: "Tausif",  lastVisit: "2026-05-07" },
  { id: "c8", name: "Vikas Yadav",    age: 13, gender: "M", village: "Triveniganj",  district: "Supaul",     risks: ["school_dropout"],                  concern: "low",      fw: "Pintu",   lastVisit: "2026-05-03" },
  { id: "c9", name: "Reshma Khatun",  age: 14, gender: "F", village: "Singheshwar",  district: "Madhepura",  risks: ["home_violence","school_dropout"],  concern: "high",     fw: "Nawaz",   lastVisit: "2026-05-08" },
  { id: "c10",name: "Sahil Kumar",    age: 12, gender: "M", village: "Kasba",        district: "Purnia",     risks: ["unsafe_migration","child_labour"], concern: "critical", fw: "Sachina", lastVisit: "2026-05-09" },
];

const SEED_VISITS = [
  { id: "v1", childId: "c3", date: "2026-05-09", fw: "Sachina", concern: "critical", note: "Father pressuring marriage with 32-yo. CWC referral initiated; DLSA legal aid pending." },
  { id: "v2", childId: "c1", date: "2026-05-02", fw: "Sachina", concern: "high",     note: "Out of school 7 months. Mother open to bridge-school re-enrollment." },
  { id: "v3", childId: "c10",date: "2026-05-09", fw: "Sachina", concern: "critical", note: "Uncle planning to take child to Punjab for brick-kiln work. Police coordination required." },
  { id: "v4", childId: "c2", date: "2026-05-06", fw: "Nawaz",   concern: "medium",   note: "Works in roadside dhaba 4 hours/day. School registered but irregular." },
  { id: "v5", childId: "c5", date: "2026-05-04", fw: "Nawaz",   concern: "medium",   note: "Father consumes alcohol regularly. Mother reports verbal abuse only." },
  { id: "v6", childId: "c9", date: "2026-05-08", fw: "Nawaz",   concern: "high",     note: "Witnessed mother beaten twice. PWDVA counselling offered." },
  { id: "v7", childId: "c6", date: "2026-05-01", fw: "Pintu",   concern: "high",     note: "Lives with aunt; works at cycle-repair shop. Need to assess guardianship." },
  { id: "v8", childId: "c4", date: "2026-04-29", fw: "Tausif",  concern: "high",     note: "Father took advance from labour contractor. Migration scheduled in 10 days." },
];

const SEED_INTERVENTIONS = [
  { id: "i1", childId: "c3", type: "CWC Referral",                stage: "ongoing",  date: "2026-05-09", lead: "Sachina" },
  { id: "i2", childId: "c3", type: "DLSA Legal Aid",              stage: "planned",  date: "2026-05-11", lead: "Sachina" },
  { id: "i3", childId: "c1", type: "Bridge School Enrollment",    stage: "ongoing",  date: "2026-05-02", lead: "Sachina" },
  { id: "i4", childId: "c2", type: "Re-enrollment in Govt School",stage: "ongoing",  date: "2026-05-06", lead: "Nawaz" },
  { id: "i5", childId: "c4", type: "Family Counselling",          stage: "planned",  date: "2026-05-12", lead: "Tausif" },
  { id: "i6", childId: "c4", type: "Police Coordination",         stage: "planned",  date: "2026-05-13", lead: "Tausif" },
  { id: "i7", childId: "c6", type: "CPC Coordination",            stage: "ongoing",  date: "2026-05-01", lead: "Pintu" },
  { id: "i8", childId: "c9", type: "Family Counselling",          stage: "resolved", date: "2026-04-22", lead: "Nawaz" },
  { id: "i9", childId: "c10",type: "Police Coordination",         stage: "planned",  date: "2026-05-10", lead: "Sachina" },
];

const FW = ["Sachina", "Nawaz", "Tausif", "Pintu"];

const Pill = ({ children, tone = "bg-stone-100 text-stone-800 ring-stone-300" }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${tone}`}>{children}</span>
);
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl ring-1 ring-stone-200 shadow-sm ${className}`}>{children}</div>
);
const Stat = ({ label, value, sub, icon }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">{label}</div>
        <div className="text-3xl font-bold mt-1 text-stone-900">{value}</div>
        {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
      </div>
      <div className="text-[#C84B31] opacity-70">{icon}</div>
    </div>
  </Card>
);

export default function AanganApp() {
  const t = useT();
  const [tab, setTab] = useState("dashboard");
  const [children, setChildren] = useState(SEED_CHILDREN);
  const [visits, setVisits] = useState(SEED_VISITS);
  const [interventions] = useState(SEED_INTERVENTIONS);
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  const filteredChildren = useMemo(
    () =>
      children.filter((c) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.village.toLowerCase().includes(search.toLowerCase())) return false;
        if (riskFilter && !c.risks.includes(riskFilter)) return false;
        return true;
      }),
    [children, search, riskFilter],
  );

  const stats = useMemo(
    () => ({
      total: children.length,
      critical: children.filter((c) => c.concern === "critical").length,
      high: children.filter((c) => c.concern === "high").length,
      visitsThisWeek: visits.filter((v) => (new Date("2026-05-09").getTime() - new Date(v.date).getTime()) / (1000 * 60 * 60 * 24) <= 7).length,
      ongoing: interventions.filter((i) => i.stage === "ongoing").length,
      resolved: interventions.filter((i) => i.stage === "resolved").length,
    }),
    [children, visits, interventions],
  );

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-stone-900">
      <header className="bg-[#FFFCF6] border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C84B31] flex items-center justify-center text-white font-bold">आ</div>
            <div>
              <div className="text-xl font-bold text-stone-900">Aangan</div>
              <div className="text-xs text-stone-500">{t("child protection field reporting")}</div>
            </div>
          </div>
          <nav className="flex gap-1">
            {[
              { k: "dashboard", l: "Dashboard",     i: <Home size={16} /> },
              { k: "children",  l: "Children",      i: <Users size={16} /> },
              { k: "visits",    l: "Visits",        i: <ClipboardList size={16} /> },
              { k: "actions",   l: "Interventions", i: <Activity size={16} /> },
            ].map((nav) => (
              <button
                key={nav.k}
                onClick={() => setTab(nav.k)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  tab === nav.k ? "bg-[#C84B31] text-white" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                {nav.i} {t(nav.l)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{t("Field Overview")}</h1>
              <p className="text-stone-600 mt-1">{t("Across 4 districts in Seemanchal · As of 9 May 2026")}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Stat label={t("Children Tracked")} value={stats.total}    sub={t("Across 4 districts")} icon={<Users size={22} />} />
              <Stat label={t("Critical Concern")} value={stats.critical} sub={t("Need urgent action")} icon={<AlertTriangle size={22} />} />
              <Stat label={t("High Concern")}     value={stats.high}     icon={<TrendingUp size={22} />} />
              <Stat label={t("Visits This Week")} value={stats.visitsThisWeek} icon={<ClipboardList size={22} />} />
              <Stat label={t("Ongoing Actions")}  value={stats.ongoing}  icon={<Activity size={22} />} />
              <Stat label={t("Resolved")}         value={stats.resolved} icon={<CheckCircle2 size={22} />} />
            </div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t("Priority Alerts")}</h2>
                <Pill tone="bg-rose-50 text-rose-900 ring-rose-200">{stats.critical} {t("critical")}</Pill>
              </div>
              <div className="space-y-3">
                {children.filter((c) => c.concern === "critical").map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 ring-1 ring-rose-100">
                    <div>
                      <div className="font-semibold text-rose-900">{c.name}, {c.age}</div>
                      <div className="text-sm text-rose-800/80 flex items-center gap-2">
                        <MapPin size={12} /> {c.village}, {c.district} · FW: {c.fw}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {c.risks.map((r) => <Pill key={r} tone={RISK[r].tone}>{t(RISK[r].label)}</Pill>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "children" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-3xl font-bold">{t("Children Registry")}</h1>
              <button onClick={() => setShowAdd("child")} className="px-4 py-2 rounded-lg bg-[#C84B31] hover:bg-[#9B3722] text-white text-sm font-medium flex items-center gap-2">
                <Plus size={16} /> {t("Register Case")}
              </button>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search by name or village...")} className="w-full pl-10 pr-4 py-2 rounded-lg bg-white ring-1 ring-stone-200 text-sm focus:ring-2 focus:ring-[#C84B31] outline-none" />
              </div>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-white ring-1 ring-stone-200 text-sm">
                <option value="">{t("All risks")}</option>
                {Object.entries(RISK).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
              </select>
            </div>
            <Card>
              <div className="divide-y divide-stone-100">
                {filteredChildren.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-stone-50/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-[#EBDDC9] flex items-center justify-center text-[#8B4F2B] font-bold">{c.name.charAt(0)}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-stone-900">
                            {c.name} <span className="text-stone-500 font-normal">· {c.age}y · {c.gender === "F" ? t("Female") : t("Male")}</span>
                          </div>
                          <div className="text-sm text-stone-600 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><MapPin size={12} /> {c.village}, {c.district}</span>
                            <span className="flex items-center gap-1"><UserCircle2 size={12} /> {c.fw}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {c.lastVisit}</span>
                          </div>
                          <div className="flex gap-1.5 flex-wrap mt-2">
                            {c.risks.map((r) => <Pill key={r} tone={RISK[r].tone}>{t(RISK[r].label)}</Pill>)}
                          </div>
                        </div>
                      </div>
                      <Pill tone={CONCERN[c.concern].tone}>{t(CONCERN[c.concern].label)}</Pill>
                    </div>
                  </div>
                ))}
                {filteredChildren.length === 0 && <div className="p-12 text-center text-stone-400 text-sm">{t("No children match the filter.")}</div>}
              </div>
            </Card>
          </div>
        )}

        {tab === "visits" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-3xl font-bold">{t("Home Visits Log")}</h1>
              <button onClick={() => setShowAdd("visit")} className="px-4 py-2 rounded-lg bg-[#C84B31] hover:bg-[#9B3722] text-white text-sm font-medium flex items-center gap-2">
                <Plus size={16} /> {t("Log Visit")}
              </button>
            </div>
            <Card>
              <div className="divide-y divide-stone-100">
                {[...visits].sort((a, b) => b.date.localeCompare(a.date)).map((v) => {
                  const c = children.find((x) => x.id === v.childId);
                  return (
                    <div key={v.id} className="p-4 hover:bg-stone-50/50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">{c?.name}</span>
                            <span className="text-sm text-stone-500">· {c?.village}, {c?.district}</span>
                          </div>
                          <div className="text-sm text-stone-500 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {v.date}</span>
                            <span className="flex items-center gap-1"><UserCircle2 size={12} /> {v.fw}</span>
                          </div>
                          <p className="text-sm text-stone-700 mt-2 leading-relaxed">{v.note}</p>
                        </div>
                        <Pill tone={CONCERN[v.concern].tone}>{t(CONCERN[v.concern].label)}</Pill>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "actions" && (
          <div className="space-y-5">
            <h1 className="text-3xl font-bold">{t("Interventions Board")}</h1>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { k: "planned",  l: "Planned",  tone: "bg-amber-50 ring-amber-200",     textTone: "text-amber-900" },
                { k: "ongoing",  l: "Ongoing",  tone: "bg-blue-50 ring-blue-200",       textTone: "text-blue-900" },
                { k: "resolved", l: "Resolved", tone: "bg-emerald-50 ring-emerald-200", textTone: "text-emerald-900" },
              ].map((col) => (
                <div key={col.k} className={`rounded-2xl ring-1 p-4 ${col.tone}`}>
                  <div className={`font-bold mb-3 ${col.textTone}`}>{t(col.l)} ({interventions.filter((i) => i.stage === col.k).length})</div>
                  <div className="space-y-2">
                    {interventions.filter((i) => i.stage === col.k).map((i) => {
                      const c = children.find((x) => x.id === i.childId);
                      return (
                        <div key={i.id} className="bg-white rounded-xl p-3 ring-1 ring-stone-200">
                          <div className="font-semibold text-sm text-stone-900">{i.type}</div>
                          <div className="text-xs text-stone-600 mt-1">{c?.name} · {c?.village}</div>
                          <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                            <Calendar size={10} /> {i.date} · <UserCircle2 size={10} /> {i.lead}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAdd && (
        <AddModal
          kind={showAdd}
          allChildren={children}
          onClose={() => setShowAdd(null)}
          onAddChild={(c) => setChildren((p) => [c, ...p])}
          onAddVisit={(v) => setVisits((p) => [v, ...p])}
        />
      )}
    </div>
  );
}

function AddModal({ kind, allChildren, onClose, onAddChild, onAddVisit }) {
  const t = useT();
  const [form, setForm] = useState({
    name: "", age: "", gender: "F", village: "", district: "Purnia",
    risks: [], concern: "medium", fw: "Sachina",
    childId: allChildren[0]?.id, date: "2026-05-09", note: "",
  });
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (kind === "child") {
      onAddChild({
        id: "c" + Date.now(),
        name: form.name, age: Number(form.age) || 10, gender: form.gender,
        village: form.village, district: form.district,
        risks: form.risks, concern: form.concern, fw: form.fw,
        lastVisit: form.date,
      });
    } else {
      onAddVisit({
        id: "v" + Date.now(),
        childId: form.childId, date: form.date, fw: form.fw,
        concern: form.concern, note: form.note,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold">{kind === "child" ? t("Register New Case") : t("Log Home Visit")}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {kind === "child" ? (
            <>
              <Inp label={t("Child Name")} value={form.name} onChange={(v) => upd("name", v)} />
              <div className="grid grid-cols-2 gap-3">
                <Inp label={t("Age")} value={form.age} onChange={(v) => upd("age", v)} type="number" />
                <Sel label={t("Gender")} value={form.gender} onChange={(v) => upd("gender", v)} opts={[["F",t("Female")],["M",t("Male")]]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Inp label={t("Village")} value={form.village} onChange={(v) => upd("village", v)} />
                <Sel label={t("District")} value={form.district} onChange={(v) => upd("district", v)} opts={["Purnia","Araria","Kishanganj","Katihar","Supaul","Madhepura"].map((d) => [d, d])} />
              </div>
              <div>
                <div className="text-xs font-semibold text-stone-600 mb-1.5 uppercase">{t("Risk Markers")}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(RISK).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => upd("risks", form.risks.includes(k) ? form.risks.filter((x) => x !== k) : [...form.risks, k])}
                      className={`px-2.5 py-1 rounded-full text-xs ring-1 ${form.risks.includes(k) ? v.tone + " font-semibold" : "bg-white ring-stone-200 text-stone-600"}`}
                    >
                      {t(v.label)}
                    </button>
                  ))}
                </div>
              </div>
              <Sel label={t("Concern Level")} value={form.concern} onChange={(v) => upd("concern", v)} opts={Object.entries(CONCERN).map(([k, v]) => [k, t(v.label)])} />
              <Sel label={t("Fieldworker")} value={form.fw} onChange={(v) => upd("fw", v)} opts={FW.map((f) => [f, f])} />
            </>
          ) : (
            <>
              <Sel label={t("Child")} value={form.childId} onChange={(v) => upd("childId", v)} opts={allChildren.map((c) => [c.id, c.name + " · " + c.village])} />
              <div className="grid grid-cols-2 gap-3">
                <Inp label={t("Visit Date")} value={form.date} onChange={(v) => upd("date", v)} type="date" />
                <Sel label={t("Fieldworker")} value={form.fw} onChange={(v) => upd("fw", v)} opts={FW.map((f) => [f, f])} />
              </div>
              <Sel label={t("Concern Level")} value={form.concern} onChange={(v) => upd("concern", v)} opts={Object.entries(CONCERN).map(([k, v]) => [k, t(v.label)])} />
              <div>
                <div className="text-xs font-semibold text-stone-600 mb-1.5 uppercase">{t("Field Notes")}</div>
                <textarea value={form.note} onChange={(e) => upd("note", e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg ring-1 ring-stone-200 text-sm focus:ring-2 focus:ring-[#C84B31] outline-none" />
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 text-sm">{t("Cancel")}</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-[#C84B31] hover:bg-[#9B3722] text-white text-sm font-semibold">{t("Save")}</button>
        </div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <div className="text-xs font-semibold text-stone-600 mb-1.5 uppercase">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-stone-200 text-sm focus:ring-2 focus:ring-[#C84B31] outline-none" />
    </div>
  );
}
function Sel({ label, value, onChange, opts }) {
  return (
    <div>
      <div className="text-xs font-semibold text-stone-600 mb-1.5 uppercase">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-stone-200 text-sm bg-white">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
