// @ts-nocheck
"use client";
import React, { useState } from "react";
import { claudeCall } from "@/lib/ai-client";
import { useT } from "@/components/i18n/LanguageProvider";

/** Legal Research & Drafting Suite — Janman People's Foundation
 *  6 modules: Case Tracker, Research Assistant, Document Drafter,
 *  Briefing Note Builder, Document Summariser, FIR/Complaint Drafter. */

const MODULES = [
  { id: "tracker",    label: "Case Tracker",          icon: "📁" },
  { id: "research",   label: "Research Assistant",    icon: "🔎" },
  { id: "drafter",    label: "Document Drafter",      icon: "✍️" },
  { id: "briefing",   label: "Briefing Note Builder", icon: "📜" },
  { id: "summariser", label: "Document Summariser",   icon: "📄" },
  { id: "fir",        label: "FIR / Complaint Drafter", icon: "⚖️" },
];

const DOC_TYPES = [
  "Bail Application","Anticipatory Bail Application","Writ Petition (HC)","SLP (SC)",
  "PIL","FIR / Complaint","Legal Notice","Reply to Notice","Affidavit","Plaint","Written Statement",
];
const STATUTES = ["IPC/BNS","POCSO","SC/ST (PoA) Act","PWDVA","Dowry Prohibition Act","MGNREGA","NFSA","UAPA","NDPS","Custom"];

function Field({ label, value, onChange, type = "input", rows = 3, options, placeholder, required }) {
  const cls = "w-full border border-(--border) rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-(--accent) bg-(--surface)";
  return (
    <div>
      <label className="block text-xs font-semibold text-(--muted) mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-(--error-text)"> *</span>}
      </label>
      {type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={cls} />
      ) : type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function Output({ title, text, loading }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  if (loading)
    return (
      <div className="mt-4 bg-(--bg-secondary) border border-(--border) rounded-lg p-6 text-center text-sm text-(--muted)">
        <div className="inline-block w-4 h-4 border-2 border-(--accent) border-t-transparent rounded-full animate-spin mr-2"></div>
        {t("Working...")}
      </div>
    );
  if (!text) return null;
  return (
    <div className="mt-4 bg-(--bg-secondary) border border-(--border) rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-(--text)">{title}</span>
        <button onClick={copy} className="text-xs text-(--accent) hover:underline">{copied ? t("Copied!") : t("Copy")}</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-(--text) font-sans leading-relaxed">{text}</pre>
    </div>
  );
}

function CaseTracker() {
  const t = useT();
  const [cases, setCases] = useState([
    { id: 1, name: "State v. Mathur Manjhi", court: "Patna HC",     parties: "State v. Mathur Manjhi", stage: "Final Hearing",     nextDate: "2026-05-20", lawyer: "Shashwat", notes: "POCSO acquittal appeal" },
    { id: 2, name: "Arsalan v. NIA",         court: "Supreme Court", parties: "Arsalan v. NIA",        stage: "Listed for Hearing", nextDate: "2026-05-18", lawyer: "Sr. Adv.", notes: "UAPA bail; MHA sanction defect" },
  ]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", court: "Patna HC", parties: "", stage: "Filed", nextDate: "", lawyer: "Shashwat", notes: "" });

  const upcoming = cases.filter((c) => {
    if (!c.nextDate) return false;
    const days = (new Date(c.nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-(--text)">{t("Case Tracker")}</h2>
          <p className="text-sm text-(--muted)">{t("In-session tracker. For permanent matters, use /director/cases.")}</p>
        </div>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-medium hover:opacity-90">{t("+ New Matter")}</button>
      </div>
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="font-semibold text-amber-900 text-sm">⚠ {upcoming.length} {t("hearing(s) within 7 days")}</div>
          <div className="text-xs text-amber-800 mt-1">{upcoming.map((c) => `${c.name} (${c.nextDate})`).join(" · ")}</div>
        </div>
      )}
      <div className="bg-(--surface) border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-(--bg-secondary) text-xs uppercase text-(--muted)">
            <tr>
              <th className="px-4 py-2 text-left">{t("Matter")}</th>
              <th className="px-4 py-2 text-left">{t("Court")}</th>
              <th className="px-4 py-2 text-left">{t("Stage")}</th>
              <th className="px-4 py-2 text-left">{t("Next Date")}</th>
              <th className="px-4 py-2 text-left">{t("Lawyer")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cases.map((c) => (
              <tr key={c.id} className="hover:bg-(--bg-secondary)">
                <td className="px-4 py-3 font-medium">{c.name}<div className="text-xs text-(--muted)">{c.notes}</div></td>
                <td className="px-4 py-3 text-(--muted)">{c.court}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-(--accent-muted) text-(--accent) rounded text-xs">{c.stage}</span></td>
                <td className="px-4 py-3 text-(--muted)">{c.nextDate || "—"}</td>
                <td className="px-4 py-3 text-(--muted)">{c.lawyer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-(--surface) rounded-xl max-w-lg w-full p-6 space-y-3">
            <h3 className="text-lg font-bold">{t("New Matter")}</h3>
            <Field label={t("Matter Name")} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field label={t("Parties")} value={form.parties} onChange={(v) => setForm((f) => ({ ...f, parties: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Court")} type="select" value={form.court} onChange={(v) => setForm((f) => ({ ...f, court: v }))} options={["Supreme Court","Patna HC","District Court","DLSA","Other"]} />
              <Field label={t("Stage")} type="select" value={form.stage} onChange={(v) => setForm((f) => ({ ...f, stage: v }))} options={["Filed","Listed","Final Hearing","Judgment Reserved","Disposed"]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Next Date")} type="date" value={form.nextDate} onChange={(v) => setForm((f) => ({ ...f, nextDate: v }))} />
              <Field label={t("Lawyer")} value={form.lawyer} onChange={(v) => setForm((f) => ({ ...f, lawyer: v }))} />
            </div>
            <Field label={t("Notes")} type="textarea" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} rows={2} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-sm">{t("Cancel")}</button>
              <button
                onClick={() => {
                  setCases((p) => [...p, { ...form, id: Date.now() }]);
                  setShow(false);
                  setForm({ name: "", court: "Patna HC", parties: "", stage: "Filed", nextDate: "", lawyer: "Shashwat", notes: "" });
                }}
                className="px-4 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold"
              >
                {t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchAssistant() {
  const t = useT();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (!input.trim()) return;
    const newMsgs = [...msgs, { role: "user", content: input }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    const sys = "You are a legal research assistant for an Indian advocate practising at Patna HC and Supreme Court. Provide structured, well-cited answers on Indian law (Constitution, IPC/BNS, CrPC/BNSS, Evidence/BSA, special statutes). Always include statute, case citations with year and parallel citation, and a short ratio. Bias toward Bihar / SC precedent.";
    const reply = await claudeCall(sys, newMsgs, 2000);
    setMsgs([...newMsgs, { role: "assistant", content: reply }]);
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("Research Assistant")}</h2>
        <p className="text-sm text-(--muted)">{t("Ask questions on Indian law — case law, statutes, procedure.")}</p>
      </div>
      <div className="bg-(--surface) border rounded-lg p-4 h-[400px] overflow-y-auto space-y-3">
        {msgs.length === 0 && <div className="text-sm text-(--muted) text-center pt-32">{t("Start a conversation. e.g. \"What is the test for granting bail under S. 437 CrPC for an offence punishable with life?\"")}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.role === "user" ? "ml-auto bg-(--accent-muted) text-(--accent)" : "bg-(--bg-secondary)"} p-3 rounded-lg text-sm`}>
            <div className="text-xs font-semibold mb-1 opacity-60">{m.role === "user" ? t("You") : "Claude"}</div>
            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
          </div>
        ))}
        {loading && <div className="text-sm text-(--muted)">{t("Thinking…")}</div>}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("Ask a legal question...")} className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-(--accent)" />
        <button onClick={send} disabled={loading} className="px-5 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold disabled:opacity-50">{t("Send")}</button>
      </div>
    </div>
  );
}

function DocumentDrafter() {
  const t = useT();
  const [form, setForm] = useState({ type: "Bail Application", court: "Patna HC", parties: "", facts: "", relief: "", grounds: "" });
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true); setOut("");
    const sys = "You are an experienced Indian advocate. Draft formal legal documents in proper Indian court format with headings, numbered paragraphs, statutory provisions, and case citations. Use the precise language of Indian courts.";
    const prompt = `Draft a ${form.type} for ${form.court}.\n\nParties: ${form.parties}\nFacts: ${form.facts}\nRelief: ${form.relief}\nGrounds noted: ${form.grounds}\n\nInclude title, before the court, in the matter of, facts, grounds with case law (cite Arnesh Kumar, Satender Kumar Antil, Sanjay Chandra for bail; relevant Constitution articles for writs), and prayer.`;
    setOut(await claudeCall(sys, [{ role: "user", content: prompt }], 3000));
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("Document Drafter")}</h2>
        <p className="text-sm text-(--muted)">{t("Generate first drafts of petitions, applications, notices.")}</p>
      </div>
      <div className="bg-(--surface) border rounded-lg p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Document Type")} type="select" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={DOC_TYPES} />
          <Field label={t("Court")} value={form.court} onChange={(v) => setForm((f) => ({ ...f, court: v }))} />
        </div>
        <Field label={t("Parties")} value={form.parties} onChange={(v) => setForm((f) => ({ ...f, parties: v }))} placeholder={t("e.g. Mohan Kumar v. State of Bihar")} />
        <Field label={t("Facts")} type="textarea" rows={5} value={form.facts} onChange={(v) => setForm((f) => ({ ...f, facts: v }))} />
        <Field label={t("Relief Sought")} type="textarea" rows={2} value={form.relief} onChange={(v) => setForm((f) => ({ ...f, relief: v }))} />
        <Field label={t("Key Grounds / Notes")} type="textarea" rows={3} value={form.grounds} onChange={(v) => setForm((f) => ({ ...f, grounds: v }))} />
        <button onClick={generate} disabled={loading} className="px-5 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold disabled:opacity-50">{t("Generate Draft")}</button>
      </div>
      <Output title={t("Draft Document")} text={out} loading={loading} />
    </div>
  );
}

function BriefingNoteBuilder() {
  const t = useT();
  const [form, setForm] = useState({ caseTitle: "", court: "Supreme Court of India", caseNo: "", impugnedOrder: "", issues: "", facts: "", submissions: "" });
  const [out, setOut] = useState(""); const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true); setOut("");
    const sys = "You are drafting an Indian SC/HC briefing note in house style: crisp, no fluff; lettered submission heads; Issue/Findings/Conclusion labels; case law cited at cluster end; abbreviations P, IO, CS, TC, JC; dual page refs P[n]/E[n] where applicable.";
    const prompt = `Briefing note.\n\nCase Title: ${form.caseTitle}\nCourt: ${form.court}\nCase No: ${form.caseNo}\nImpugned Order: ${form.impugnedOrder}\nFacts: ${form.facts}\nIssues: ${form.issues}\nSubmission heads: ${form.submissions}\n\nProduce: header, overview, issues, facts, lettered submissions (A, B, C…) with sub-points (1, 2, 3…) and case clusters at the end of each, conclusion/prayer.`;
    setOut(await claudeCall(sys, [{ role: "user", content: prompt }], 4000));
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("Briefing Note Builder")}</h2>
        <p className="text-sm text-(--muted)">{t("SC/HC style briefing notes for senior counsel.")}</p>
      </div>
      <div className="bg-(--surface) border rounded-lg p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Case Title")} value={form.caseTitle} onChange={(v) => setForm((f) => ({ ...f, caseTitle: v }))} />
          <Field label={t("Court")} value={form.court} onChange={(v) => setForm((f) => ({ ...f, court: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Case No / Diary No")} value={form.caseNo} onChange={(v) => setForm((f) => ({ ...f, caseNo: v }))} />
          <Field label={t("Impugned Order Date / Details")} value={form.impugnedOrder} onChange={(v) => setForm((f) => ({ ...f, impugnedOrder: v }))} />
        </div>
        <Field label={t("Facts")} type="textarea" rows={4} value={form.facts} onChange={(v) => setForm((f) => ({ ...f, facts: v }))} />
        <Field label={t("Issues")} type="textarea" rows={3} value={form.issues} onChange={(v) => setForm((f) => ({ ...f, issues: v }))} />
        <Field label={t("Submission Heads")} type="textarea" rows={3} value={form.submissions} onChange={(v) => setForm((f) => ({ ...f, submissions: v }))} placeholder={t("e.g. A. No prima facie case; B. No flight risk; C. Parity")} />
        <button onClick={generate} disabled={loading} className="px-5 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold disabled:opacity-50">{t("Generate Note")}</button>
      </div>
      <Output title={t("Briefing Note")} text={out} loading={loading} />
    </div>
  );
}

function DocumentSummariser() {
  const t = useT();
  const [text, setText] = useState(""); const [out, setOut] = useState(""); const [loading, setLoading] = useState(false);
  const generate = async () => {
    if (!text.trim()) return;
    setLoading(true); setOut("");
    const sys = "Summarise Indian judgments/orders/documents in structured form: Court/Bench/Date | Parties | Facts | Issues | Held | Ratio | Significance for practice.";
    setOut(await claudeCall(sys, [{ role: "user", content: text }], 2500));
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("Document Summariser")}</h2>
        <p className="text-sm text-(--muted)">{t("Paste any judgment, order, or document.")}</p>
      </div>
      <div className="bg-(--surface) border rounded-lg p-5 space-y-3">
        <Field label={t("Document Text")} type="textarea" rows={10} value={text} onChange={setText} placeholder={t("Paste the judgment or order here...")} />
        <button onClick={generate} disabled={loading} className="px-5 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold disabled:opacity-50">{t("Summarise")}</button>
      </div>
      <Output title={t("Structured Summary")} text={out} loading={loading} />
    </div>
  );
}

function FIRDrafter() {
  const t = useT();
  const [form, setForm] = useState({ complainant: "", address: "", phone: "", ps: "", date: "", time: "", place: "", accused: "", incident: "", injuries: "", witnesses: "", statute: "IPC/BNS" });
  const [out, setOut] = useState(""); const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true); setOut("");
    const sys = "Draft a properly structured FIR / complaint in Indian format with all sections of the relevant statute correctly identified. Suggest applicable provisions of IPC/BNS, POCSO, SC/ST Act, PWDVA, Dowry Prohibition Act, NDPS, or other statutes as appropriate.";
    const prompt = `FIR / Complaint draft.\n\nComplainant: ${form.complainant}\nAddress: ${form.address}\nPhone: ${form.phone}\nPolice Station: ${form.ps}\nDate of incident: ${form.date}, Time: ${form.time}\nPlace: ${form.place}\nAccused: ${form.accused}\nIncident description: ${form.incident}\nInjuries: ${form.injuries}\nWitnesses: ${form.witnesses}\nApplicable statute focus: ${form.statute}\n\nDraft: complete FIR/complaint with addressee, brief facts narrated chronologically, identification of accused, witnesses, suggested sections of the applicable statutes with explanations, prayer for registration and investigation.`;
    setOut(await claudeCall(sys, [{ role: "user", content: prompt }], 3000));
    setLoading(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("FIR / Complaint Drafter")}</h2>
        <p className="text-sm text-(--muted)">{t("Auto-suggests applicable sections.")}</p>
      </div>
      <div className="bg-(--surface) border rounded-lg p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Complainant")} value={form.complainant} onChange={(v) => setForm((f) => ({ ...f, complainant: v }))} />
          <Field label={t("Phone")} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        </div>
        <Field label={t("Address")} value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Police Station")} value={form.ps} onChange={(v) => setForm((f) => ({ ...f, ps: v }))} />
          <Field label={t("Date")} type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
          <Field label={t("Time")} value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} />
        </div>
        <Field label={t("Place of Incident")} value={form.place} onChange={(v) => setForm((f) => ({ ...f, place: v }))} />
        <Field label={t("Accused (names, descriptions)")} type="textarea" rows={2} value={form.accused} onChange={(v) => setForm((f) => ({ ...f, accused: v }))} />
        <Field label={t("Incident Description")} type="textarea" rows={5} value={form.incident} onChange={(v) => setForm((f) => ({ ...f, incident: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Injuries / Damage")} type="textarea" rows={2} value={form.injuries} onChange={(v) => setForm((f) => ({ ...f, injuries: v }))} />
          <Field label={t("Witnesses")} type="textarea" rows={2} value={form.witnesses} onChange={(v) => setForm((f) => ({ ...f, witnesses: v }))} />
        </div>
        <Field label={t("Statute Focus")} type="select" value={form.statute} onChange={(v) => setForm((f) => ({ ...f, statute: v }))} options={STATUTES} />
        <button onClick={generate} disabled={loading} className="px-5 py-2 bg-(--accent) text-(--accent-contrast) rounded-md text-sm font-semibold disabled:opacity-50">{t("Generate FIR / Complaint")}</button>
      </div>
      <Output title={t("Draft FIR / Complaint")} text={out} loading={loading} />
    </div>
  );
}

export default function LegalSuite() {
  const t = useT();
  const [tab, setTab] = useState("tracker");
  return (
    <div className="min-h-screen bg-(--bg-secondary) flex">
      <aside className="w-64 bg-(--accent) text-(--accent-contrast) p-4 space-y-1">
        <div className="p-3 mb-3 border-b border-(--accent)">
          <div className="font-bold text-base">{t("Legal Suite")}</div>
          <div className="text-xs opacity-70 mt-0.5">Janman People's Foundation</div>
          <div className="text-xs opacity-60">Jan Nyaya Abhiyan</div>
        </div>
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => setTab(m.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition ${tab === m.id ? "bg-(--accent) text-(--accent-contrast)" : "hover:opacity-90"}`}
          >
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl">
          {tab === "tracker"    && <CaseTracker />}
          {tab === "research"   && <ResearchAssistant />}
          {tab === "drafter"    && <DocumentDrafter />}
          {tab === "briefing"   && <BriefingNoteBuilder />}
          {tab === "summariser" && <DocumentSummariser />}
          {tab === "fir"        && <FIRDrafter />}
        </div>
      </main>
    </div>
  );
}
