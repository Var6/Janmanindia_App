// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import { claudeCall, lsGet, lsSet } from "@/lib/ai-client";

/** Jan Sahayak Pro — internal org-management app for Janman / JNA.
 *  Casework Tracker, Case Kanban, DLF/PLV Tracker, Event Pipeline, Annual Report. */

const C = {
  bg: "#09101F", surface: "#101724", card: "#182030", border: "#1C2B46",
  accent: "#E8A243",
  red: "#E05C5C", green: "#4CAF82", blue: "#4A90D9", purple: "#9B72CF",
  muted: "#3F5070", text: "#CBD8ED", dim: "#6278A0",
};

const TEAM = ["Shashwat","Shourya Roy","Roshin Jacob","Mugdha","Prakash Kumar","Sachina","Nawaz Hassan","Tausif Raza","Mithlesh Kumar","Pintu Kumar Mehta","Nagmani","Ashwini Pandey"];
const DISTRICTS = ["Purnia","Araria","Kishanganj","Katihar","Supaul","Madhepura"];
const CASE_TYPES = ["Bail / Anticipatory Bail","Writ Petition (HC)","PIL","POCSO","Domestic Violence","Maintenance","Custodial Death","SC/ST Atrocities","Land / Forest Rights","Labour / MGNREGS","Child Marriage","RTI / Representation","Criminal Appeal","Habeas Corpus","Other"];
const COURTS = ["Supreme Court of India","Patna High Court","District Court — Patna","District Court — Purnia","District Court — Araria","District Court — Kishanganj","District Court — Katihar","District Court — Supaul","District Court — Madhepura","DLSA / SLSA","Other"];
const EVENT_TYPES = ["Legal Aid Camp","PLV Training","DLF Residential Training","Annual Consultation","Fact-Finding Mission","Community Outreach","Networking Meeting","Advocacy Campaign","State-level Conference","District-level Workshop","Jan Sunwai (Public Hearing)","Press Conference","Donor Visit / Review Meeting","Team Review Meeting"];

const CASE_STAGES = [
  { id: "intake",   l: "New Intake",          tone: "#9B72CF" },
  { id: "drafting", l: "Research & Drafting", tone: "#4A90D9" },
  { id: "filed",    l: "Filed",               tone: "#26A69A" },
  { id: "active",   l: "Active Hearing",      tone: "#E8A243" },
  { id: "stayed",   l: "Stayed / Appealed",   tone: "#E05C5C" },
  { id: "disposed", l: "Disposed",            tone: "#4CAF82" },
];
const TASK_COLS = [
  { id: "todo",     l: "To Do",       tone: "#9B72CF" },
  { id: "progress", l: "In Progress", tone: "#4A90D9" },
  { id: "blocked",  l: "Blocked",     tone: "#E05C5C" },
  { id: "done",     l: "Done",        tone: "#4CAF82" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const td = () => new Date().toISOString().slice(0, 10);

const Card = ({ children, p = 16, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: p, ...style }}>{children}</div>
);
const Btn = ({ children, onClick, color = "accent", size = "md", disabled }) => {
  const sizes = { sm: "6px 12px,11px", md: "9px 16px,12.5px", lg: "12px 22px,14px" };
  const [pad, fs] = sizes[size].split(",");
  const colors = {
    accent: { bg: C.accent, fg: "#0d0d0d" },
    ghost:  { bg: "transparent", fg: C.text, b: `1px solid ${C.border}` },
    green:  { bg: C.green, fg: "#0d0d0d" },
    red:    { bg: C.red, fg: "#fff" },
    blue:   { bg: C.blue, fg: "#fff" },
  };
  const c = colors[color];
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: c.bg, color: c.fg, border: c.b || "none", padding: pad, fontSize: fs, fontWeight: 600, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
};
const Inp = ({ label, value, onChange, type = "text", rows, placeholder, options }) => (
  <div style={{ marginBottom: 10 }}>
    {label && <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>}
    {type === "textarea" ? (
      <textarea value={value} onChange={onChange} rows={rows || 3} placeholder={placeholder} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "8px 10px", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }} />
    ) : type === "select" ? (
      <select value={value} onChange={onChange} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "8px 10px", borderRadius: 6, fontSize: 12.5 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "8px 10px", borderRadius: 6, fontSize: 12.5 }} />
    )}
  </div>
);
const Tag = ({ children, tone = C.accent }) => (
  <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: tone + "22", color: tone, border: `1px solid ${tone}55` }}>{children}</span>
);

function CaseworkModule() {
  const [cases, setCases] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", caseNo: "", caseType: "Bail / Anticipatory Bail", court: "Patna High Court", ps: "", district: "Purnia", advocate: "Shashwat", nextDate: "", stage: "intake", brief: "", relief: "", acts: "" });
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState({ text: "", loading: false });
  const [active, setActive] = useState(null);
  useEffect(() => { lsGet("jnp_cases").then((d) => d && setCases(d)); }, []);
  useEffect(() => { lsSet("jnp_cases", cases); }, [cases]);
  const save = () => {
    setCases((p) => [{ ...form, id: uid(), createdAt: td(), hearings: [] }, ...p]);
    setShow(false);
    setForm({ name: "", caseNo: "", caseType: "Bail / Anticipatory Bail", court: "Patna High Court", ps: "", district: "Purnia", advocate: "Shashwat", nextDate: "", stage: "intake", brief: "", relief: "", acts: "" });
  };
  const generateDraft = async (c, type) => {
    setDraft({ text: "", loading: true });
    const prompts = {
      bail:      `Draft a bail application for the Patna High Court.\nMATTER: ${c.name}\nCASE NO: ${c.caseNo}\nFACTS: ${c.brief}\nACTS: ${c.acts}\nRELIEF: ${c.relief}\nCite Arnesh Kumar (2014), Satender Kumar Antil (2022), Sanjay Chandra (2012), Gudikanti Narasimhulu, Dataram Singh, Prasanta Kumar Sarkar. Include grounds, prayer.`,
      writ:      `Draft a writ petition under Article 226 of the Constitution.\nMATTER: ${c.name}\nFACTS: ${c.brief}\nRELIEF: ${c.relief}\nInclude maintainability, grounds, prayer; cite relevant SC and Patna HC precedents.`,
      sp:        `Draft a representation to the SP for ${c.district} district.\nMATTER: ${c.name}\nFIR/PS: ${c.ps}\nFACTS: ${c.brief}\nSeek: registration of FIR / proper investigation / specific action.`,
      ff:        `Draft a fact-finding report for ${c.name}.\nFACTS: ${c.brief}\nDISTRICT: ${c.district}\nStructure: methodology, findings, recommendations, signatories.`,
      complaint: `Draft a complaint / plaint for ${c.name}.\nFACTS: ${c.brief}\nACTS: ${c.acts}\nRELIEF: ${c.relief}\nInclude jurisdiction, cause of action, parties, prayer.`,
    };
    const sys = "You are an experienced advocate of the Patna High Court and Supreme Court of India. Draft in formal Indian legal style with numbered paragraphs and case citations.";
    const text = await claudeCall(sys, [{ role: "user", content: prompts[type] }], 3000);
    setDraft({ text, loading: false });
  };
  const filtered = cases.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.advocate.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Casework Tracker</h2>
          <p style={{ fontSize: 12, color: C.dim, margin: "3px 0 0" }}>{cases.length} active matters · saved in your browser</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search..." style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "7px 12px", borderRadius: 6, fontSize: 12.5 }} />
          <Btn onClick={() => setShow(true)}>+ New Matter</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map((c) => {
          const stage = CASE_STAGES.find((s) => s.id === c.stage) || CASE_STAGES[0];
          const days = c.nextDate ? Math.round((new Date(c.nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          const urgent = days !== null && days >= 0 && days <= 7;
          return (
            <Card key={c.id} p={14}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14, flex: 1 }}>{c.name}</div>
                <Tag tone={stage.tone}>{stage.l}</Tag>
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{c.caseType} · {c.court} · {c.district}</div>
              <div style={{ fontSize: 11, color: C.dim, display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span>Adv: {c.advocate}</span>
                {c.nextDate && <span style={{ color: urgent ? C.red : C.dim, fontWeight: urgent ? 700 : 400 }}>{urgent && "⚠ "}Next: {c.nextDate}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Btn size="sm" color="ghost" onClick={() => setActive(c)}>View</Btn>
                <Btn size="sm" color="accent" onClick={() => { setActive(c); generateDraft(c, "bail"); }}>AI Draft</Btn>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (<Card><div style={{ textAlign: "center", color: C.dim, fontSize: 12, padding: 30 }}>No matters yet. Add your first.</div></Card>)}
      </div>
      {show && (
        <div style={{ position: "fixed", inset: 0, background: "#000A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: C.card, borderRadius: 14, padding: 20, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: "0 0 14px", color: C.text, fontSize: 16, fontWeight: 700 }}>New Matter</h3>
            <Inp label="Matter Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Case No" value={form.caseNo} onChange={(e) => setForm((f) => ({ ...f, caseNo: e.target.value }))} />
              <Inp label="PS / FIR" value={form.ps} onChange={(e) => setForm((f) => ({ ...f, ps: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Case Type" type="select" value={form.caseType} onChange={(e) => setForm((f) => ({ ...f, caseType: e.target.value }))} options={CASE_TYPES} />
              <Inp label="Court" type="select" value={form.court} onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))} options={COURTS} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Inp label="District" type="select" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} options={DISTRICTS} />
              <Inp label="Advocate" type="select" value={form.advocate} onChange={(e) => setForm((f) => ({ ...f, advocate: e.target.value }))} options={TEAM} />
              <Inp label="Next Date" type="date" value={form.nextDate} onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))} />
            </div>
            <Inp label="Brief Facts" type="textarea" rows={4} value={form.brief} onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))} />
            <Inp label="Relief Sought" type="textarea" rows={2} value={form.relief} onChange={(e) => setForm((f) => ({ ...f, relief: e.target.value }))} />
            <Inp label="Statutes / Sections" value={form.acts} onChange={(e) => setForm((f) => ({ ...f, acts: e.target.value }))} placeholder="e.g. BNS 103, BNSS 480" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <Btn color="ghost" onClick={() => setShow(false)}>Cancel</Btn>
              <Btn color="accent" onClick={save}>Save Matter</Btn>
            </div>
          </div>
        </div>
      )}
      {active && (
        <div style={{ position: "fixed", inset: 0, background: "#000A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: C.card, borderRadius: 14, padding: 20, maxWidth: 780, width: "100%", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 700 }}>{active.name}</h3>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{active.caseType} · {active.court}</div>
              </div>
              <button onClick={() => { setActive(null); setDraft({ text: "", loading: false }); }} style={{ background: "none", border: "none", color: C.dim, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <Btn size="sm" onClick={() => generateDraft(active, "bail")}>Bail Application</Btn>
              <Btn size="sm" color="blue" onClick={() => generateDraft(active, "writ")}>HC Writ</Btn>
              <Btn size="sm" color="green" onClick={() => generateDraft(active, "sp")}>Letter to SP</Btn>
              <Btn size="sm" color="ghost" onClick={() => generateDraft(active, "ff")}>Fact-Finding</Btn>
              <Btn size="sm" color="ghost" onClick={() => generateDraft(active, "complaint")}>Complaint</Btn>
            </div>
            {draft.loading && <div style={{ color: C.dim, fontSize: 12, padding: 20, textAlign: "center" }}>Drafting...</div>}
            {draft.text && (<pre style={{ background: C.surface, padding: 14, borderRadius: 8, color: C.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", maxHeight: 400, overflowY: "auto" }}>{draft.text}</pre>)}
            {!draft.text && !draft.loading && (
              <div style={{ color: C.dim, fontSize: 12.5, lineHeight: 1.7 }}>
                <p><strong>Brief:</strong> {active.brief || "—"}</p>
                <p><strong>Relief:</strong> {active.relief || "—"}</p>
                <p><strong>Acts:</strong> {active.acts || "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseKanban() {
  const [cases, setCases] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [hover, setHover] = useState(null);
  useEffect(() => { lsGet("jnp_cases").then((d) => d && setCases(d)); }, []);
  useEffect(() => { lsSet("jnp_cases", cases); }, [cases]);
  const move = (id, newStage) => { setCases((p) => p.map((c) => (c.id === id ? { ...c, stage: newStage } : c))); setDragId(null); setHover(null); };
  const quickAdd = (stage, name) => {
    if (!name.trim()) return;
    setCases((p) => [{ id: uid(), name, caseType: "Other", court: "Patna High Court", district: "Purnia", advocate: "Shashwat", stage, createdAt: td(), brief: "", relief: "", acts: "", nextDate: "", caseNo: "", ps: "" }, ...p]);
  };
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Case Kanban</h2>
        <p style={{ fontSize: 12, color: C.dim, margin: "3px 0 0" }}>Drag matters across stages. ⚠ = hearing within 7 days.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${CASE_STAGES.length}, minmax(250px, 1fr))`, gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {CASE_STAGES.map((s) => (
          <KanbanCol key={s.id} stage={s} cases={cases.filter((c) => c.stage === s.id)} isHover={hover === s.id}
            onDragOver={(e) => { e.preventDefault(); setHover(s.id); }}
            onDragLeave={() => setHover(null)}
            onDrop={() => dragId && move(dragId, s.id)}
            onDragStart={setDragId}
            onQuickAdd={(name) => quickAdd(s.id, name)}
          />
        ))}
      </div>
    </div>
  );
}
function KanbanCol({ stage, cases, isHover, onDragOver, onDragLeave, onDrop, onDragStart, onQuickAdd }) {
  const [qa, setQa] = useState("");
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ background: isHover ? stage.tone + "15" : C.surface, border: `2px solid ${isHover ? stage.tone : C.border}`, borderRadius: 10, padding: 10, minHeight: 400, transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, color: stage.tone, fontSize: 12.5 }}>{stage.l}</div>
        <Tag tone={stage.tone}>{cases.length}</Tag>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
        {cases.map((c) => {
          const days = c.nextDate ? Math.round((new Date(c.nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          const urgent = days !== null && days >= 0 && days <= 7;
          return (
            <div key={c.id} draggable onDragStart={() => onDragStart(c.id)} style={{ background: C.card, padding: 10, borderRadius: 7, border: `1px solid ${C.border}`, cursor: "grab", fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: C.text, marginBottom: 3 }}>{c.name}</div>
              <div style={{ fontSize: 10.5, color: C.dim }}>{c.caseType}</div>
              <div style={{ fontSize: 10.5, color: C.dim, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                <span>{c.advocate}</span>
                {c.nextDate && <span style={{ color: urgent ? C.red : C.dim, fontWeight: urgent ? 700 : 400 }}>{urgent && "⚠ "}{c.nextDate}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
        <input value={qa} onChange={(e) => setQa(e.target.value)} placeholder="+ Quick add"
          onKeyDown={(e) => { if (e.key === "Enter" && qa.trim()) { onQuickAdd(qa); setQa(""); } }}
          style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "5px 8px", borderRadius: 5, fontSize: 11 }}
        />
      </div>
    </div>
  );
}

const th = { padding: "10px 12px", textAlign: "left", fontWeight: 700, color: C.dim, fontSize: 11, textTransform: "uppercase" };
const td2 = { padding: "8px 12px", color: C.text };
const inp = { background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "5px 8px", borderRadius: 5, fontSize: 12, width: "100%" };

function DLFTracker() {
  const [fellows, setFellows] = useState([]);
  const [report, setReport] = useState({ text: "", loading: false });
  useEffect(() => {
    lsGet("jnp_fellows").then((d) => {
      if (d) setFellows(d);
      else setFellows(DISTRICTS.map((d) => ({ id: uid(), district: d, name: "", phone: "", joined: td(), casesFiled: 0, campsDone: 0, plvsTrained: 0, notes: "" })));
    });
  }, []);
  useEffect(() => { if (fellows.length) lsSet("jnp_fellows", fellows); }, [fellows]);
  const update = (id, k, v) => setFellows((p) => p.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const totals = fellows.reduce((a, f) => ({ cases: a.cases + (+f.casesFiled || 0), camps: a.camps + (+f.campsDone || 0), plvs: a.plvs + (+f.plvsTrained || 0) }), { cases: 0, camps: 0, plvs: 0 });
  const generateReport = async () => {
    setReport({ text: "", loading: true });
    const sys = "Draft a funder-ready progress report for Azim Premji Philanthropic Initiatives covering the District Legal Fellowship across 6 Seemanchal districts.";
    const prompt = `Progress as of ${td()}:\n${fellows.map((f) => `${f.district}: ${f.name || "—"} | Cases filed: ${f.casesFiled} | Camps: ${f.campsDone} | PLVs trained: ${f.plvsTrained}`).join("\n")}\n\nTOTALS — Cases: ${totals.cases}, Camps: ${totals.camps}, PLVs: ${totals.plvs}\n\nProduce: executive summary, district-by-district narrative, key wins, challenges, way forward. The fellowship is named in memory of Late Senior Adv. Rajeeva Roy.`;
    const text = await claudeCall(sys, [{ role: "user", content: prompt }], 3000);
    setReport({ text, loading: false });
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>DLF Fellow & PLV Tracker</h2>
          <p style={{ fontSize: 12, color: C.dim, margin: "3px 0 0" }}>District Legal Fellowship · In memory of Sr. Adv. Rajeeva Roy</p>
        </div>
        <Btn color="green" onClick={generateReport}>Generate Funder Report</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Card p={14}><div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase" }}>Cases Filed</div><div style={{ fontSize: 26, fontWeight: 700, color: C.accent }}>{totals.cases}</div></Card>
        <Card p={14}><div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase" }}>Camps Done</div><div style={{ fontSize: 26, fontWeight: 700, color: C.green }}>{totals.camps}</div></Card>
        <Card p={14}><div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase" }}>PLVs Trained</div><div style={{ fontSize: 26, fontWeight: 700, color: C.blue }}>{totals.plvs}</div></Card>
      </div>
      <Card p={0}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.surface }}>
              <th style={th}>District</th><th style={th}>Fellow Name</th><th style={th}>Phone</th>
              <th style={th}>Cases</th><th style={th}>Camps</th><th style={th}>PLVs</th><th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {fellows.map((f) => (
              <tr key={f.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={td2}><strong style={{ color: C.accent }}>{f.district}</strong></td>
                <td style={td2}><input value={f.name} onChange={(e) => update(f.id, "name", e.target.value)} style={inp} /></td>
                <td style={td2}><input value={f.phone} onChange={(e) => update(f.id, "phone", e.target.value)} style={inp} /></td>
                <td style={td2}><input type="number" value={f.casesFiled} onChange={(e) => update(f.id, "casesFiled", +e.target.value)} style={{ ...inp, width: 60 }} /></td>
                <td style={td2}><input type="number" value={f.campsDone} onChange={(e) => update(f.id, "campsDone", +e.target.value)} style={{ ...inp, width: 60 }} /></td>
                <td style={td2}><input type="number" value={f.plvsTrained} onChange={(e) => update(f.id, "plvsTrained", +e.target.value)} style={{ ...inp, width: 60 }} /></td>
                <td style={td2}><input value={f.notes} onChange={(e) => update(f.id, "notes", e.target.value)} style={inp} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {report.loading && <Card style={{ marginTop: 14 }}><div style={{ color: C.dim, fontSize: 12, textAlign: "center" }}>Drafting funder report…</div></Card>}
      {report.text && (
        <Card style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 10px", color: C.accent, fontSize: 14 }}>Progress Report Draft</h3>
          <pre style={{ color: C.text, fontSize: 12, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 380, overflowY: "auto" }}>{report.text}</pre>
        </Card>
      )}
    </div>
  );
}

function AnnualReport() {
  const [year, setYear] = useState("2025-26");
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState("");
  const SECTIONS = [
    { id: "exec",       l: "Executive Summary",            ctx: "organisation overview, key wins, totals" },
    { id: "a2j",        l: "Access to Justice Programme",  ctx: "litigation, legal aid, district activity" },
    { id: "dlf",        l: "District Legal Fellowship",    ctx: "frame around Late Sr. Adv. Rajeeva Roy's memory; fellows, districts, mentorship" },
    { id: "litigation", l: "Litigation and Case Work",     ctx: "matters at Patna HC and SC; bail, writ, POCSO, custodial death, dowry death" },
    { id: "plv",        l: "PLV Training and Mobilisation",ctx: "paralegal volunteer training in Hindi, camps, community lawyers" },
    { id: "camps",      l: "Legal Aid Camps",              ctx: "camps across districts, beneficiaries, themes" },
    { id: "finance",    l: "Financial Narrative",          ctx: "grant utilisation, AP Philanthropic Initiatives, programme costs" },
  ];
  const generateSection = async (s) => {
    setLoading(s.id);
    const sys = "Draft Annual Report sections for Janman People's Foundation / Jan Nyaya Abhiyan (Access to Justice Programme). Funder: Azim Premji Philanthropic Initiatives. Tone: warm but factual, grounded in fieldwork. Length: 350-500 words per section.";
    const text = await claudeCall(sys, [{ role: "user", content: `Year: ${year}\nSection: ${s.l}\nContext: ${s.ctx}\nDraft this section in narrative form.` }], 1500);
    setSections((p) => ({ ...p, [s.id]: text }));
    setLoading("");
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Annual Report Drafter</h2>
          <p style={{ fontSize: 12, color: C.dim, margin: "3px 0 0" }}>AI-assisted section-by-section drafting.</p>
        </div>
        <Inp label="Reporting Year" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SECTIONS.map((s) => (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.l}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{s.ctx}</div>
              </div>
              <Btn size="sm" onClick={() => generateSection(s)} disabled={loading === s.id}>{loading === s.id ? "Drafting…" : "AI Draft"}</Btn>
            </div>
            {sections[s.id] && (
              <pre style={{ color: C.text, fontSize: 12, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap", lineHeight: 1.7, background: C.surface, padding: 12, borderRadius: 6, maxHeight: 280, overflowY: "auto" }}>{sections[s.id]}</pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventPipeline() {
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState({ name: "", type: "Legal Aid Camp", date: "", location: "", district: "Purnia", coordinator: "Shashwat", participants: "", objectives: "", theme: "" });
  const [outputs, setOutputs] = useState({});
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("list");
  const [loading, setLoading] = useState("");
  const gen = async (key, sys, prompt) => {
    setLoading(key);
    const text = await claudeCall(sys, [{ role: "user", content: prompt }], 1500);
    setOutputs((p) => ({ ...p, [key]: text }));
    setLoading("");
    return text;
  };
  const genConcept = () =>
    gen("concept", "Draft a one-page event concept note for Janman People's Foundation.", `Event: ${event.name}\nType: ${event.type}\nDate: ${event.date}\nLocation: ${event.location}, ${event.district}\nTheme: ${event.theme}\nObjectives: ${event.objectives}`);
  const genChecklist = async () => {
    const text = await gen("checklist", "Generate a pre-event checklist as a JSON array of objects with fields: title, owner (one of: Coordinator, COO, Comms, Logistics), priority (High/Medium/Low). Return ONLY the JSON, no commentary.", `Event: ${event.name} on ${event.date} at ${event.location}. Type: ${event.type}.`);
    try {
      const arr = JSON.parse(text.replace(/```json|```/g, "").trim());
      setTasks(arr.map((t) => ({ ...t, id: uid(), status: "todo" })));
    } catch {}
  };
  const moveTask = (id, status) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Event Pipeline</h2>
        <p style={{ fontSize: 12, color: C.dim, margin: "3px 0 0" }}>7-step planning with AI drafts.</p>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["Brief","Concept","Checklist","Pre-event Comms","Invitations","Day-of Logistics","Post-event"].map((l, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            style={{ padding: "7px 12px", borderRadius: 6, background: step === i + 1 ? C.accent : C.surface, color: step === i + 1 ? "#0d0d0d" : C.text, border: `1px solid ${step === i + 1 ? C.accent : C.border}`, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {i + 1}. {l}
          </button>
        ))}
      </div>
      {step === 1 && (
        <Card>
          <Inp label="Event Name" value={event.name} onChange={(e) => setEvent((v) => ({ ...v, name: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Inp label="Type" type="select" value={event.type} onChange={(e) => setEvent((v) => ({ ...v, type: e.target.value }))} options={EVENT_TYPES} />
            <Inp label="Date" type="date" value={event.date} onChange={(e) => setEvent((v) => ({ ...v, date: e.target.value }))} />
            <Inp label="District" type="select" value={event.district} onChange={(e) => setEvent((v) => ({ ...v, district: e.target.value }))} options={DISTRICTS} />
          </div>
          <Inp label="Location" value={event.location} onChange={(e) => setEvent((v) => ({ ...v, location: e.target.value }))} />
          <Inp label="Theme" value={event.theme} onChange={(e) => setEvent((v) => ({ ...v, theme: e.target.value }))} />
          <Inp label="Objectives" type="textarea" rows={3} value={event.objectives} onChange={(e) => setEvent((v) => ({ ...v, objectives: e.target.value }))} />
          <div style={{ marginTop: 10 }}><Btn onClick={() => setStep(2)}>Continue →</Btn></div>
        </Card>
      )}
      {step === 2 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ color: C.text }}>Concept Note</strong>
            <Btn size="sm" onClick={genConcept} disabled={loading === "concept"}>{loading === "concept" ? "Drafting…" : "AI Generate"}</Btn>
          </div>
          {outputs.concept && (<pre style={{ color: C.text, fontSize: 12, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap", lineHeight: 1.7, background: C.surface, padding: 12, borderRadius: 6, maxHeight: 380, overflowY: "auto" }}>{outputs.concept}</pre>)}
        </Card>
      )}
      {step === 3 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ color: C.text }}>Pre-Event Checklist</strong>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" color="ghost" onClick={() => setView(view === "list" ? "kanban" : "list")}>{view === "list" ? "⊞ Kanban" : "≡ List"}</Btn>
              <Btn size="sm" onClick={genChecklist} disabled={loading === "checklist"}>{loading === "checklist" ? "Generating…" : "AI Generate"}</Btn>
            </div>
          </div>
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.surface, borderRadius: 6 }}>
                  <input type="checkbox" checked={t.status === "done"} onChange={(e) => moveTask(t.id, e.target.checked ? "done" : "todo")} />
                  <span style={{ flex: 1, fontSize: 12, color: C.text, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</span>
                  <Tag tone={t.priority === "High" ? C.red : t.priority === "Medium" ? C.accent : C.green}>{t.priority}</Tag>
                  <span style={{ fontSize: 10.5, color: C.dim }}>{t.owner}</span>
                </div>
              ))}
              {tasks.length === 0 && <div style={{ color: C.dim, fontSize: 12, padding: 20, textAlign: "center" }}>Click "AI Generate" to create the checklist.</div>}
            </div>
          )}
          {view === "kanban" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {TASK_COLS.map((col) => (
                <div key={col.id} style={{ background: C.surface, padding: 8, borderRadius: 8, minHeight: 240 }}>
                  <div style={{ color: col.tone, fontWeight: 700, fontSize: 11, marginBottom: 6 }}>{col.l} ({tasks.filter((t) => t.status === col.id).length})</div>
                  {tasks.filter((t) => t.status === col.id).map((t) => (
                    <div key={t.id} style={{ background: C.card, padding: 8, borderRadius: 5, fontSize: 11, marginBottom: 5, borderLeft: `3px solid ${t.priority === "High" ? C.red : t.priority === "Medium" ? C.accent : C.green}` }}>
                      <div style={{ color: C.text, marginBottom: 3 }}>{t.title}</div>
                      <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>{t.owner}</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {TASK_COLS.filter((x) => x.id !== col.id).map((x) => (
                          <button key={x.id} onClick={() => moveTask(t.id, x.id)} style={{ fontSize: 9, padding: "2px 5px", background: "transparent", border: `1px solid ${C.border}`, color: C.dim, borderRadius: 3, cursor: "pointer" }}>→ {x.l}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {[4,5,6,7].includes(step) && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ color: C.text }}>
              {step === 4 && "Pre-Event Communications"}
              {step === 5 && "Invitations"}
              {step === 6 && "Day-of Logistics"}
              {step === 7 && "Post-Event Notes"}
            </strong>
            <Btn size="sm" onClick={() => {
              const key = `step${step}`;
              const prompts = {
                4: ["Draft pre-event communications (email + WhatsApp).", `Event: ${event.name} on ${event.date}.`],
                5: ["Draft formal invitation letter.", `${event.type} - ${event.name} on ${event.date} at ${event.location}.`],
                6: ["Draft day-of logistics runsheet.", `${event.name} at ${event.location}.`],
                7: ["Draft post-event report and funder communication.", `${event.name} on ${event.date}.`],
              };
              gen(key, prompts[step][0], prompts[step][1]);
            }} disabled={loading === `step${step}`}>
              {loading === `step${step}` ? "Drafting…" : "AI Generate"}
            </Btn>
          </div>
          {outputs[`step${step}`] && (<pre style={{ color: C.text, fontSize: 12, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap", lineHeight: 1.7, background: C.surface, padding: 12, borderRadius: 6, maxHeight: 380, overflowY: "auto" }}>{outputs[`step${step}`]}</pre>)}
        </Card>
      )}
    </div>
  );
}

export default function JanSahayakPro() {
  const [tab, setTab] = useState("casework");
  const TABS = [
    { id: "casework", l: "Casework",       i: "⚖" },
    { id: "kanban",   l: "Case Kanban",    i: "🗂️" },
    { id: "dlf",      l: "DLF Tracker",    i: "🧑‍🎓" },
    { id: "events",   l: "Event Pipeline", i: "📅" },
    { id: "annual",   l: "Annual Report",  i: "📝" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.accent }}>Jan Sahayak Pro</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Janman People's Foundation · Jan Nyaya Abhiyan · Grant R 2409-19929</div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", borderRadius: 7, background: tab === t.id ? C.accent : "transparent", color: tab === t.id ? "#0d0d0d" : C.text, border: `1px solid ${tab === t.id ? C.accent : C.border}`, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {t.i} {t.l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "22px" }}>
        {tab === "casework" && <CaseworkModule />}
        {tab === "kanban"   && <CaseKanban />}
        {tab === "dlf"      && <DLFTracker />}
        {tab === "events"   && <EventPipeline />}
        {tab === "annual"   && <AnnualReport />}
      </main>
      <footer style={{ padding: "14px 22px", textAlign: "center", fontSize: 10.5, color: C.muted, borderTop: `1px solid ${C.border}` }}>
        Jan Sahayak Pro · {td()}
      </footer>
    </div>
  );
}
