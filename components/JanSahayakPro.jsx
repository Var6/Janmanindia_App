"use client";
import { useState, useEffect } from "react";

const C={bg:"#09101F",surface:"#101724",card:"#182030",border:"#1C2B46",accent:"#E8A243",accentSoft:"rgba(232,162,67,0.09)",red:"#E05C5C",green:"#4CAF82",blue:"#4A90D9",purple:"#9B72CF",teal:"#26A69A",muted:"#3F5070",text:"#CBD8ED",dim:"#6278A0"};

const ROLES=["Chief Operating Officer","Program Manager","Event Coordinator","District Legal Fellow","Legal Consultant","Social Worker","Litigation Director"];
const PROJECTS=[
  {id:"p1",name:"Jan Nyaya Abhiyan – Access to Justice",code:"JNA-2024",funder:"Azim Premji Philanthropic Initiatives",grant:"R 2409-19929",budget:6000000,start:"2024-07-01",end:"2027-06-30"},
  {id:"p2",name:"District Legal Fellowship – 6 Districts",code:"DLF-2025",funder:"Azim Premji Philanthropic Initiatives",grant:"R 2409-19929 Addendum 1",budget:4528000,start:"2025-01-01",end:"2026-07-31"},
];
const EVENT_TYPES=["Legal Aid Camp","PLV Training","DLF Residential Training","Annual Consultation","Fact-Finding Mission","Community Outreach","Networking Meeting","Advocacy Campaign","State-level Conference","District-level Workshop","Awareness Campaign","Jan Sunwai (Public Hearing)","Press Conference","Donor Visit / Review Meeting","Team Review Meeting"];
const TEAM=["Shashwat","Shourya Roy","Roshin Jacob","Mugdha","Prakash Kumar","Sachina","Nawaz Hassan","Tausif Raza","Mithlesh Kumar","Pintu Kumar Mehta","Nagmani","Ashwini Pandey"];
const THEMES=["Gender-Based Violence","Caste Atrocities / SC/ST Rights","Child Rights / POCSO","Right to Food / NFSA","Land & Forest Rights","Housing Rights / Eviction","Undertrial Rights / Bail","Manual Scavengers Rights","Minority Rights","Environmental Justice","Custodial Deaths / Police Atrocities","Disability Rights / RPWD","Access to Justice (General)","Labour Rights / MGNREGS","Child Marriage / POCSO"];
const ORGS=["PUCL (People's Union for Civil Liberties)","HRLN (Human Rights Law Network)","NAPM (National Alliance of People's Movements)","AIDWA (All India Democratic Women's Association)","Breakthrough India","Jan Sahas","SLIC (Socio Legal Information Centre)","Right to Food Campaign","Amnesty International India","Commonwealth Human Rights Initiative","Centre for Equity Studies","Praxis Institute for Participatory Practices","Nazdeek","Sama Resource Group for Women and Health"];
const GANTT_ITEMS=[
  {task:"Fellow Recruitment & Selection",start:"2025-01-01",end:"2025-01-31",cat:"HR",assignee:"Roshin Jacob"},
  {task:"Induction & Residential Training",start:"2025-01-15",end:"2025-02-28",cat:"Training",assignee:"Shashwat"},
  {task:"Monthly Online Training Sessions",start:"2025-03-01",end:"2026-07-31",cat:"Training",assignee:"Roshin Jacob"},
  {task:"Quarterly Field Visits",start:"2025-04-01",end:"2026-07-31",cat:"Monitoring",assignee:"Roshin Jacob"},
  {task:"Legal Aid Camps (6 per district)",start:"2025-02-01",end:"2026-07-31",cat:"Programme",assignee:"All Fellows"},
  {task:"PLV Training Batches",start:"2025-03-01",end:"2026-07-31",cat:"Programme",assignee:"All Fellows"},
  {task:"Case Filing (target 60 cases)",start:"2025-02-01",end:"2026-07-31",cat:"Litigation",assignee:"All Fellows"},
  {task:"Community Legal Literacy Sessions",start:"2025-03-01",end:"2026-07-31",cat:"Programme",assignee:"All Fellows"},
  {task:"Annual Consultation / Conference",start:"2025-09-01",end:"2025-09-30",cat:"Events",assignee:"Shashwat"},
  {task:"Year 1 Annual Report + FUR",start:"2025-06-01",end:"2025-07-31",cat:"Reporting",assignee:"Shashwat"},
  {task:"Mid-term Review",start:"2025-10-01",end:"2025-11-30",cat:"Monitoring",assignee:"Shashwat"},
  {task:"State-level Collective Formation",start:"2025-06-01",end:"2026-03-31",cat:"Programme",assignee:"Shashwat"},
  {task:"Tranche 2 Disbursement Request",start:"2025-12-01",end:"2026-01-31",cat:"Finance",assignee:"Shourya Roy"},
  {task:"Final Evaluation",start:"2026-05-01",end:"2026-07-31",cat:"Monitoring",assignee:"Shourya Roy"},
  {task:"Project Closeout & Final Report",start:"2026-06-01",end:"2026-07-31",cat:"Reporting",assignee:"Shashwat"},
];
const CAT_COLORS={Programme:C.green,Training:C.blue,Litigation:C.accent,HR:C.purple,Monitoring:C.teal,Events:C.red,Reporting:C.dim,Finance:C.green};
const STEPS=["Setup","Brief & Design","Communications","Logistics","Scheduling","Reporting","Post-Event"];

const DISTRICTS_BIHAR=["Araria","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran"];

const fmt=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const td=()=>new Date().toISOString().slice(0,10);
async function sg(k){try{var r=await window.storage.get(k);return r?JSON.parse(r.value):null;}catch(e){return null;}}
async function ss(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch(e){}}

function Card({children,style={}}){return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"18px 22px",...style}}>{children}</div>;}
function Sec({children,style={}}){return <div style={{fontSize:10,fontFamily:"'Playfair Display',serif",letterSpacing:2.5,textTransform:"uppercase",color:C.accent,marginBottom:12,opacity:.9,...style}}>{children}</div>;}
function Badge({label,color="amber"}){const m={amber:C.accent,red:C.red,green:C.green,blue:C.blue,purple:C.purple,teal:C.teal,gray:C.dim};const col=m[color]||C.accent;return <span style={{background:col+"22",color:col,border:"1px solid "+col+"40",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;}
function Inp({label,value,onChange,placeholder="",type="text",rows,style={}}){return <div style={{marginBottom:10,...style}}>{label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</label>}{rows?<textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>:<input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,boxSizing:"border-box"}}/>}</div>;}
function Sel({label,value,onChange,options=[]}){return <div style={{marginBottom:10}}>{label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</label>}<select value={value} onChange={onChange} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5}}>{options.map(o=>{const v=o.value!==undefined?o.value:o;const l=o.label!==undefined?o.label:o;return <option key={v} value={v}>{l}</option>;})}</select></div>;}
function Btn({children,onClick,color="accent",size,disabled,style={}}){const bgs={accent:C.accent,red:C.red,green:C.green,blue:C.blue,purple:C.purple,teal:C.teal,ghost:"transparent"};const bg=bgs[color]||C.accent;const tc=(color==="accent"||color==="green"||color==="teal")?"#000":C.text;const pd=size==="sm"?"5px 11px":size==="lg"?"13px 28px":"8px 18px";return <button onClick={onClick} disabled={disabled} style={{background:disabled?C.muted:bg,color:disabled?C.dim:tc,border:color==="ghost"?"1px solid "+C.border:"none",borderRadius:7,padding:pd,fontSize:size==="sm"?11:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",...style}}>{children}</button>;}

function Output({title,content,loadKey,onGen,extra,loadingKeys}){
  const loading=loadingKeys[loadKey];
  return <Card style={{marginBottom:13}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
      <Sec style={{marginBottom:0}}>{title}</Sec>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        {extra}
        {content&&<Btn size="sm" color="ghost" onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(content)}>Copy</Btn>}
        <Btn size="sm" color="accent" onClick={onGen} disabled={loading}>{loading?"Generating…":"Generate with AI"}</Btn>
      </div>
    </div>
    {content?<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:420,overflowY:"auto"}}>{content}</pre>:<div style={{fontSize:12,color:C.dim,padding:"12px 0"}}>Click "Generate with AI" to create this document from your event brief.</div>}
  </Card>;
}

// ── NEW: Casework module ──────────────────────────────────────────────
const CASE_TYPES=["Bail / Anticipatory Bail","Writ Petition (HC)","PIL","POCSO","Domestic Violence / DV Act","Maintenance","Custodial Death","SC/ST Atrocities","Land / Forest Rights","Labour / MGNREGS","Child Marriage","RTI / Representation","Criminal Appeal","Habeas Corpus","Other"];
const COURTS=["Supreme Court of India","Patna High Court","District Court – Patna","District Court – Purnia","District Court – Araria","District Court – Kishanganj","District Court – Katihar","District Court – Supaul","District Court – Madhepura","DLSA / SLSA","Other"];

function CaseworkModule(){
  const [cases,setCases]=useState([]);
  const [form,setForm]=useState({name:"",caseNo:"",caseType:"Bail / Anticipatory Bail",court:"Patna High Court",ps:"",district:"Purnia",advocate:"Shashwat",nextDate:"",status:"Active",brief:"",relief:"",acts:"",hearingNotes:""});
  const [modal,setModal]=useState(false);
  const [active,setActive]=useState(null);
  const [draftText,setDraftText]=useState("");
  const [draftLoading,setDraftLoading]=useState(false);
  const [draftType,setDraftType]=useState("bail_application");
  const [filter,setFilter]=useState("All");

  useEffect(()=>{sg("jnp_cases").then(d=>{if(d)setCases(d);});},[]);
  useEffect(()=>{ss("jnp_cases",cases);},[cases]);

  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));

  async function saveCase(){
    const c={...form,id:uid(),createdAt:td(),hearings:[]};
    setCases(p=>[c,...p]);
    setModal(false);
    setForm({name:"",caseNo:"",caseType:"Bail / Anticipatory Bail",court:"Patna High Court",ps:"",district:"Purnia",advocate:"Shashwat",nextDate:"",status:"Active",brief:"",relief:"",acts:"",hearingNotes:""});
  }

  async function genDraft(c){
    setDraftLoading(true);
    setDraftText("");
    const prompts={
      bail_application:`Draft a bail application for the following matter in the style of Indian legal drafting (formal, structured, citing relevant precedents from SC and HC).\n\nMATTER: ${c.name}\nCASE NO: ${c.caseNo}\nCOURT: ${c.court}\nPS/FIR: ${c.ps}\nDISTRICT: ${c.district}\nCASE TYPE: ${c.caseType}\nFACTS: ${c.brief}\nRELIEF SOUGHT: ${c.relief}\nACTS: ${c.acts}\n\nInclude: Title, Before the [Court], In the matter of, Background, Grounds (numbered, citing Arnesh Kumar, Satender Kumar Antil, Sanjay Chandra, Gudikanti Narasimhulu, Dataram Singh, Prasanta Kumar Sarkar as relevant), Prayer. Make the language forceful, constitutionally grounded, rights-based.`,
      letter_sp:`Draft a formal representation letter to the Superintendent of Police, ${c.district}, Bihar, from Jan Nyaya Abhiyan / Janman Peoples Foundation regarding: ${c.brief}. Relief: ${c.relief}. Acts: ${c.acts}. Include facts, legal basis (SC/ST Act, IPC/BNS, Constitutional provisions Art 21, NHRC guidelines), specific reliefs, timeline for response, and consequences of inaction. Sign: ${c.advocate}, Lead – Litigation, Jan Nyaya Abhiyan.`,
      hc_writ:`Draft a Writ Petition under Article 226/227 of the Constitution before the Hon'ble Patna High Court.\n\nPetitioner/s: ${c.name}\nCase: ${c.caseNo||"[Writ to be filed]"}\nFacts: ${c.brief}\nRelief: ${c.relief}\nActs: ${c.acts}\n\nInclude: Jurisdiction clause, statement of facts (numbered), questions of law, grounds (detailed, with constitutional articles and SC precedents), prayer clause. Use standard Patna HC writ format.`,
      fact_finding:`Draft a Fact-Finding Report template for: ${c.brief} in ${c.district}.\n\nInclude: Date and team of fact-finders, Executive Summary, Background, Methodology, Detailed Findings (victim/survivor testimonies – anonymised, documentary evidence, official response), Legal Analysis (IPC/BNS, Constitutional violations, international human rights standards), Conclusions, Recommendations (immediate relief, criminal action, systemic reforms), Annexures checklist. Organisation: Janman Peoples Foundation / PUCL Patna.`,
      plaint:`Draft a complaint/plaint for the matter. Case: ${c.caseNo}. Facts: ${c.brief}. Relief: ${c.relief}. Acts: ${c.acts}. Court: ${c.court}. Use standard civil/criminal complaint format as applicable.`
    };
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompts[draftType]}]})});
      const d=await r.json();
      setDraftText((d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"Error generating draft.");
    }catch(e){setDraftText("Error generating draft.");}
    setDraftLoading(false);
  }

  const filtered=filter==="All"?cases:cases.filter(c=>c.status===filter);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:2}}>Casework Tracker</div>
        <div style={{fontSize:12,color:C.dim}}>Track matters, generate bail applications, writs, representations and fact-finding reports with AI.</div>
      </div>
      <Btn color="accent" onClick={()=>setModal(true)}>+ Add Matter</Btn>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:13}}>
      {["All","Active","Disposed","Stayed","Pending"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:filter===f?C.accentSoft:"transparent",color:filter===f?C.accent:C.dim,fontSize:11,fontWeight:filter===f?700:400,cursor:"pointer"}}>{f}</button>)}
      <Badge label={cases.length+" matters"} color="gray"/>
    </div>
    {filtered.length===0&&<Card><div style={{textAlign:"center",padding:24,color:C.dim,fontSize:13}}>No matters found. Click "+ Add Matter" to begin tracking cases.</div></Card>}
    {filtered.map(c=><Card key={c.id} style={{marginBottom:10,cursor:"pointer",borderColor:active===c.id?C.accent+"55":C.border}} >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}} onClick={()=>setActive(active===c.id?null:c.id)}>
          <div style={{fontWeight:700,fontSize:13.5,color:C.text,marginBottom:3}}>{c.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
            <Badge label={c.caseType} color="amber"/>
            <Badge label={c.court.split("–")[0].trim()} color="blue"/>
            <Badge label={c.district} color="purple"/>
            <Badge label={c.status} color={c.status==="Active"?"green":c.status==="Disposed"?"gray":"teal"}/>
          </div>
          <div style={{fontSize:11,color:C.dim}}>{c.caseNo&&<span style={{marginRight:12}}>📋 {c.caseNo}</span>}{c.nextDate&&<span>📅 Next: {fmt(c.nextDate)}</span>}</div>
        </div>
        <div style={{fontSize:10,color:C.dim,flexShrink:0,marginLeft:12}}>{fmt(c.createdAt)}</div>
      </div>
      {active===c.id&&<div style={{marginTop:14,borderTop:"1px solid "+C.border,paddingTop:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Facts / Brief</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{c.brief||"—"}</div></div>
          <div>
            <div><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Relief Sought</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{c.relief||"—"}</div></div>
            <div style={{marginTop:8}}><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Acts / Sections</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{c.acts||"—"}</div></div>
          </div>
        </div>
        <div style={{background:C.surface,borderRadius:9,padding:"11px 14px",marginBottom:12}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>AI Draft Generator</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
            {[["bail_application","Bail Application"],["hc_writ","HC Writ Petition"],["letter_sp","Letter to SP"],["fact_finding","Fact-Finding Report"],["plaint","Complaint / Plaint"]].map(([v,l])=><button key={v} onClick={()=>setDraftType(v)} style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+(draftType===v?C.accent+"55":C.border),background:draftType===v?C.accentSoft:"transparent",color:draftType===v?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:draftType===v?700:400}}>{l}</button>)}
          </div>
          <div style={{display:"flex",gap:7}}>
            <Btn size="sm" color="accent" onClick={()=>genDraft(c)} disabled={draftLoading}>{draftLoading?"Generating…":"Generate Draft"}</Btn>
            {draftText&&<Btn size="sm" color="ghost" onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(draftText)}>Copy</Btn>}
          </div>
          {draftText&&<pre style={{fontFamily:"Georgia,serif",fontSize:12,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,marginTop:11,maxHeight:380,overflowY:"auto",borderTop:"1px solid "+C.border,paddingTop:9}}>{draftText}</pre>}
        </div>
        <div style={{display:"flex",gap:7}}>
          <Btn size="sm" color="red" onClick={()=>setCases(p=>p.filter(x=>x.id!==c.id))}>Remove</Btn>
        </div>
      </div>}
    </Card>)}
    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:14,border:"1px solid "+C.border,padding:24,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text,marginBottom:14}}>Add New Matter</div>
        <Inp label="Client / Matter Name" value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. Aarav Kumar v. State of Bihar"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <Inp label="Case No. / FIR No." value={form.caseNo} onChange={e=>upd("caseNo",e.target.value)} placeholder="e.g. Cr.W.J.C. No. 123/2025"/>
          <Sel label="Case Type" value={form.caseType} onChange={e=>upd("caseType",e.target.value)} options={CASE_TYPES}/>
          <Sel label="Court" value={form.court} onChange={e=>upd("court",e.target.value)} options={COURTS}/>
          <Sel label="District" value={form.district} onChange={e=>upd("district",e.target.value)} options={DISTRICTS_BIHAR}/>
          <Inp label="PS / FIR Details" value={form.ps} onChange={e=>upd("ps",e.target.value)} placeholder="e.g. Sahebganj PS Case No. 560/2024"/>
          <Sel label="Advocate / Fellow" value={form.advocate} onChange={e=>upd("advocate",e.target.value)} options={TEAM}/>
          <Inp label="Next Date" type="date" value={form.nextDate} onChange={e=>upd("nextDate",e.target.value)}/>
          <Sel label="Status" value={form.status} onChange={e=>upd("status",e.target.value)} options={["Active","Pending","Stayed","Disposed","Closed"]}/>
        </div>
        <Inp label="Facts / Brief" value={form.brief} onChange={e=>upd("brief",e.target.value)} rows={3} placeholder="Brief facts of the matter…"/>
        <Inp label="Relief Sought" value={form.relief} onChange={e=>upd("relief",e.target.value)} rows={2} placeholder="e.g. Anticipatory bail, direction to SHO to register FIR, quashing of order…"/>
        <Inp label="Relevant Acts / Sections" value={form.acts} onChange={e=>upd("acts",e.target.value)} placeholder="e.g. Sec 376 IPC, Sec 6 POCSO, Art 21, Arnesh Kumar guidelines…"/>
        <div style={{display:"flex",gap:9,marginTop:6}}>
          <Btn color="accent" onClick={saveCase} disabled={!form.name.trim()}>Save Matter</Btn>
          <Btn color="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

// ── NEW: PLV / Fellow Tracker ─────────────────────────────────────────
const DLF_DISTRICTS=["Purnia","Araria","Kishanganj","Katihar","Supaul","Madhepura"];

function PLVModule(){
  const [fellows,setFellows]=useState([]);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",district:"Purnia",phone:"",email:"",startDate:td(),status:"Active",casesTarget:10,casesFiled:0,campsTarget:6,campsDone:0,plvTrained:0,notes:""});
  const [reportLoading,setReportLoading]=useState(false);
  const [report,setReport]=useState("");

  useEffect(()=>{sg("jnp_fellows").then(d=>{if(d)setFellows(d);});},[]);
  useEffect(()=>{ss("jnp_fellows",fellows);},[fellows]);

  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));

  function saveFellow(){
    setFellows(p=>[...p,{...form,id:uid(),createdAt:td()}]);
    setModal(false);
    setForm({name:"",district:"Purnia",phone:"",email:"",startDate:td(),status:"Active",casesTarget:10,casesFiled:0,campsTarget:6,campsDone:0,plvTrained:0,notes:""});
  }

  function updateFellow(id,key,val){
    setFellows(p=>p.map(f=>f.id===id?{...f,[key]:val}:f));
  }

  async function genReport(){
    setReportLoading(true);
    const rows=fellows.map(f=>`${f.name} | ${f.district} | Cases: ${f.casesFiled}/${f.casesTarget} | Camps: ${f.campsDone}/${f.campsTarget} | PLVs Trained: ${f.plvTrained} | Status: ${f.status}`).join("\n");
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Generate a funder-ready District Legal Fellowship progress report for Azim Premji Philanthropic Initiatives (Grant R 2409-19929 Addendum 1). Organisation: Janman Peoples Foundation / Jan Nyaya Abhiyan, Bihar.\n\nFELLOW-WISE DATA:\n${rows}\n\nInclude:\n1. Executive Summary (achievements against targets)\n2. Fellow-wise progress table\n3. District-level highlights (Seemanchal region focus)\n4. Challenges and mitigation\n5. Cumulative data (total cases, camps, PLVs trained)\n6. SDG 16 and Access to Justice indicators\n7. Upcoming milestones\n8. Financial utilisation note (if targets suggest burn rate)\n\nMake it professional, data-driven, and suitable for funder reporting.`}]})});
      const d=await r.json();
      setReport((d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join(""));
    }catch(e){setReport("Error generating report.");}
    setReportLoading(false);
  }

  const totalCases=fellows.reduce((a,f)=>a+(Number(f.casesFiled)||0),0);
  const totalCamps=fellows.reduce((a,f)=>a+(Number(f.campsDone)||0),0);
  const totalPLV=fellows.reduce((a,f)=>a+(Number(f.plvTrained)||0),0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:2}}>DLF Fellow & PLV Tracker</div>
        <div style={{fontSize:12,color:C.dim}}>Track District Legal Fellows, PLV training, camp completions and case filings across Seemanchal.</div>
      </div>
      <div style={{display:"flex",gap:7}}>
        <Btn color="blue" onClick={genReport} disabled={reportLoading||fellows.length===0}>{reportLoading?"Generating…":"Generate Funder Report"}</Btn>
        <Btn color="accent" onClick={()=>setModal(true)}>+ Add Fellow</Btn>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      {[["Fellows",fellows.length,C.purple],["Cases Filed",totalCases,C.accent],["Camps Done",totalCamps,C.green],["PLVs Trained",totalPLV,C.blue]].map(([l,v,col])=><Card key={l} style={{textAlign:"center",padding:"14px 10px"}}>
        <div style={{fontSize:26,fontWeight:700,color:col,marginBottom:2}}>{v}</div>
        <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
      </Card>)}
    </div>
    {fellows.length===0&&<Card><div style={{textAlign:"center",padding:24,color:C.dim,fontSize:13}}>No fellows added yet. Click "+ Add Fellow" to begin tracking.</div></Card>}
    {fellows.map(f=>{
      const cPct=f.casesTarget>0?Math.min(100,Math.round(f.casesFiled/f.casesTarget*100)):0;
      const kPct=f.campsTarget>0?Math.min(100,Math.round(f.campsDone/f.campsTarget*100)):0;
      return <Card key={f.id} style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{f.name}</div>
            <div style={{display:"flex",gap:6}}><Badge label={f.district} color="purple"/><Badge label={f.status} color={f.status==="Active"?"green":"gray"}/></div>
          </div>
          <div style={{fontSize:10,color:C.dim}}>{f.phone}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginBottom:4}}>
              <span>Cases Filed</span><span style={{color:C.accent}}>{f.casesFiled}/{f.casesTarget}</span>
            </div>
            <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:cPct+"%",background:C.accent,borderRadius:3}}/></div>
            <div style={{display:"flex",gap:5,marginTop:6}}>
              <Btn size="sm" color="ghost" onClick={()=>updateFellow(f.id,"casesFiled",Math.max(0,(f.casesFiled||0)-1))}>−</Btn>
              <Btn size="sm" color="accent" onClick={()=>updateFellow(f.id,"casesFiled",(f.casesFiled||0)+1)}>+</Btn>
            </div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginBottom:4}}>
              <span>Camps Done</span><span style={{color:C.green}}>{f.campsDone}/{f.campsTarget}</span>
            </div>
            <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:kPct+"%",background:C.green,borderRadius:3}}/></div>
            <div style={{display:"flex",gap:5,marginTop:6}}>
              <Btn size="sm" color="ghost" onClick={()=>updateFellow(f.id,"campsDone",Math.max(0,(f.campsDone||0)-1))}>−</Btn>
              <Btn size="sm" color="green" onClick={()=>updateFellow(f.id,"campsDone",(f.campsDone||0)+1)}>+</Btn>
            </div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginBottom:4}}>
              <span>PLVs Trained</span><span style={{color:C.blue}}>{f.plvTrained}</span>
            </div>
            <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,(f.plvTrained||0)/30*100)+"%",background:C.blue,borderRadius:3}}/></div>
            <div style={{display:"flex",gap:5,marginTop:6}}>
              <Btn size="sm" color="ghost" onClick={()=>updateFellow(f.id,"plvTrained",Math.max(0,(f.plvTrained||0)-1))}>−</Btn>
              <Btn size="sm" color="blue" onClick={()=>updateFellow(f.id,"plvTrained",(f.plvTrained||0)+1)}>+</Btn>
            </div>
          </div>
        </div>
        {f.notes&&<div style={{fontSize:11,color:C.dim,borderTop:"1px solid "+C.border,paddingTop:7}}>{f.notes}</div>}
        <Btn size="sm" color="red" style={{marginTop:8}} onClick={()=>setFellows(p=>p.filter(x=>x.id!==f.id))}>Remove</Btn>
      </Card>;
    })}
    {report&&<Card style={{marginTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <Sec style={{marginBottom:0}}>Funder Progress Report (APPI)</Sec>
        <Btn size="sm" color="ghost" onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(report)}>Copy</Btn>
      </div>
      <pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:420,overflowY:"auto"}}>{report}</pre>
    </Card>}
    {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:14,border:"1px solid "+C.border,padding:24,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text,marginBottom:14}}>Add District Legal Fellow</div>
        <Inp label="Fellow Name" value={form.name} onChange={e=>upd("name",e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <Sel label="District" value={form.district} onChange={e=>upd("district",e.target.value)} options={DLF_DISTRICTS}/>
          <Sel label="Status" value={form.status} onChange={e=>upd("status",e.target.value)} options={["Active","On Leave","Completed","Terminated"]}/>
          <Inp label="Phone" value={form.phone} onChange={e=>upd("phone",e.target.value)}/>
          <Inp label="Email" value={form.email} onChange={e=>upd("email",e.target.value)}/>
          <Inp label="Start Date" type="date" value={form.startDate} onChange={e=>upd("startDate",e.target.value)}/>
          <Inp label="Cases Target" type="number" value={form.casesTarget} onChange={e=>upd("casesTarget",e.target.value)}/>
          <Inp label="Camps Target" type="number" value={form.campsTarget} onChange={e=>upd("campsTarget",e.target.value)}/>
          <Inp label="PLV Training Target" type="number" value={form.plvTrained} onChange={e=>upd("plvTrained",e.target.value)}/>
        </div>
        <Inp label="Notes" value={form.notes} onChange={e=>upd("notes",e.target.value)} rows={2}/>
        <div style={{display:"flex",gap:9,marginTop:6}}>
          <Btn color="accent" onClick={saveFellow} disabled={!form.name.trim()}>Save Fellow</Btn>
          <Btn color="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

// ── NEW: Annual Report AI Drafting ────────────────────────────────────
function AnnualReportModule(){
  const [section,setSection]=useState("access");
  const [inputs,setInputs]=useState({period:"July 2024 – June 2025",totalCases:"",totalCamps:"",totalPLV:"",totalDistricts:"6",budget:"",highlights:"",challenges:"",caseSummaries:"",campSummaries:"",fellowship:"",quotes:"",media:""});
  const [outputs,setOutputs]=useState({});
  const [loading,setLoading]=useState({});

  const upd=(k,v)=>setInputs(p=>({...p,[k]:v}));
  const setLoad=(k,v)=>setLoading(p=>({...p,[k]:v}));

  const sections=[
    {id:"access",label:"Access to Justice Program"},
    {id:"fellowship",label:"District Legal Fellowship"},
    {id:"litigation",label:"Litigation & Case Work"},
    {id:"plv",label:"PLV Training"},
    {id:"camps",label:"Legal Aid Camps"},
    {id:"exec",label:"Executive Summary"},
    {id:"financials",label:"Financial Narrative"},
  ];

  async function genSection(id){
    setLoad(id,true);
    const ctx=`Organisation: Janman Peoples Foundation | Jan Nyaya Abhiyan (Access to Justice Programme), Bihar\nReport Period: ${inputs.period}\nFunder: Azim Premji Philanthropic Initiatives (Grant R 2409-19929)\nTotal Cases: ${inputs.totalCases} | Total Camps: ${inputs.totalCamps} | PLVs Trained: ${inputs.totalPLV} | Districts: ${inputs.totalDistricts}\nBudget: Rs ${inputs.budget}\nHighlights: ${inputs.highlights}\nChallenges: ${inputs.challenges}\nCase Summaries: ${inputs.caseSummaries}\nCamp Summaries: ${inputs.campSummaries}\nFellowship Updates: ${inputs.fellowship}\nKey Quotes: ${inputs.quotes}\nMedia Coverage: ${inputs.media}`;
    const prompts={
      access:`Draft the "Access to Justice Programme" chapter for the annual report of Janman Peoples Foundation. Make it narrative, moving, and data-rich — suitable for a donor-facing annual report.\n\n${ctx}\n\nInclude: Programme overview, theory of change, key achievements with data, geographic reach, community stories (anonymised), survivor voices, partnerships, challenges and learnings, way forward. Write in third person, warm but professional tone.`,
      fellowship:`Draft the "District Legal Fellowship" chapter for the annual report. This fellowship was started in memory of late Senior Advocate Rajeeva Roy.\n\n${ctx}\n\nInclude: Origins and significance (in memory of Rajeeva Roy), selection process, fellow profiles (without names, just district-level narrative), training methodology, field deployment, early outcomes (cases, camps, PLV training), community impact vignettes, challenges, learning and adaptation.`,
      litigation:`Draft the "Litigation and Case Work" chapter for the annual report.\n\n${ctx}\n\nInclude: Overview of legal strategy, types of matters (POCSO, bail, writ, DV Act, SC/ST Act), key cases (anonymised), courts engaged, precedents cited, PILs filed, outcomes (bail granted, FIRs registered, compensation ordered), significant rulings, collaboration with PUCL/HRLN, systemic issues identified, next steps in litigation strategy.`,
      plv:`Draft the "Paralegal Volunteer (PLV) Training Programme" chapter.\n\n${ctx}\n\nInclude: PLV selection criteria, curriculum (FIR drafting, rights of arrested persons, DV Act, POCSO, police atrocities), training methodology (participatory, community-based), number of PLVs trained, geographic spread, competency assessment, community mobilisation by PLVs, case referrals generated, challenges in sustainability.`,
      camps:`Draft the "Legal Aid Camps" chapter.\n\n${ctx}\n\nInclude: Camp design philosophy (reaching the last mile), number and location of camps, issues addressed (MGNREGS, maintenance, land, bail, documentation), legal advice provided, cases referred, community response, coordination with DLSA, challenges (access, documentation, language), innovative practices.`,
      exec:`Draft a compelling Executive Summary (2 pages) for the annual report.\n\n${ctx}\n\nInclude: Opening statement (rights-based, constitutional), key achievements at a glance (bullets), programme overview, impact highlights (quantitative and qualitative), financial snapshot, gratitude to APPI, way forward. This should be the first thing a funder reads and should inspire confidence and emotion.`,
      financials:`Draft the financial narrative section for the annual report.\n\n${ctx}\n\nInclude: Budget overview by programme head, utilisation narrative (explain how money was spent in community terms, not just accounting), value for money analysis, cost per case / per camp / per PLV trained, funds received vs utilised, pending tranches, audit note, FCRA compliance note if applicable.`
    };
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompts[id]}]})});
      const d=await r.json();
      setOutputs(p=>({...p,[id]:(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"Error."}));
    }catch(e){setOutputs(p=>({...p,[id]:"Error generating section."}));}
    setLoad(id,false);
  }

  return <div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:2}}>Annual Report AI Drafting</div>
    <div style={{fontSize:12,color:C.dim,marginBottom:16}}>Feed in your programme data and generate full chapters for the Janman Peoples Foundation Annual Report (APPI grant).</div>
    <Card style={{marginBottom:14}}>
      <Sec>Report Data & Context</Sec>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
        <Inp label="Report Period" value={inputs.period} onChange={e=>upd("period",e.target.value)}/>
        <Inp label="Total Cases Filed" value={inputs.totalCases} onChange={e=>upd("totalCases",e.target.value)} placeholder="e.g. 47"/>
        <Inp label="Total Legal Aid Camps" value={inputs.totalCamps} onChange={e=>upd("totalCamps",e.target.value)} placeholder="e.g. 24"/>
        <Inp label="PLVs Trained" value={inputs.totalPLV} onChange={e=>upd("totalPLV",e.target.value)} placeholder="e.g. 112"/>
        <Inp label="Districts Covered" value={inputs.totalDistricts} onChange={e=>upd("totalDistricts",e.target.value)}/>
        <Inp label="Total Budget (Rs)" value={inputs.budget} onChange={e=>upd("budget",e.target.value)} placeholder="e.g. 1050000"/>
      </div>
      <Inp label="Key Highlights / Achievements" value={inputs.highlights} onChange={e=>upd("highlights",e.target.value)} rows={2} placeholder="Bail granted in 18 cases, DM order in 3 land cases, 2 PILs filed…"/>
      <Inp label="Challenges Faced" value={inputs.challenges} onChange={e=>upd("challenges",e.target.value)} rows={2} placeholder="Delayed FIR registration, flood disruptions, community trust building…"/>
      <Inp label="Key Case Summaries (anonymised)" value={inputs.caseSummaries} onChange={e=>upd("caseSummaries",e.target.value)} rows={3} placeholder="Paste brief summaries of 3-5 key cases…"/>
      <Inp label="Camp Summaries" value={inputs.campSummaries} onChange={e=>upd("campSummaries",e.target.value)} rows={2} placeholder="Purnia camp – 43 participants, 12 cases referred…"/>
      <Inp label="Fellowship Updates" value={inputs.fellowship} onChange={e=>upd("fellowship",e.target.value)} rows={2} placeholder="Update on DLF – started in memory of Rajeeva Roy…"/>
      <Inp label="Survivor / Community Quotes" value={inputs.quotes} onChange={e=>upd("quotes",e.target.value)} rows={2} placeholder="Paste any testimonies or quotes (will be used in narrative)…"/>
      <Inp label="Media Coverage" value={inputs.media} onChange={e=>upd("media",e.target.value)} placeholder="Newspaper names, articles, coverage highlights…"/>
    </Card>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:13}}>
      {sections.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:section===s.id?C.accentSoft:"transparent",color:section===s.id?C.accent:C.dim,fontSize:11,fontWeight:section===s.id?700:400,cursor:"pointer"}}>{s.label}</button>)}
    </div>
    {sections.filter(s=>s.id===section).map(s=><Card key={s.id}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <Sec style={{marginBottom:0}}>{s.label}</Sec>
        <div style={{display:"flex",gap:7}}>
          {outputs[s.id]&&<Btn size="sm" color="ghost" onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(outputs[s.id])}>Copy</Btn>}
          <Btn size="sm" color="accent" onClick={()=>genSection(s.id)} disabled={loading[s.id]}>{loading[s.id]?"Generating…":"Generate with AI"}</Btn>
        </div>
      </div>
      {outputs[s.id]?<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:480,overflowY:"auto"}}>{outputs[s.id]}</pre>:<div style={{fontSize:12,color:C.dim,padding:"12px 0"}}>Fill in data above, then click "Generate with AI" to draft this section.</div>}
    </Card>)}
  </div>;
}

// ── MAIN APP ──────────────────────────────────────────────────────────
const TOP_MODULES=["Event Pipeline","Casework","Fellows & PLVs","Annual Report"];

export default function JanSahayakPro(){
  const [module,setModule]=useState(0);
  const [step,setStep]=useState(0);
  const [events,setEvents]=useState([]);
  const [recipTab,setRecipTab]=useState("social");
  const [conceptNote,setConceptNote]=useState("");
  const [agendaText,setAgendaText]=useState("");
  const [speakers,setSpeakers]=useState("");
  const [socialMedia,setSocialMedia]=useState("");
  const [formalInvite,setFormalInvite]=useState("");
  const [checklist,setChecklist]=useState([]);
  const [logistics,setLogistics]=useState({});
  const [reportFmt,setReportFmt]=useState("");
  const [postEventSocial,setPostEventSocial]=useState("");
  const [actionPoints,setActionPoints]=useState("");
  const [calMsg,setCalMsg]=useState("");
  const [emailMsg,setEmailMsg]=useState("");
  const [ganttVisible,setGanttVisible]=useState(false);
  const [postNotes,setPostNotes]=useState("");
  const [attendance,setAttendance]=useState("");
  const [keyHighlights,setKeyHighlights]=useState("");
  const [meetingDate,setMeetingDate]=useState(td());
  const [meetingTime,setMeetingTime]=useState("11:00");
  const [meetingAttendees,setMeetingAttendees]=useState([]);
  const [meetingAgenda,setMeetingAgenda]=useState("");
  const [inviteName,setInviteName]=useState("");
  const [inviteDesig,setInviteDesig]=useState("");
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteOrg,setInviteOrg]=useState("");
  const [loadingKeys,setLoadingKeys]=useState({});
  const [setup,setSetup]=useState({role:"Program Manager",project:"p1",eventType:"Legal Aid Camp",eventTitle:"",location:"",district:"Purnia",date:td(),endDate:"",coordinator:"Shashwat",budget:"",objectives:"",themes:[],orgsToLearnFrom:[],issues:"",acts:"",constitutional:"",targetAudience:"",expectedParticipants:"",specialGuests:""});

  useEffect(()=>{sg("jnp_ev").then(d=>{if(d)setEvents(d);});},[]);
  useEffect(()=>{ss("jnp_ev",events);},[events]);

  const selProject=PROJECTS.find(p=>p.id===setup.project)||PROJECTS[0];
  const setLoad=(k,v)=>setLoadingKeys(p=>({...p,[k]:v}));
  const isLoading=k=>!!loadingKeys[k];
  const updSetup=(k,v)=>setSetup(p=>({...p,[k]:v}));
  const toggleTheme=t=>setSetup(p=>({...p,themes:p.themes.includes(t)?p.themes.filter(x=>x!==t):[...p.themes,t]}));
  const toggleOrg=o=>setSetup(p=>({...p,orgsToLearnFrom:p.orgsToLearnFrom.includes(o)?p.orgsToLearnFrom.filter(x=>x!==o):[...p.orgsToLearnFrom,o]}));
  const toggleAttendee=n=>setMeetingAttendees(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const toggleCheckDone=i=>setChecklist(p=>p.map((x,j)=>j===i?{...x,done:!x.done}:x));

  function eventCtx(){
    return "ORGANISATION: Janman Peoples Foundation — Jan Nyaya Abhiyan (Access to Justice Programme), Bihar\n"
      +"FUNDER: Azim Premji Philanthropic Initiatives (Grant No. "+selProject.grant+")\n"
      +"PROJECT: "+selProject.name+"\n"
      +"EVENT: "+setup.eventTitle+"\n"
      +"TYPE: "+setup.eventType+"\n"
      +"DATE: "+setup.date+(setup.endDate?" to "+setup.endDate:"")+"\n"
      +"LOCATION: "+setup.location+", "+setup.district+"\n"
      +"COORDINATOR: "+setup.coordinator+" ("+setup.role+")\n"
      +"BUDGET: Rs "+setup.budget+"\n"
      +"THEMES: "+setup.themes.join(", ")+"\n"
      +"TARGET AUDIENCE: "+setup.targetAudience+"\n"
      +"EXPECTED PARTICIPANTS: "+setup.expectedParticipants+"\n"
      +"KEY ISSUES: "+setup.issues+"\n"
      +"RELEVANT ACTS: "+setup.acts+"\n"
      +"CONSTITUTIONAL PROVISIONS: "+setup.constitutional+"\n"
      +"OBJECTIVES: "+setup.objectives+"\n"
      +"LEARNING FROM: "+setup.orgsToLearnFrom.join(", ")+"\n"
      +"SPECIAL GUESTS: "+setup.specialGuests;
  }

  async function callAI(prompt){
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
    const d=await r.json();
    return (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"Error generating content.";
  }

  async function genConceptNote(){setLoad("cn",true);try{setConceptNote(await callAI("Generate a comprehensive concept note for this event. Learn from: "+setup.orgsToLearnFrom.join(", ")+".\n\n"+eventCtx()+"\n\nStructure:\n1. TITLE AND DATE\n2. BACKGROUND AND CONTEXT (Bihar-specific, constitutional grounding)\n3. OBJECTIVES (3-5 specific)\n4. METHODOLOGY AND FORMAT (creative, participatory)\n5. PROGRAMME OUTLINE\n6. EXPECTED OUTCOMES\n7. TARGET PARTICIPANTS\n8. LEGAL AND CONSTITUTIONAL GROUNDING\n9. CREATIVE ELEMENTS\n10. RESOURCE REQUIREMENTS\n11. ORGANISING COMMITTEE\n\nDraw inspiration from Jan Sunwais, Nukkad Nataks, public hearings, NAPM, HRLN, PUCL, Right to Food Campaign."));}catch(e){setConceptNote("Error.");}setLoad("cn",false);}
  async function genAgenda(){setLoad("agenda",true);try{setAgendaText(await callAI("Design a detailed, creative, time-by-time agenda for this event.\n\n"+eventCtx()+"\n\nFormat each item:\n[TIME] | [DURATION] | [SESSION TITLE] | [FACILITATOR] | [FORMAT]\n\nInclude interactive sessions, survivor testimonies, legal knowledge sessions, cultural moments, vote of thanks."));}catch(e){setAgendaText("Error.");}setLoad("agenda",false);}
  async function genSpeakers(){setLoad("speakers",true);try{setSpeakers(await callAI("Suggest resource persons, speakers, and chief guest for this event.\n\n"+eventCtx()+"\n\nFor each: Name, Designation / Organisation, Why relevant, Area of expertise, Suggested role, How to approach. Include senior advocates, academics, activists, survivors, officials. Themes: "+setup.themes.join(", ")+"."));}catch(e){setSpeakers("Error.");}setLoad("speakers",false);}
  async function genSocial(){setLoad("social",true);try{setSocialMedia(await callAI("Create a complete social media campaign kit for this event.\n\n"+eventCtx()+"\n\n1. PRE-EVENT (1 week before): 3 WhatsApp broadcasts (Hindi), 2 Facebook posts, 2 Instagram captions, 1 Twitter thread (5 tweets)\n2. EVENT DAY: 2 live update posts, 1 photo caption template\n3. POSTER BRIEF: What should appear, colour scheme, key text\n4. HASHTAGS (5-7)\n\nLanguage: powerful, movement-inspired, constitutionally grounded."));}catch(e){setSocialMedia("Error.");}setLoad("social",false);}
  async function genInvite(){setLoad("invite",true);try{setFormalInvite(await callAI("Draft a formal invitation letter from Janman Peoples Foundation / Jan Nyaya Abhiyan.\n\n"+eventCtx()+"\n\nRECIPIENT:\nName: "+(inviteName||"[Name]")+"\nDesignation: "+(inviteDesig||"[Designation]")+"\nOrganisation: "+(inviteOrg||"[Organisation]")+"\n\nWarmly and formally invite to speak. Include specific role, significance of event, logistic details, why expertise is relevant, RSVP deadline. Sign: "+setup.coordinator+", "+setup.role+"."));}catch(e){setFormalInvite("Error.");}setLoad("invite",false);}

  async function sendInviteEmail(){setEmailMsg("Sending...");try{await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:"Send an email via Gmail. To: "+inviteEmail+". Subject: Invitation to Speak at "+setup.eventTitle+" | Janman Peoples Foundation. Body:\n\n"+formalInvite}]})});setEmailMsg("Invitation sent via Gmail!");}catch(e){setEmailMsg("Email dispatch failed.");}setTimeout(()=>setEmailMsg(""),5000);}

  async function sendReminders(){setEmailMsg("Sending reminders...");const pending=checklist.filter(i=>!i.done);const lines=pending.map(i=>"Task: "+i.task+" | Assignee: "+i.assignee+" | Deadline: "+i.deadline+" | Priority: "+i.priority).join("\n");try{await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:"Send email via Gmail. To: sshashwat8@gmail.com. Subject: Reminder — Pending Tasks for "+setup.eventTitle+". Body:\n\nDear Team,\n\nPending tasks for "+setup.eventTitle+" ("+fmt(setup.date)+"):\n\n"+lines+"\n\nRegards,\n"+setup.coordinator+"\n"+setup.role+"\nJanman Peoples Foundation"}]})});setEmailMsg("Reminders sent!");}catch(e){setEmailMsg("Failed.");}setTimeout(()=>setEmailMsg(""),5000);}

  async function scheduleMeeting(){setCalMsg("Scheduling...");try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gcal.mcp.claude.com/mcp",name:"gcal"}],messages:[{role:"user",content:"Create a Google Calendar event. Title: Planning Meeting for "+setup.eventTitle+". Date: "+meetingDate+", time "+meetingTime+" IST, 1.5 hours. Attendees concept: "+meetingAttendees.join(", ")+". Agenda: "+meetingAgenda}]})});const d=await r.json();const txt=(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");setCalMsg(txt.toLowerCase().includes("created")||txt.toLowerCase().includes("event")?"Meeting scheduled in Google Calendar!":"Calendar request sent.");}catch(e){setCalMsg("Calendar sync failed.");}setTimeout(()=>setCalMsg(""),5000);}

  async function genChecklist(){setLoad("cl",true);try{const txt=await callAI("Create a comprehensive event to-do checklist with timeline.\n\n"+eventCtx()+"\nTEAM: "+TEAM.slice(0,6).join(", ")+"\n\nReturn ONLY a JSON array: [{\"task\":\"...\",\"category\":\"...\",\"assignee\":\"...\",\"deadline\":\"YYYY-MM-DD\",\"priority\":\"high/medium/low\",\"notes\":\"...\"}]\n\nCategories: Venue and Setup, Stationery and Materials, Food and Refreshments, Invitations and Calling, Photography and Videography, Social Media Communications, Travel and Accommodation, AV and Equipment, Documentation, Follow-up Actions");try{setChecklist(JSON.parse(txt.replace(/```json|```/g,"").trim()));}catch(e){setChecklist([{task:"Book venue and confirm",category:"Venue and Setup",assignee:"Roshin Jacob",deadline:setup.date,priority:"high",notes:""},{task:"Print materials",category:"Stationery and Materials",assignee:"Sachina",deadline:setup.date,priority:"high",notes:""},{task:"Send formal invitations",category:"Invitations and Calling",assignee:setup.coordinator,deadline:setup.date,priority:"high",notes:""}]);}}catch(e){setChecklist([]);}setLoad("cl",false);}

  async function genLogistics(){setLoad("log",true);try{const txt=await callAI("Create a logistics breakdown for this event. Budget: Rs "+setup.budget+"\n\n"+eventCtx()+"\n\nReturn ONLY JSON: {\"Venue and Setup\":[{\"item\":\"...\",\"qty\":\"...\",\"person\":\"...\",\"cost\":\"...\",\"status\":\"pending\"}],...}\n\nCover: Venue and Setup, Stationery, Food, Photography, AV, Travel, Printing, Communication.");try{setLogistics(JSON.parse(txt.replace(/```json|```/g,"").trim()));}catch(e){setLogistics({"Venue and Setup":[{item:"Venue booking",qty:"1",person:setup.coordinator,cost:"As per venue",status:"pending"}],"Stationery":[{item:"Registers and pens",qty:"50",person:"Sachina",cost:"Rs 500",status:"pending"}]});}}catch(e){setLogistics({});}setLoad("log",false);}

  async function genReportFmt(){setLoad("report",true);try{setReportFmt(await callAI("Create a comprehensive event report template and verbatim transcription format.\n\n"+eventCtx()+"\n\n1. EVENT REPORT TEMPLATE: summary table, executive summary, objectives vs outcomes, session-by-session table, key discussions, resolutions, cases identified, feedback, media, financial summary, action points table, annexures, sign-off\n2. TRANSCRIPTION FORMAT: speaker-wise, Q&A, community testimony, key quotes extraction"));}catch(e){setReportFmt("Error.");}setLoad("report",false);}

  async function genPostEventSocial(){setLoad("pSocial",true);try{setPostEventSocial(await callAI("Post-event social media. Attendance: "+attendance+". Highlights: "+keyHighlights+". Notes: "+postNotes+"\n\n"+eventCtx()+"\n\n1. WRAP-UP POSTS: 2 FB, 2 IG, 1 Twitter thread (5 tweets), 1 WhatsApp broadcast (Hindi)\n2. KEY TAKEAWAYS: 5-7 bullets + newsletter paragraph\n3. FOLLOW-UP COMMS: thank you to speakers, follow-up to participants, next steps to community\n4. REPORT TEASER"));}catch(e){setPostEventSocial("Error.");}setLoad("pSocial",false);}

  async function genActionPoints(){setLoad("actions",true);try{setActionPoints(await callAI("Event outcomes analysis. Attendance: "+attendance+". Highlights: "+keyHighlights+". Notes: "+postNotes+"\n\n"+eventCtx()+"\n\n1. IMMEDIATE ACTION POINTS (1 week): table with Action | Responsible | Deadline | Resources\n2. SHORT-TERM FOLLOW-UP (1 month): cases, representations, meetings, reports\n3. MEDIUM-TERM PLAN (3-6 months): litigation, mobilisation, PLV, policy advocacy\n4. ANALYSIS AND WAY FORWARD: what worked, gaps, lessons, systemic issues\n5. FUNDER REPORTING: how this event contributes to Grant "+selProject.grant+" outcomes, data for annual report, SDG 16 linkages"));}catch(e){setActionPoints("Error.");}setLoad("actions",false);}

  function saveEvent(){const evt={id:uid(),setup:{...setup},conceptNote,agendaText,speakers,socialMedia,checklist:[...checklist],reportFmt,createdAt:td(),status:"planning"};setEvents(p=>[...p,evt]);}

  const doneCount=checklist.filter(c=>c.done).length;
  const pctDone=checklist.length>0?Math.round(doneCount/checklist.length*100):0;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}select,input,textarea{outline:none;color-scheme:dark;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#1C2B46;border-radius:3px;}"}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid "+C.border,padding:"0 22px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:C.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚖️</div>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:C.text}}>Jan Sahayak Pro</span>
          <span style={{fontSize:10,color:C.muted}}>Janman Peoples Foundation · Jan Nyaya Abhiyan</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          {TOP_MODULES.map((m,i)=><button key={i} onClick={()=>setModule(i)} style={{padding:"5px 13px",borderRadius:6,border:"none",background:module===i?C.accentSoft:"transparent",color:module===i?C.accent:C.dim,fontSize:11,fontWeight:module===i?700:400,cursor:"pointer"}}>{m}</button>)}
        </div>
        <Badge label={events.length+" events"} color="purple"/>
      </div>

      {/* CASEWORK */}
      {module===1&&<div style={{padding:"22px 28px",maxWidth:1100}}><CaseworkModule/></div>}

      {/* FELLOWS */}
      {module===2&&<div style={{padding:"22px 28px",maxWidth:1100}}><PLVModule/></div>}

      {/* ANNUAL REPORT */}
      {module===3&&<div style={{padding:"22px 28px",maxWidth:1100}}><AnnualReportModule/></div>}

      {/* EVENT PIPELINE */}
      {module===0&&<div style={{display:"flex",gap:0}}>
        {/* SIDEBAR */}
        <div style={{width:190,borderRight:"1px solid "+C.border,minHeight:"calc(100vh - 52px)",padding:"16px 14px",flexShrink:0}}>
          <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Pipeline Steps</div>
          {STEPS.map((s,i)=><button key={i} onClick={()=>setStep(i)} style={{width:"100%",textAlign:"left",padding:"7px 9px",borderRadius:7,border:"none",background:step===i?C.accentSoft:"transparent",color:step===i?C.accent:C.dim,fontSize:11,fontWeight:step===i?700:400,cursor:"pointer",marginBottom:3,display:"flex",alignItems:"center",gap:7}}>
            <span style={{width:19,height:19,borderRadius:"50%",background:step===i?C.accent:i<step?C.green+"22":C.muted+"22",color:step===i?"#000":i<step?C.green:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{i<step?"✓":i+1}</span>
            {s}
          </button>)}
          {setup.eventTitle&&<div style={{marginTop:16,padding:"11px 12px",background:C.surface,borderRadius:9,border:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.dim,marginBottom:5}}>Current Event</div>
            <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.4,marginBottom:4}}>{setup.eventTitle}</div>
            <div style={{fontSize:10,color:C.dim}}>{setup.eventType}</div>
            <div style={{fontSize:10,color:C.dim}}>📅 {fmt(setup.date)}</div>
            <div style={{fontSize:10,color:C.dim}}>📍 {setup.district}</div>
            <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:(step/6*100)+"%",background:C.accent,borderRadius:2}}/></div>
            <div style={{fontSize:9,color:C.dim,marginTop:2}}>{Math.round(step/6*100)}% complete</div>
          </div>}
          {events.length>0&&<div style={{marginTop:14}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Saved Events</div>
            {events.slice().reverse().slice(0,5).map(e=><div key={e.id} style={{padding:"7px 0",borderBottom:"1px solid "+C.border+"20"}}>
              <div style={{fontSize:11,fontWeight:600,color:C.text,lineHeight:1.3}}>{e.setup.eventTitle}</div>
              <div style={{fontSize:10,color:C.dim}}>{fmt(e.setup.date)}</div>
            </div>)}
          </div>}
        </div>

        {/* MAIN */}
        <div style={{flex:1,padding:"20px 26px",maxWidth:1100,overflowY:"auto"}}>

          {step===0&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Event Setup</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:16}}>Define the event, assign a role, select a project, and set the foundation for AI-assisted planning.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <Sec>Role, Project & Event</Sec>
                <Sel label="Your Role" value={setup.role} onChange={e=>updSetup("role",e.target.value)} options={ROLES}/>
                <Sel label="Project" value={setup.project} onChange={e=>updSetup("project",e.target.value)} options={PROJECTS.map(p=>({value:p.id,label:p.name}))}/>
                <div style={{background:C.surface,borderRadius:8,padding:"9px 11px",marginBottom:10,fontSize:11}}>
                  <div style={{fontWeight:600,color:C.text,marginBottom:2}}>{selProject.name}</div>
                  <div style={{color:C.dim}}>Grant: {selProject.grant}</div>
                  <div style={{color:C.dim}}>Budget: Rs {(selProject.budget/1e5).toFixed(0)}L · {selProject.start} to {selProject.end}</div>
                </div>
                <Sel label="Event Type" value={setup.eventType} onChange={e=>updSetup("eventType",e.target.value)} options={EVENT_TYPES}/>
                <Inp label="Event Title" value={setup.eventTitle} onChange={e=>updSetup("eventTitle",e.target.value)} placeholder="e.g. State-level Consultation on GBV and Access to Justice in Bihar"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Event Date" type="date" value={setup.date} onChange={e=>updSetup("date",e.target.value)}/>
                  <Inp label="End Date (multi-day)" type="date" value={setup.endDate} onChange={e=>updSetup("endDate",e.target.value)}/>
                </div>
                <Inp label="Location / Venue" value={setup.location} onChange={e=>updSetup("location",e.target.value)} placeholder="e.g. Hotel Chanakya, Patna"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Sel label="District" value={setup.district} onChange={e=>updSetup("district",e.target.value)} options={DISTRICTS_BIHAR}/>
                  <Inp label="Event Budget (Rs)" value={setup.budget} onChange={e=>updSetup("budget",e.target.value)} placeholder="e.g. 70000"/>
                </div>
                <Sel label="Event Coordinator" value={setup.coordinator} onChange={e=>updSetup("coordinator",e.target.value)} options={TEAM}/>
              </Card>
              <Card>
                <Sec>Brief & Context</Sec>
                <Inp label="Event Objectives" value={setup.objectives} onChange={e=>updSetup("objectives",e.target.value)} rows={2} placeholder="What change will this catalyse?"/>
                <Inp label="Key Issues to Address" value={setup.issues} onChange={e=>updSetup("issues",e.target.value)} rows={2} placeholder="e.g. Police inaction in GBV cases, denial of MGNREGS wages, SC/ST atrocities in Seemanchal…"/>
                <Inp label="Relevant Acts and Laws" value={setup.acts} onChange={e=>updSetup("acts",e.target.value)} placeholder="e.g. PWDVA 2005, POCSO 2012, SC/ST Atrocities Act, NFSA, BNSS…"/>
                <Inp label="Constitutional Provisions" value={setup.constitutional} onChange={e=>updSetup("constitutional",e.target.value)} placeholder="e.g. Articles 14, 15, 17, 21, 21A, 32, 39A, 300A…"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Target Audience" value={setup.targetAudience} onChange={e=>updSetup("targetAudience",e.target.value)} placeholder="e.g. Survivors, PLVs, lawyers, officials…"/>
                  <Inp label="Expected Participants" value={setup.expectedParticipants} onChange={e=>updSetup("expectedParticipants",e.target.value)} placeholder="e.g. 60-80"/>
                </div>
                <Inp label="Special Guests / Chief Guest" value={setup.specialGuests} onChange={e=>updSetup("specialGuests",e.target.value)} placeholder="e.g. District Judge, SP, DLSA Secretary…"/>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Themes</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{THEMES.map(t=>{const sel=setup.themes.includes(t);return <button key={t} onClick={()=>toggleTheme(t)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.accent+"55":C.border),background:sel?C.accentSoft:"transparent",color:sel?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{t}</button>;})}</div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Learn From These Organisations</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{ORGS.map(o=>{const sel=setup.orgsToLearnFrom.includes(o);return <button key={o} onClick={()=>toggleOrg(o)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.purple+"55":C.border),background:sel?"rgba(155,114,207,0.1)":"transparent",color:sel?C.purple:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{o}</button>;})}</div>
                </div>
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:13}}>
              <Btn color="accent" size="lg" onClick={()=>setStep(1)} disabled={!setup.eventTitle.trim()}>{setup.eventTitle.trim()?"Next: Brief and Design →":"Enter Event Title to Continue"}</Btn>
            </div>
          </div>}

          {step===1&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Event Brief and AI Design</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate concept note, agenda and speaker suggestions.</div>
            <div style={{background:C.surface,borderRadius:9,padding:"11px 14px",marginBottom:14,border:"1px solid "+C.border+"55"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[["Title",setup.eventTitle],["Type",setup.eventType],["Date",fmt(setup.date)],["Location",setup.location+", "+setup.district],["Coordinator",setup.coordinator],["Budget","Rs "+setup.budget],["Participants",setup.expectedParticipants],["Themes",setup.themes.slice(0,2).join(", ")+(setup.themes.length>2?"…":"")]].map(item=><div key={item[0]} style={{background:C.card,borderRadius:7,padding:"7px 9px"}}><div style={{fontSize:9,color:C.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:.6}}>{item[0]}</div><div style={{fontSize:11,color:C.text,fontWeight:600,lineHeight:1.4}}>{item[1]||"—"}</div></div>)}
              </div>
            </div>
            <Output title="Concept Note" content={conceptNote} loadKey="cn" onGen={genConceptNote} loadingKeys={loadingKeys}/>
            <Output title="Detailed Agenda (Time-by-Time)" content={agendaText} loadKey="agenda" onGen={genAgenda} loadingKeys={loadingKeys}/>
            <Output title="Speaker and Resource Person Suggestions" content={speakers} loadKey="speakers" onGen={genSpeakers} loadingKeys={loadingKeys}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={()=>setStep(0)}>Back</Btn><Btn color="accent" onClick={()=>setStep(2)}>Next: Communications</Btn></div>
          </div>}

          {step===2&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Communications and Invitations</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate social media kits and formal invitations.</div>
            <div style={{display:"flex",gap:5,marginBottom:13}}>{["social","invite"].map(t=><button key={t} onClick={()=>setRecipTab(t)} style={{padding:"6px 14px",borderRadius:7,border:"none",background:recipTab===t?C.accentSoft:"transparent",color:recipTab===t?C.accent:C.dim,fontSize:12,fontWeight:recipTab===t?700:400,cursor:"pointer"}}>{t==="social"?"Social Media Campaign Kit":"Formal Invite Generator"}</button>)}</div>
            {recipTab==="social"&&<Output title="Social Media Campaign Kit" content={socialMedia} loadKey="social" onGen={genSocial} loadingKeys={loadingKeys}/>}
            {recipTab==="invite"&&<div>
              <Card style={{marginBottom:13}}>
                <Sec>Recipient Details</Sec>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Recipient Name" value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="e.g. Justice Abhay S. Oka"/>
                  <Inp label="Designation" value={inviteDesig} onChange={e=>setInviteDesig(e.target.value)} placeholder="e.g. Judge, Supreme Court of India"/>
                  <Inp label="Organisation" value={inviteOrg} onChange={e=>setInviteOrg(e.target.value)} placeholder="e.g. Supreme Court of India"/>
                  <Inp label="Email Address" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="recipient@email.com"/>
                </div>
              </Card>
              <Output title="Formal Invitation Letter" content={formalInvite} loadKey="invite" onGen={genInvite} loadingKeys={loadingKeys}
                extra={formalInvite&&inviteEmail?<Btn size="sm" color="blue" onClick={sendInviteEmail}>Send via Gmail</Btn>:null}/>
              {emailMsg&&<div style={{fontSize:12,color:C.accent,padding:"7px 11px",background:C.accentSoft,borderRadius:7,marginBottom:10}}>{emailMsg}</div>}
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={()=>setStep(1)}>Back</Btn><Btn color="accent" onClick={()=>setStep(3)}>Next: Logistics</Btn></div>
          </div>}

          {step===3&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Logistics and Checklist</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>AI-generated to-do checklist with timeline and assignees.</div>
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:14}}>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>To-Do Checklist ({doneCount}/{checklist.length})</Sec>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    {emailMsg&&<div style={{fontSize:10,color:C.accent}}>{emailMsg}</div>}
                    {checklist.length>0&&<Btn size="sm" color="blue" onClick={sendReminders}>Send Reminders</Btn>}
                    <Btn size="sm" color="accent" onClick={genChecklist} disabled={isLoading("cl")}>{isLoading("cl")?"Generating…":"Generate"}</Btn>
                  </div>
                </div>
                {checklist.length>0&&<div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:pctDone+"%",background:C.green,borderRadius:2}}/></div>}
                {checklist.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate" to create a comprehensive checklist.</div>}
                {checklist.map((item,i)=><div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}>
                  <input type="checkbox" checked={item.done||false} onChange={()=>toggleCheckDone(i)} style={{marginTop:3,accentColor:C.accent,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:item.done?C.dim:C.text,textDecoration:item.done?"line-through":"none"}}>{item.task}</div>
                    <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                      <Badge label={item.category} color="gray"/>
                      <Badge label={item.assignee} color="amber"/>
                      {item.priority==="high"&&<Badge label="HIGH" color="red"/>}
                    </div>
                    {item.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{item.notes}</div>}
                  </div>
                  <div style={{fontSize:10,color:C.dim,flexShrink:0}}>{item.deadline?fmt(item.deadline):"—"}</div>
                </div>)}
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>Logistics Breakdown</Sec>
                  <Btn size="sm" color="accent" onClick={genLogistics} disabled={isLoading("log")}>{isLoading("log")?"Generating…":"Generate"}</Btn>
                </div>
                {Object.keys(logistics).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate" to create logistics breakdown.</div>}
                {Object.keys(logistics).map(cat=><div key={cat} style={{marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.7}}>{cat}</div>
                  {(logistics[cat]||[]).map((item,i)=><div key={i} style={{display:"flex",gap:7,padding:"5px 8px",background:C.surface,borderRadius:6,marginBottom:3}}>
                    <div style={{flex:1,fontSize:11,color:C.text}}>{item.item}</div>
                    <div style={{fontSize:10,color:C.dim}}>{item.qty}</div>
                    <div style={{fontSize:10,color:C.accent}}>{item.cost}</div>
                  </div>)}
                </div>)}
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={()=>setStep(2)}>Back</Btn><Btn color="accent" onClick={()=>setStep(4)}>Next: Scheduling</Btn></div>
          </div>}

          {step===4&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Meeting Scheduling and Gantt Chart</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Schedule a planning meeting via Google Calendar and view the project Gantt timeline.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <Sec>Schedule Planning Meeting</Sec>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Meeting Date" type="date" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}/>
                  <Inp label="Time" type="time" value={meetingTime} onChange={e=>setMeetingTime(e.target.value)}/>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Attendees</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{TEAM.map(name=>{const sel=meetingAttendees.includes(name);return <button key={name} onClick={()=>toggleAttendee(name)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.accent+"55":C.border),background:sel?C.accentSoft:"transparent",color:sel?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{name}</button>;})}</div>
                </div>
                <Inp label="Meeting Agenda" value={meetingAgenda} onChange={e=>setMeetingAgenda(e.target.value)} rows={3} placeholder="e.g. Event planning, task assignment, timeline review, budget approval…"/>
                {calMsg&&<div style={{fontSize:11,color:C.accent,padding:"7px 10px",background:C.accentSoft,borderRadius:7,marginBottom:9}}>{calMsg}</div>}
                <Btn onClick={scheduleMeeting} color="green" disabled={!meetingDate||meetingAttendees.length===0}>Schedule via Google Calendar</Btn>
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>Project Gantt — {selProject.code}</Sec>
                  <Btn size="sm" color="purple" onClick={()=>setGanttVisible(!ganttVisible)}>{ganttVisible?"Hide":"Show Gantt"}</Btn>
                </div>
                {!ganttVisible&&<div style={{color:C.dim,fontSize:12,padding:8}}>Click "Show Gantt" to view the full project timeline.</div>}
                {ganttVisible&&<div>
                  {[...new Set(GANTT_ITEMS.map(g=>g.cat))].map(cat=>{
                    const projStart=new Date(selProject.start);
                    const total=new Date(selProject.end)-projStart;
                    return <div key={cat} style={{marginBottom:11}}>
                      <div style={{fontSize:9,fontWeight:700,color:CAT_COLORS[cat]||C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.8}}>{cat}</div>
                      {GANTT_ITEMS.filter(g=>g.cat===cat).map((item,i)=>{
                        const iStart=Math.max(0,(new Date(item.start)-projStart)/total*100);
                        const iWidth=Math.min(100-iStart,(new Date(item.end)-new Date(item.start))/total*100);
                        return <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                          <div style={{width:160,fontSize:10,color:C.text,flexShrink:0,lineHeight:1.3}}>{item.task}</div>
                          <div style={{flex:1,height:10,background:C.surface,borderRadius:3,position:"relative",overflow:"hidden"}}>
                            <div style={{position:"absolute",left:iStart+"%",width:Math.max(iWidth,2)+"%",height:"100%",background:CAT_COLORS[cat]||C.accent,borderRadius:3,opacity:.85}}/>
                          </div>
                          <div style={{width:60,fontSize:9,color:C.dim,flexShrink:0}}>{item.assignee.split(" ")[0]}</div>
                        </div>;
                      })}
                    </div>;
                  })}
                  <div style={{fontSize:9,color:C.dim,marginTop:6}}>{selProject.start} → {selProject.end}</div>
                </div>}
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={()=>setStep(3)}>Back</Btn><Btn color="accent" onClick={()=>setStep(5)}>Next: Reporting</Btn></div>
          </div>}

          {step===5&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Reporting and Documentation Formats</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate ready-to-fill event report template and transcription format.</div>
            <Output title="Event Report Template and Transcription Format" content={reportFmt} loadKey="report" onGen={genReportFmt} loadingKeys={loadingKeys}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={()=>setStep(4)}>Back</Btn><Btn color="accent" onClick={()=>setStep(6)}>Next: Post-Event Analysis</Btn></div>
          </div>}

          {step===6&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Post-Event Analysis and Communications</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Enter event outcomes, then generate post-event social media, action points and way forward.</div>
            <Card style={{marginBottom:13}}>
              <Sec>Event Outcomes (Fill After Event)</Sec>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <Inp label="Actual Attendance" value={attendance} onChange={e=>setAttendance(e.target.value)} placeholder="e.g. 78 participants — 34 women, 12 PLVs, 8 lawyers, 6 officials"/>
                <Inp label="Key Highlights" value={keyHighlights} onChange={e=>setKeyHighlights(e.target.value)} placeholder="e.g. 12 cases identified, resolution passed, DM committed to action"/>
              </div>
              <Inp label="Post-Event Notes" value={postNotes} onChange={e=>setPostNotes(e.target.value)} rows={4} placeholder="What happened, key discussions, decisions, outcomes, challenges, commitments…"/>
            </Card>
            <Output title="Post-Event Social Media Communications" content={postEventSocial} loadKey="pSocial" onGen={genPostEventSocial} loadingKeys={loadingKeys}/>
            <Output title="Action Points, Way Forward and Funder Reporting" content={actionPoints} loadKey="actions" onGen={genActionPoints} loadingKeys={loadingKeys}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
              <Btn color="ghost" onClick={()=>setStep(5)}>Back</Btn>
              <Btn color="green" size="lg" onClick={saveEvent}>Save and Archive This Event</Btn>
            </div>
          </div>}

        </div>
      </div>}

      <div style={{textAlign:"center",padding:"11px 22px",fontSize:10,color:C.muted,borderTop:"1px solid "+C.border}}>Jan Sahayak Pro · Janman Peoples Foundation · Jan Nyaya Abhiyan · Grant R 2409-19929</div>
    </div>
  );
}
