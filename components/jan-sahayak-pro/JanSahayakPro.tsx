// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import { claudeCall, lsGet, lsSet } from "@/lib/ai-client";

// Jan Sahayak Pro — Pattachitra Heritage edition.
// Director / coordinator / DLF team app for Janman People's Foundation · JNA.

var P={bg:"#0F0B07",sf:"#1A140D",cd:"#221A11",bd:"#3D2E1F",ink:"#E8D4B8",dim:"#8A7A64",mt:"#5A4A36",ac:"#E8A243",gold:"#F4C068",cr:"#C74E3F",grn:"#5EAA7E",blu:"#6A9EE0",pur:"#B68AE0",tl:"#4EBAAD",parch:"#D4B898"};
var FN="'Mukta','Noto Sans',sans-serif";var HD="'Cormorant Garamond','Playfair Display',serif";
var uid=function(){return Math.random().toString(36).slice(2,10);};
var td=function(){return new Date().toISOString().split("T")[0];};
var fmt=function(d){if(!d)return"";return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});};
var daysSince=function(d){if(!d)return 0;return Math.floor((Date.now()-new Date(d).getTime())/86400000);};

var BG_PAT="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" opacity="0.025"><circle cx="120" cy="120" r="100" fill="none" stroke="#E8A243" stroke-width="0.8"/><circle cx="120" cy="120" r="80" fill="none" stroke="#E8A243" stroke-width="0.6"/><circle cx="120" cy="120" r="60" fill="none" stroke="#E8A243" stroke-width="0.5"/><path d="M120 20 L125 50 L120 55 L115 50 Z" fill="#E8A243"/><path d="M120 220 L125 190 L120 185 L115 190 Z" fill="#E8A243"/><path d="M20 120 L50 115 L55 120 L50 125 Z" fill="#E8A243"/><path d="M220 120 L190 115 L185 120 L190 125 Z" fill="#E8A243"/><circle cx="120" cy="120" r="8" fill="none" stroke="#E8A243" stroke-width="0.8"/><circle cx="120" cy="120" r="2" fill="#E8A243"/><path d="M80 80 Q120 60 160 80 Q170 120 160 160 Q120 180 80 160 Q70 120 80 80" fill="none" stroke="#F4C068" stroke-width="0.4"/></svg>');
var SCALES="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><line x1="20" y1="6" x2="20" y2="34" stroke="#E8A243" stroke-width="1.5"/><line x1="8" y1="12" x2="32" y2="12" stroke="#E8A243" stroke-width="1.2"/><circle cx="20" cy="35" r="2" fill="#E8A243"/><path d="M8 12 L4 22 L12 22 Z" fill="none" stroke="#E8A243" stroke-width="1"/><path d="M32 12 L28 22 L36 22 Z" fill="none" stroke="#E8A243" stroke-width="1"/><ellipse cx="8" cy="22" rx="4" ry="1.5" fill="none" stroke="#F4C068" stroke-width="0.8"/><ellipse cx="32" cy="22" rx="4" ry="1.5" fill="none" stroke="#F4C068" stroke-width="0.8"/></svg>');
var BORDER="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="10"><path d="M0 5 Q8 0 15 5 Q22 10 30 5 Q38 0 45 5 Q52 10 60 5 Q68 0 75 5 Q82 10 90 5 Q97 0 100 5" fill="none" stroke="#E8A243" stroke-width="0.8" opacity="0.5"/><circle cx="15" cy="5" r="1.2" fill="#F4C068" opacity="0.6"/><circle cx="45" cy="5" r="1.2" fill="#E8A243" opacity="0.6"/><circle cx="75" cy="5" r="1.2" fill="#F4C068" opacity="0.6"/></svg>');
var ASHOKA="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" opacity="0.3"><circle cx="30" cy="30" r="24" fill="none" stroke="#E8A243" stroke-width="1"/><circle cx="30" cy="30" r="16" fill="none" stroke="#E8A243" stroke-width="0.6"/><g stroke="#E8A243" stroke-width="0.5" fill="none"><line x1="30" y1="14" x2="30" y2="46"/><line x1="14" y1="30" x2="46" y2="30"/><line x1="18.7" y1="18.7" x2="41.3" y2="41.3"/><line x1="41.3" y1="18.7" x2="18.7" y2="41.3"/></g><circle cx="30" cy="30" r="3" fill="#E8A243"/></svg>');

var TEAM=[{n:"Shashwat",r:"Director",rl:"super",d:"All"},{n:"Shourya Roy",r:"COO",rl:"super",d:"All"},{n:"Roshin Jacob",r:"Program Mgr",rl:"super",d:"All"},{n:"Mugdha",r:"Coordinator",rl:"coord",d:"All"},{n:"Prakash Kumar",r:"DLF",rl:"dlf",d:"Purnia"},{n:"Sachina",r:"DLF",rl:"dlf",d:"Araria"},{n:"Nawaz Hassan",r:"DLF",rl:"dlf",d:"Kishanganj"},{n:"Tausif Raza",r:"DLF",rl:"dlf",d:"Katihar"},{n:"Mithlesh Kumar",r:"DLF",rl:"dlf",d:"Supaul"},{n:"Pintu Kumar Mehta",r:"DLF",rl:"dlf",d:"Madhepura"},{n:"Nagmani",r:"Social Worker",rl:"sw",d:"Purnia"},{n:"Ashwini Pandey",r:"Legal Consultant",rl:"lc",d:"All"}];
var DISTS=[{n:"Purnia",x:50,y:30},{n:"Araria",x:75,y:25},{n:"Kishanganj",x:92,y:20},{n:"Katihar",x:70,y:50},{n:"Supaul",x:25,y:35},{n:"Madhepura",x:30,y:55}];
var SC={"new":"#6A9EE0",assigned:"#E8A243",in_progress:"#B68AE0",escalated:"#C74E3F",resolved:"#5EAA7E",closed:"#8A7A64"};
var STAGES=["Intake","Assess","Fact","Draft","File","Hear","Judge","Close"];
var MODS=[{t:"Manual Scavenging",s:"Balram Singh (2023); SKA (2014) 11 SCC 224"},{t:"Acid Attack",s:"Laxmi v. UoI (2014) 4 SCC 427"},{t:"SC/ST Atrocity",s:"POA Act 1989"},{t:"Domestic Violence",s:"DV Act 2005"},{t:"POCSO",s:"Nipun Saxena (2019)"},{t:"Bail Law",s:"Arnesh Kumar; Sec 479 BNSS"},{t:"Right to Food",s:"PUCL v. UoI; NFSA 2013"},{t:"RTE",s:"RTE Act; Unni Krishnan"},{t:"Police Accountability",s:"D.K. Basu (1997)"},{t:"Forest Rights",s:"FRA 2006"},{t:"Bonded Labour",s:"Bandhua Mukti Morcha"},{t:"Street Vendors",s:"Olga Tellis; SV Act 2014"},{t:"Consumer",s:"CPA 2019"},{t:"RTI",s:"RTI 2005"},{t:"Prisoner Rights",s:"Hussainara; Sec 479 BNSS"},{t:"Bihar Land",s:"PPH 1947; BPLEA 1956"},{t:"Disability",s:"RPWD 2016"},{t:"Child Rights",s:"JJ Act 2015"},{t:"Hate Speech",s:"Sec 196 BNS"},{t:"Cyber Crimes",s:"IT Act; DPDP 2023"}];

function Btn(p){var bg=p.c||P.ac;return (<button onClick={p.onClick} disabled={p.dis} style={{padding:p.sm?"6px 11px":"10px 18px",borderRadius:7,border:p.ghost?"1px solid "+bg:"none",background:p.dis?P.mt:p.ghost?"transparent":bg,color:p.ghost?bg:"#1A140D",fontSize:p.sm?10:12,fontWeight:800,cursor:p.dis?"not-allowed":"pointer",fontFamily:FN,width:p.full?"100%":"auto",opacity:p.dis?0.5:1,letterSpacing:0.3}}>{p.children}</button>);}
function Card(p){return (<div style={Object.assign({},{background:P.cd,border:"1px solid "+P.bd,borderRadius:10,padding:"14px 13px",marginBottom:10,position:"relative",overflow:"hidden"},p.s||{})}>{p.accent&&<div style={{position:"absolute",top:0,left:0,bottom:0,width:3,background:p.accent}}/>}{p.pat&&<div style={{position:"absolute",top:0,left:0,right:0,height:4,backgroundImage:"url(\""+BORDER+"\")",backgroundRepeat:"repeat-x",backgroundSize:"100px 10px",opacity:0.5}}/>}{p.children}</div>);}
function Pill(p){return (<span style={{display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:800,background:p.c+"22",color:p.c,textTransform:"uppercase",border:"1px solid "+p.c+"40",letterSpacing:0.4}}>{p.children}</span>);}
function Hd(p){return (<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:28,height:28,backgroundImage:"url(\""+SCALES+"\")",backgroundSize:"contain",backgroundRepeat:"no-repeat",flexShrink:0}}/><div style={{flex:1}}><div style={{fontFamily:HD,fontSize:18,fontWeight:800,color:P.gold,letterSpacing:0.5}}>{p.children}</div>{p.sub&&<div style={{fontSize:10,color:P.dim,marginTop:1,fontStyle:"italic"}}>{p.sub}</div>}</div>{p.right}</div>);}

function priorityScore(q,aLog){var logs=aLog[q.id]||[];var last=logs.length?logs[logs.length-1]:null;var days=last?daysSince(last.date):daysSince(q.createdAt||q.date);var score=0;if(q.urgency==="critical")score+=100;if(q.urgency==="high")score+=50;if(q.status==="escalated")score+=80;if(days>7)score+=60;else if(days>3)score+=30;else if(days>1)score+=10;if(!q.status||q.status==="new")score+=40;if(q.status==="assigned"&&!last)score+=20;return {score:score,days:days,sla:days>3?"breach":days>1?"warning":"ok"};}

function tryParseJson(s){try{return JSON.parse((s||"").replace(/```json|```/g,"").trim());}catch(e){return {error:true,raw:s};}}

export default function JanSahayakPro(){
var [user,setUser]=useState("Shashwat");
var me=TEAM.find(function(t){return t.n===user;})||TEAM[0];
var isSuper=me.rl==="super";
var [pg,setPg]=useState("home");var [selQ,setSelQ]=useState(null);var [selDist,setSelDist]=useState(null);
var [inc,setInc]=useState([]);var [app,setApp]=useState([]);var [appt,setAppt]=useState([]);var [queries,setQueries]=useState([]);
var [aLog,setALog]=useState({});var [esc,setEsc]=useState([]);
var [aiL,setAiL]=useState(false);var [aiR,setAiR]=useState(null);var [docT,setDocT]=useState("");var [ocrR,setOcrR]=useState(null);
var [rQ,setRQ]=useState("");var [rR,setRR]=useState(null);var [rL,setRL]=useState(false);var [selMod,setSelMod]=useState(null);
var [briefing,setBriefing]=useState(null);var [briefL,setBriefL]=useState(false);

useEffect(function(){ld();var iv=setInterval(ld,12000);return function(){clearInterval(iv);};},[]);
async function ld(){var i=await lsGet("jsc_incidents")||[];var a=await lsGet("jsc_applications")||[];var p=await lsGet("jsc_appointments")||[];var al=await lsGet("jsp_action_log")||{};var es=await lsGet("jsp_escalations")||[];setInc(i);setApp(a);setAppt(p);setALog(al);setEsc(es);setQueries([].concat(i.map(function(x){return Object.assign({},x,{qt:"incident",qi:"\u{1F6A8}"});}),a.map(function(x){return Object.assign({},x,{qt:"application",qi:"\u{1F4CB}"});}),p.map(function(x){return Object.assign({},x,{qt:"appointment",qi:"\u{1F4C5}"});})).sort(function(a,b){return(b.date||b.createdAt||"").localeCompare(a.date||a.createdAt||"");}));}

function visibleQueries(){return isSuper?queries:queries.filter(function(q){return q.district===me.d||q.assignedTo===me.n||me.d==="All";});}
function myCases(){return queries.filter(function(q){return q.assignedTo===me.n;});}
function priorityQueue(){return visibleQueries().map(function(q){return Object.assign({},q,{_p:priorityScore(q,aLog)});}).filter(function(q){return q.status!=="resolved"&&q.status!=="closed";}).sort(function(a,b){return b._p.score-a._p.score;});}

async function uQ(id,u){var uI=inc.map(function(i){return i.id===id?Object.assign({},i,u):i;});var uA=app.map(function(i){return i.id===id?Object.assign({},i,u):i;});var uP=appt.map(function(i){return i.id===id?Object.assign({},i,u):i;});await lsSet("jsc_incidents",uI);await lsSet("jsc_applications",uA);await lsSet("jsc_appointments",uP);setInc(uI);setApp(uA);setAppt(uP);setQueries(function(q){return q.map(function(x){return x.id===id?Object.assign({},x,u):x;});});if(selQ&&selQ.id===id)setSelQ(Object.assign({},selQ,u));}
async function addLog(id,e){var u=Object.assign({},aLog);u[id]=[].concat(u[id]||[],[Object.assign({},e,{date:new Date().toISOString(),by:user})]);setALog(u);await lsSet("jsp_action_log",u);}
async function escQ(id,r){var e=[].concat(esc,[{queryId:id,reason:r,date:new Date().toISOString(),by:user,status:"pending"}]);setEsc(e);await lsSet("jsp_escalations",e);await uQ(id,{status:"escalated",urgency:"critical"});await addLog(id,{action:"\u{1F4E2} Escalated: "+r});}

async function runAI(q){setAiL(true);setAiR(null);try{var text=await claudeCall("Jan Sahayak AI for Bihar. BNS/BNSS 2023. JSON:{\"priority\":\"critical|high|normal\",\"actions\":[{\"action\":\"...\",\"assignee\":\"...\",\"days\":0}],\"legal\":[],\"schemes\":[],\"category\":\"...\",\"risk\":\"...\",\"sla_days\":3}",[{role:"user",content:"Analyze: "+(q.desc||q.scheme||q.type||"")+" District:"+(q.district||"")+" Urgency:"+(q.urgency||"normal")+". JSON only."}],1200);setAiR(tryParseJson(text));}catch(e){setAiR({error:true});}setAiL(false);}
async function runDoc(t){setAiL(true);setOcrR(null);try{var text=await claudeCall("Legal doc analyzer. JSON:{\"doc_type\":\"...\",\"parties\":[],\"case_no\":\"\",\"court\":\"\",\"sections\":[],\"findings\":\"\",\"suggestions\":[],\"next_steps\":[]}",[{role:"user",content:"Analyze:\n"+t}],1500);setOcrR(tryParseJson(text));}catch(e){setOcrR({error:true});}setAiL(false);}

async function dailyBriefing(){setBriefL(true);try{var q=priorityQueue().slice(0,10);var summary=q.map(function(x){return(x.desc||x.scheme||x.type||"")+" ["+x.district+"/"+x._p.sla+"/"+x._p.days+"d]";}).join("; ");var text=await claudeCall("",[{role:"user",content:"Briefing for "+me.n+" ("+me.r+"). From priority queue:\n\n"+summary+"\n\nFormat:\n🌅 MORNING: 2 sentences on overall state\n⚡ TOP 3 TODAY: numbered actions\n⚠️ RISKS: 1-2 warnings\n\nUnder 120 words. Direct."}],500);setBriefing(text);}catch(e){setBriefing("Briefing unavailable.");}setBriefL(false);}

async function vidhiResearch(prompt,maxTokens){return await claudeCall("",[{role:"user",content:prompt}],maxTokens||1200,[{type:"web_search_20250305",name:"web_search"}]);}

function distStat(d){var dq=queries.filter(function(q){return q.district===d;});var active=dq.filter(function(q){return q.status!=="resolved"&&q.status!=="closed";}).length;var overdue=dq.filter(function(q){return priorityScore(q,aLog).sla==="breach"&&q.status!=="resolved"&&q.status!=="closed";}).length;var crit=dq.filter(function(q){return q.urgency==="critical";}).length;var dlf=TEAM.find(function(t){return t.d===d&&t.rl==="dlf";});return{total:dq.length,active:active,overdue:overdue,crit:crit,dlf:dlf?dlf.n:"Unassigned"};}
function heatColor(s){if(s.crit>0||s.overdue>2)return P.cr;if(s.overdue>0||s.active>5)return P.ac;if(s.active>0)return P.grn;return P.dim;}

var nav=isSuper?[{id:"home",ic:"\u{1F3EF}",lb:"Command"},{id:"queue",ic:"⚡",lb:"Queue"},{id:"map",ic:"\u{1F5FA}️",lb:"Map"},{id:"legal",ic:"⚖️",lb:"Legal"},{id:"docs",ic:"\u{1F4DC}",lb:"Docs"}]:[{id:"home",ic:"\u{1F3EF}",lb:"Home"},{id:"queue",ic:"⚡",lb:"Queue"},{id:"cases",ic:"\u{1F4C1}",lb:"My Cases"},{id:"legal",ic:"⚖️",lb:"Legal"},{id:"docs",ic:"\u{1F4DC}",lb:"Docs"}];

return (
<div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",fontFamily:FN,background:P.bg,color:P.ink,display:"flex",flexDirection:"column",backgroundImage:"url(\""+BG_PAT+"\")",backgroundRepeat:"repeat",backgroundSize:"240px"}}>
<style>{"@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700;800&family=Mukta:wght@400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:"+P.bg+"}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1}}@keyframes breathe{0%,100%{opacity:1}50%{opacity:.45}}input,textarea,select{font-family:"+FN+";color:"+P.ink+";background:"+P.sf+";border:1px solid "+P.bd+";border-radius:7px;padding:9px 11px;font-size:12px;outline:none;width:100%}input:focus,textarea:focus,select:focus{border-color:"+P.ac+"}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:"+P.ac+"30;border-radius:4px}"}</style>

  <div style={{background:"linear-gradient(180deg,#1A140D 0%,#0F0B07 100%)",padding:"14px 14px 10px",borderBottom:"1px solid "+P.bd,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:-10,right:-15,width:80,height:80,backgroundImage:"url(\""+ASHOKA+"\")",backgroundSize:"contain",backgroundRepeat:"no-repeat"}}/>
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,backgroundImage:"url(\""+BORDER+"\")",backgroundRepeat:"repeat-x",backgroundSize:"100px 10px",opacity:0.6}}/>
    <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:HD,fontSize:22,fontWeight:800,color:P.gold,letterSpacing:0.8,lineHeight:1}}>Jan Sahayak <span style={{fontSize:12,color:P.ac,letterSpacing:2}}>PRO</span></div><div style={{fontSize:9,color:P.dim,marginTop:3,letterSpacing:1,fontStyle:"italic"}}>Satyameva Jayate · Janman People's Foundation</div></div>
      <select value={user} onChange={function(e){setUser(e.target.value);setPg("home");setSelQ(null);}} style={{fontSize:10,padding:"5px 8px",background:P.sf,border:"1px solid "+P.bd,borderRadius:6,color:P.ink,maxWidth:140,fontWeight:700}}>{TEAM.map(function(t){return <option key={t.n} value={t.n}>{t.n.split(" ")[0]} ({t.r})</option>;})}</select>
    </div>
  </div>

  <div style={{flex:1,overflowY:"auto",padding:"12px 10px 76px"}}>

  {pg==="home"&&<div style={{animation:"rise .35s"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 2px 8px"}}>
      <div><div style={{fontSize:10,color:P.dim,letterSpacing:1}}>WELCOME</div><div style={{fontFamily:HD,fontSize:17,fontWeight:800,color:P.gold}}>{me.n.split(" ")[0]}</div></div>
      <div style={{textAlign:"right"}}><Pill c={isSuper?P.cr:P.ac}>{me.r}</Pill>{me.d!=="All"&&<div style={{fontSize:9,color:P.dim,marginTop:2}}>{me.d}</div>}</div>
    </div>

    <Card pat={true} s={{background:"linear-gradient(135deg,#221A11 0%,#1A140D 100%)",borderLeft:"3px solid "+P.gold}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{fontFamily:HD,fontSize:14,fontWeight:800,color:P.gold,letterSpacing:0.5}}>{"\u{1F305}"} Daily Briefing</div><Btn sm={true} c={P.tl} dis={briefL} onClick={dailyBriefing}>{briefL?"...":briefing?"Refresh":"Generate"}</Btn></div>
      {briefing?<pre style={{fontSize:11,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:FN,color:P.ink}}>{briefing}</pre>:<div style={{fontSize:10,color:P.dim,fontStyle:"italic"}}>Tap Generate for today's AI-powered priorities · situation, top 3, risks</div>}
    </Card>

    <Hd sub="Smart-ranked by urgency, SLA breach, days since action" right={<Btn sm={true} ghost={true} c={P.ac} onClick={function(){setPg("queue");}}>All {"→"}</Btn>}>Priority Queue</Hd>
    {priorityQueue().slice(0,5).map(function(q,idx){return (<button key={q.id} onClick={function(){setSelQ(q);setPg("qdet");}} style={{width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:9,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:6,display:"flex",gap:10,alignItems:"flex-start",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:q._p.sla==="breach"?P.cr:q._p.sla==="warning"?P.ac:q.urgency==="critical"?P.cr:P.grn}}/>
      <div style={{flexShrink:0,width:28,height:28,borderRadius:14,background:P.sf,border:"1px solid "+P.bd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:P.gold}}>{idx+1}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><span style={{fontSize:11,fontWeight:800,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{q.qi} {q.qt==="incident"?q.type:q.scheme||q.type||"Query"}</span><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></div>
        <div style={{fontSize:10,color:P.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(q.desc||"").slice(0,60)}</div>
        <div style={{display:"flex",gap:6,marginTop:5,fontSize:9,alignItems:"center"}}><span style={{color:P.dim}}>{"\u{1F4CD}"} {q.district||"—"}</span><span style={{color:q._p.sla==="breach"?P.cr:q._p.sla==="warning"?P.ac:P.grn,fontWeight:700}}>{"⏱"} {q._p.days}d</span>{q._p.sla==="breach"&&<span style={{color:P.cr,fontWeight:800,animation:"breathe 1.5s infinite"}}>SLA BREACH</span>}{q.urgency==="critical"&&<span style={{color:P.cr,fontWeight:800}}>{"\u{1F6A8}"}</span>}{q.assignedTo&&<span style={{color:P.gold,fontSize:8,marginLeft:"auto"}}>{"→"} {q.assignedTo.split(" ")[0]}</span>}</div>
      </div>
    </button>);})}
    {priorityQueue().length===0&&<Card><div style={{textAlign:"center",padding:20,color:P.dim,fontSize:11}}>All clear. No active priorities.</div></Card>}

    {isSuper?(
      <div style={{marginTop:14}}>
        <Hd sub="Live caseload across 6 districts" right={<Btn sm={true} ghost={true} c={P.ac} onClick={function(){setPg("map");}}>Full {"→"}</Btn>}>District Dashboard</Hd>
        <Card>
          <svg viewBox="0 0 100 70" style={{width:"100%",height:180}}>
            <path d="M10 40 Q15 15 40 12 Q65 8 85 18 Q98 25 95 50 Q90 62 60 65 Q30 65 12 58 Z" fill={P.sf} stroke={P.bd} strokeWidth="0.3"/>
            <path d="M20 20 Q30 30 40 25 Q50 20 60 30" fill="none" stroke={P.blu} strokeWidth="0.3" opacity="0.5"/>
            <path d="M10 55 Q30 50 50 52 Q70 54 95 50" fill="none" stroke={P.blu} strokeWidth="0.4" opacity="0.5"/>
            {DISTS.map(function(d){var s=distStat(d.n);return (<g key={d.n} onClick={function(){setSelDist(d.n);setPg("map");}} style={{cursor:"pointer"}}>
              <circle cx={d.x} cy={d.y} r={Math.max(3,Math.min(8,s.active*0.8+3))} fill={heatColor(s)+"40"} stroke={heatColor(s)} strokeWidth="0.5"/>
              <text x={d.x} y={d.y+1} fontSize="2.5" fill={P.ink} textAnchor="middle" fontWeight="700">{s.active}</text>
              <text x={d.x} y={d.y-5.5} fontSize="2" fill={P.dim} textAnchor="middle">{d.n}</text>
            </g>);})}
          </svg>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:6,fontSize:8,color:P.dim}}>
            <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:P.cr,marginRight:3}}/>Critical</span>
            <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:P.ac,marginRight:3}}/>Warning</span>
            <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:P.grn,marginRight:3}}/>Active</span>
            <span><span style={{display:"inline-block",width:7,height:7,borderRadius:4,background:P.dim,marginRight:3}}/>Quiet</span>
          </div>
        </Card>
      </div>
    ):(
      <div style={{marginTop:14}}>
        <Hd sub={"Your caseload · "+myCases().length+" total"} right={<Btn sm={true} ghost={true} c={P.ac} onClick={function(){setPg("cases");}}>All {"→"}</Btn>}>My Cases</Hd>
        <div style={{display:"flex",gap:5,marginBottom:8}}>{[{l:"Active",v:myCases().filter(function(q){return q.status==="in_progress"||q.status==="assigned";}).length,c:P.ac},{l:"Overdue",v:myCases().filter(function(q){return priorityScore(q,aLog).sla==="breach"&&q.status!=="resolved";}).length,c:P.cr},{l:"Done",v:myCases().filter(function(q){return q.status==="resolved";}).length,c:P.grn}].map(function(s,i){return (<div key={i} style={{flex:1,background:P.cd,border:"1px solid "+P.bd,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:9,color:P.dim,fontWeight:600}}>{s.l}</div></div>);})}</div>
        {myCases().slice(0,4).map(function(q){var ps=priorityScore(q,aLog);return (<button key={q.id} onClick={function(){setSelQ(q);setPg("qdet");}} style={{width:"100%",textAlign:"left",padding:8,borderRadius:7,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:4,display:"flex",gap:7}}><span style={{fontSize:14}}>{q.qi}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.qt==="incident"?q.type:q.scheme||q.type}</div><div style={{fontSize:8,color:ps.sla==="breach"?P.cr:P.dim}}>{q.district} {"·"} {ps.days}d {ps.sla==="breach"?"· OVERDUE":""}</div></div><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></button>);})}
        {myCases().length===0&&<Card><div style={{textAlign:"center",padding:16,color:P.dim,fontSize:11}}>No cases assigned to you yet</div></Card>}
      </div>
    )}
  </div>}

  {pg==="queue"&&<div style={{animation:"rise .3s"}}>
    <Hd sub={"Ranked · "+priorityQueue().length+" active"}>Priority Queue</Hd>
    {priorityQueue().map(function(q,idx){return (<button key={q.id} onClick={function(){setSelQ(q);setPg("qdet");}} style={{width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:9,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:6,display:"flex",gap:10,alignItems:"flex-start",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:q._p.sla==="breach"?P.cr:q._p.sla==="warning"?P.ac:q.urgency==="critical"?P.cr:P.grn}}/>
      <div style={{flexShrink:0,width:26,height:26,borderRadius:13,background:P.sf,border:"1px solid "+P.bd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:P.gold}}>{idx+1}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{q.qi} {q.qt==="incident"?q.type:q.scheme||q.type}</span><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></div>
        <div style={{fontSize:9,color:P.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(q.desc||"").slice(0,55)}</div>
        <div style={{display:"flex",gap:5,marginTop:3,fontSize:8,alignItems:"center"}}><span style={{color:P.dim}}>{q.district}</span><span style={{color:q._p.sla==="breach"?P.cr:q._p.sla==="warning"?P.ac:P.grn,fontWeight:700}}>{q._p.days}d</span>{q._p.sla==="breach"&&<Pill c={P.cr}>BREACH</Pill>}{q.urgency==="critical"&&<Pill c={P.cr}>CRIT</Pill>}<span style={{marginLeft:"auto",color:P.gold,fontSize:8}}>{q.assignedTo||"—"}</span></div>
      </div>
    </button>);})}
    {priorityQueue().length===0&&<Card><div style={{textAlign:"center",padding:20,color:P.dim}}>Queue is empty</div></Card>}
  </div>}

  {pg==="map"&&isSuper&&!selDist&&<div style={{animation:"rise .3s"}}>
    <Hd sub="Tap any district to drill down">District Intelligence</Hd>
    <Card pat={true}>
      <svg viewBox="0 0 100 70" style={{width:"100%",height:200}}>
        <path d="M10 40 Q15 15 40 12 Q65 8 85 18 Q98 25 95 50 Q90 62 60 65 Q30 65 12 58 Z" fill={P.sf} stroke={P.bd} strokeWidth="0.4"/>
        <path d="M20 20 Q30 30 40 25 Q50 20 60 30" fill="none" stroke={P.blu} strokeWidth="0.3" opacity="0.5"/>
        <path d="M10 55 Q30 50 50 52 Q70 54 95 50" fill="none" stroke={P.blu} strokeWidth="0.4" opacity="0.5"/>
        {DISTS.map(function(d){var s=distStat(d.n);return (<g key={d.n} onClick={function(){setSelDist(d.n);}} style={{cursor:"pointer"}}>
          <circle cx={d.x} cy={d.y} r={Math.max(4,Math.min(10,s.active*1+4))} fill={heatColor(s)+"50"} stroke={heatColor(s)} strokeWidth="0.6"/>
          {s.crit>0&&<circle cx={d.x} cy={d.y} r={Math.max(4,Math.min(10,s.active*1+4))+1.5} fill="none" stroke={P.cr} strokeWidth="0.4" opacity="0.6"/>}
          <text x={d.x} y={d.y+1} fontSize="3" fill={P.ink} textAnchor="middle" fontWeight="800">{s.active}</text>
          <text x={d.x} y={d.y-6} fontSize="2.3" fill={P.gold} textAnchor="middle" fontWeight="700">{d.n}</text>
        </g>);})}
      </svg>
    </Card>
    {DISTS.map(function(d){var s=distStat(d.n);return (<button key={d.n} onClick={function(){setSelDist(d.n);}} style={{width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:8,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:5,background:heatColor(s)}}/><span style={{fontSize:12,fontWeight:800,color:P.gold}}>{d.n}</span></div><div style={{fontSize:9,color:P.dim,marginTop:2}}>DLF: {s.dlf}</div></div>
      <div style={{display:"flex",gap:4}}><Pill c={P.ac}>{s.active} active</Pill>{s.overdue>0&&<Pill c={P.cr}>{s.overdue} over</Pill>}{s.crit>0&&<Pill c={P.cr}>{"\u{1F6A8}"}{s.crit}</Pill>}</div>
    </button>);})}
  </div>}
  {pg==="map"&&selDist&&(function(){var s=distStat(selDist);var dq=queries.filter(function(q){return q.district===selDist;}).map(function(q){return Object.assign({},q,{_p:priorityScore(q,aLog)});}).sort(function(a,b){return b._p.score-a._p.score;});return (<div style={{animation:"rise .25s"}}>
    <button onClick={function(){setSelDist(null);}} style={{background:"none",border:"none",color:P.ac,fontSize:11,cursor:"pointer",fontFamily:FN,fontWeight:700,marginBottom:6}}>{"←"} All Districts</button>
    <Card pat={true} s={{borderLeft:"3px solid "+heatColor(s)}}>
      <div style={{fontFamily:HD,fontSize:20,fontWeight:800,color:P.gold}}>{selDist}</div>
      <div style={{fontSize:10,color:P.dim,marginTop:2}}>DLF: {s.dlf}</div>
      <div style={{display:"flex",gap:5,marginTop:8}}>{[{l:"Total",v:s.total,c:P.gold},{l:"Active",v:s.active,c:P.ac},{l:"Overdue",v:s.overdue,c:P.cr},{l:"Critical",v:s.crit,c:P.cr}].map(function(x,i){return (<div key={i} style={{flex:1,background:P.sf,borderRadius:6,padding:8,textAlign:"center"}}><div style={{fontSize:17,fontWeight:900,color:x.c}}>{x.v}</div><div style={{fontSize:8,color:P.dim}}>{x.l}</div></div>);})}</div>
    </Card>
    <div style={{fontSize:11,color:P.dim,fontWeight:700,marginBottom:5,letterSpacing:0.5}}>QUERIES ({dq.length})</div>
    {dq.map(function(q){return (<button key={q.id} onClick={function(){setSelQ(q);setPg("qdet");}} style={{width:"100%",textAlign:"left",padding:8,borderRadius:7,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:4,display:"flex",gap:7}}><span style={{fontSize:13}}>{q.qi}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.qt==="incident"?q.type:q.scheme||q.type}</div><div style={{fontSize:8,color:P.dim}}>{q._p.days}d {"·"} {q.assignedTo||"unassigned"}</div></div><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></button>);})}
  </div>);})()}

  {pg==="cases"&&!isSuper&&<div style={{animation:"rise .3s"}}>
    <Hd sub={myCases().length+" cases"}>My Cases</Hd>
    <div style={{display:"flex",gap:5,marginBottom:10}}>{[{l:"Active",v:myCases().filter(function(q){return q.status==="in_progress"||q.status==="assigned";}).length,c:P.ac},{l:"New",v:myCases().filter(function(q){return q.status==="new"||!q.status;}).length,c:P.blu},{l:"Overdue",v:myCases().filter(function(q){return priorityScore(q,aLog).sla==="breach"&&q.status!=="resolved";}).length,c:P.cr},{l:"Done",v:myCases().filter(function(q){return q.status==="resolved"||q.status==="closed";}).length,c:P.grn}].map(function(s,i){return (<div key={i} style={{flex:1,background:P.cd,border:"1px solid "+P.bd,borderRadius:8,padding:"10px 4px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:8,color:P.dim}}>{s.l}</div></div>);})}</div>
    {myCases().map(function(q){var ps=priorityScore(q,aLog);var logs=aLog[q.id]||[];return (<button key={q.id} onClick={function(){setSelQ(q);setPg("qdet");}} style={{width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:8,border:"1px solid "+(ps.sla==="breach"?P.cr+"60":P.bd),background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:6,position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:800}}>{q.qi} {q.qt==="incident"?q.type:q.scheme||q.type}</span><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></div>
      <div style={{fontSize:10,color:P.dim,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.desc||""}</div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:8}}><span style={{color:P.dim}}>{q.district} {"·"} {logs.length} actions</span><span style={{color:ps.sla==="breach"?P.cr:ps.sla==="warning"?P.ac:P.grn,fontWeight:700}}>{ps.days}d{ps.sla==="breach"?" OVERDUE":""}</span></div>
    </button>);})}
    {myCases().length===0&&<Card><div style={{textAlign:"center",padding:20,color:P.dim,fontSize:11}}>No cases assigned yet</div></Card>}
  </div>}

  {pg==="qdet"&&selQ&&(function(){var q=selQ;var logs=aLog[q.id]||[];var ps=priorityScore(q,aLog);return (<div style={{animation:"rise .25s"}}>
    <button onClick={function(){setSelQ(null);setPg(isSuper?"queue":"cases");}} style={{background:"none",border:"none",color:P.ac,fontSize:11,cursor:"pointer",fontFamily:FN,fontWeight:700,marginBottom:6}}>{"←"} Back</button>
    <Card pat={true} s={{borderLeft:"3px solid "+SC[q.status||"new"]}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontFamily:HD,fontSize:16,fontWeight:800,color:P.gold}}>{q.qi} {q.qt==="incident"?q.type:q.scheme||q.type}</div><div style={{fontSize:9,color:P.dim,marginTop:2}}>ID: {q.id} · {fmt(q.createdAt||q.date)}</div></div><Pill c={SC[q.status||"new"]}>{q.status||"new"}</Pill></div>
      {q.desc&&<div style={{fontSize:11,color:P.ink,marginTop:8,lineHeight:1.5,background:P.sf,padding:9,borderRadius:6,borderLeft:"2px solid "+P.ac}}>{q.desc}</div>}
      <div style={{display:"flex",gap:5,marginTop:6,fontSize:10,color:P.dim,flexWrap:"wrap"}}>{q.name&&<span>{"\u{1F464}"} {q.name}</span>}{q.phone&&<span>{"\u{1F4DE}"} {q.phone}</span>}{q.district&&<span>{"\u{1F4CD}"} {q.district}</span>}</div>
      <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}><Pill c={ps.sla==="breach"?P.cr:ps.sla==="warning"?P.ac:P.grn}>{"⏱"} {ps.days}d</Pill>{ps.sla==="breach"&&<Pill c={P.cr}>SLA BREACH</Pill>}{q.urgency==="critical"&&<Pill c={P.cr}>CRITICAL</Pill>}{q.assignedTo&&<Pill c={P.ac}>{"→"} {q.assignedTo.split(" ")[0]}</Pill>}</div>
    </Card>

    <Card><div style={{fontSize:10,fontWeight:800,color:P.ac,marginBottom:5,letterSpacing:0.5}}>STATUS & ASSIGN</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["assigned","in_progress","resolved","closed"].map(function(s){return (<button key={s} onClick={async function(){await uQ(q.id,{status:s});await addLog(q.id,{action:"Status → "+s});}} style={{padding:"5px 9px",borderRadius:5,border:"1px solid "+SC[s]+"50",background:(q.status||"new")===s?SC[s]+"30":"transparent",color:SC[s],fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:FN}}>{s.replace("_"," ")}</button>);})}</div><select onChange={function(e){if(e.target.value){uQ(q.id,{assignedTo:e.target.value});addLog(q.id,{action:"Assigned to "+e.target.value});}}} value={q.assignedTo||""} style={{marginTop:5,fontSize:10}}><option value="">Assign...</option>{TEAM.map(function(t){return <option key={t.n} value={t.n}>{t.n} ({t.r})</option>;})}</select></Card>

    <Card s={{borderLeft:"3px solid "+P.cr+"60"}}><div style={{fontSize:10,fontWeight:800,color:P.cr,marginBottom:5,letterSpacing:0.5}}>{"\u{1F4E2}"} ESCALATE</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["Grave offence","Non-compliance","Victim at risk","Media attention"].map(function(r){return (<button key={r} onClick={function(){escQ(q.id,r);}} style={{padding:"4px 8px",borderRadius:4,border:"1px solid "+P.cr+"40",background:"transparent",color:P.cr,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:FN}}>{r}</button>);})}</div></Card>

    <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontSize:10,fontWeight:800,color:P.blu,letterSpacing:0.5}}>{"\u{1F916}"} AI ANALYSIS</span><Btn sm={true} c={P.blu} dis={aiL} onClick={function(){runAI(q);}}>{aiL?"...":"Analyze"}</Btn></div>{aiR&&!aiR.error&&<div style={{fontSize:10,lineHeight:1.5}}><div style={{display:"flex",gap:3,marginBottom:4,flexWrap:"wrap"}}><Pill c={aiR.priority==="critical"?P.cr:aiR.priority==="high"?P.ac:P.grn}>{aiR.priority}</Pill><Pill c={P.blu}>{aiR.category}</Pill>{aiR.sla_days&&<Pill c={P.ac}>SLA {aiR.sla_days}d</Pill>}</div>{(aiR.actions||[]).map(function(a,i){return (<div key={i} style={{padding:"4px 6px",background:P.sf,borderRadius:4,marginBottom:3,borderLeft:"2px solid "+P.grn,fontSize:10}}><b>{i+1}.</b> {a.action} <span style={{color:P.dim,fontSize:8}}>{a.assignee} · {a.days}d</span></div>);})}{(aiR.legal||[]).length>0&&<div style={{marginTop:4,fontSize:9}}><b style={{color:P.ac}}>Legal:</b> <span style={{color:P.dim}}>{aiR.legal.join(", ")}</span></div>}{(aiR.schemes||[]).length>0&&<div style={{fontSize:9}}><b style={{color:P.tl}}>Schemes:</b> <span style={{color:P.dim}}>{aiR.schemes.join(", ")}</span></div>}{aiR.risk&&<div style={{padding:5,background:P.cr+"12",borderRadius:4,color:P.cr,fontSize:9,marginTop:4}}>{"⚠️"} {aiR.risk}</div>}</div>}</Card>

    <Card><div style={{fontSize:10,fontWeight:800,color:P.grn,marginBottom:5,letterSpacing:0.5}}>{"\u{1F4DD}"} ACTION LOG ({logs.length})</div><div style={{display:"flex",gap:3,marginBottom:5}}><input id="logI" placeholder="Record action taken..." style={{flex:1,fontSize:10,padding:"6px 9px"}}/><Btn sm={true} c={P.grn} onClick={function(){var el=document.getElementById("logI");if(el&&el.value.trim()){addLog(q.id,{action:el.value});el.value="";}}}>Log</Btn></div>{logs.slice().reverse().map(function(l,i){return (<div key={i} style={{padding:"4px 0",borderBottom:"1px solid "+P.bd,fontSize:9}}><div style={{fontWeight:700,color:P.ink}}>{l.action}</div><div style={{color:P.dim,fontSize:8,marginTop:1}}>{l.by} · {fmt(l.date)}</div></div>);})}{logs.length===0&&<div style={{fontSize:9,color:P.dim,fontStyle:"italic",padding:6}}>No actions logged yet · accountability starts with logging</div>}</Card>

    <Card><div style={{fontSize:10,fontWeight:800,color:P.tl,marginBottom:5,letterSpacing:0.5}}>{"\u{1F4E8}"} COMMUNICATE</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}><Btn sm={true} c={P.grn} onClick={function(){window.open("https://wa.me/91"+(q.phone||"")+"?text="+encodeURIComponent("Janman JNA - Your query "+q.id+": "+(q.desc?q.desc.slice(0,60):q.scheme||"")+"\nStatus: "+(q.status||"under review")+"\nAssigned: "+(q.assignedTo||"our team")),"_blank");addLog(q.id,{action:"WhatsApp follow-up sent"});}}>WhatsApp</Btn><Btn sm={true} c={P.blu} onClick={function(){window.open("mailto:janman.justice@gmail.com?subject="+encodeURIComponent("[JNA] "+q.id),"_blank");}}>Email</Btn><Btn sm={true} c={P.pur} onClick={function(){window.open("https://wa.me/?text="+encodeURIComponent("\u{1F6A8} JNA ALERT "+q.id+"\n"+(q.desc?q.desc.slice(0,80):q.scheme||"")+"\n"+(q.district||"")+"\n@"+(q.assignedTo||"team")),"_blank");}}>Group</Btn></div></Card>

    <Card><div style={{fontSize:10,fontWeight:800,color:P.gold,marginBottom:5,letterSpacing:0.5}}>{"⚡"} ONE-TAP ACTIONS</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["Fact-Finding","FIR Draft","RTI Draft","Bail Draft","Legal Camp","Compensation","RTPS","Court Filing"].map(function(a){return (<button key={a} onClick={async function(){await addLog(q.id,{action:"\u{1F680} Initiated: "+a});if((q.status||"new")==="new"||q.status==="assigned")await uQ(q.id,{status:"in_progress"});}} style={{padding:"5px 9px",borderRadius:5,border:"1px solid "+P.bd,background:P.sf,color:P.ink,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:FN}}>{a}</button>);})}</div></Card>

    <Card><div style={{fontSize:10,fontWeight:800,color:P.pur,marginBottom:8,letterSpacing:0.5}}>{"\u{1F4CA}"} CASE LIFECYCLE</div><div style={{display:"flex",justifyContent:"space-between",position:"relative"}}><div style={{position:"absolute",top:10,left:14,right:14,height:2,background:P.bd}}/>{STAGES.map(function(st,i){var curIdx=q.status==="resolved"?7:q.status==="in_progress"?3:q.status==="assigned"?2:q.status==="escalated"?5:1;var active=i<=curIdx;return (<div key={st} style={{position:"relative",zIndex:1,textAlign:"center"}}><div style={{width:22,height:22,borderRadius:11,background:active?P.ac:P.bd,border:"2px solid "+(active?P.gold:P.bd),margin:"0 auto",fontSize:9,color:active?"#1A140D":P.dim,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div><div style={{fontSize:7,color:active?P.gold:P.dim,marginTop:2,fontWeight:700,width:40,lineHeight:1.1}}>{st}</div></div>);})}</div></Card>
  </div>);})()}

  {pg==="legal"&&!selMod&&<div style={{animation:"rise .3s"}}>
    <Hd sub="Vidhi AI · 20 modules · latest judgments">Legal Research</Hd>
    <Card pat={true} s={{borderLeft:"3px solid "+P.tl}}><div style={{fontSize:11,fontWeight:800,color:P.tl,marginBottom:5,letterSpacing:0.5}}>{"\u{1F52C}"} VIDHI AI</div><input value={rQ} onChange={function(e){setRQ(e.target.value);}} placeholder="Research any legal question..." style={{marginBottom:5}}/><Btn full={true} c={P.tl} dis={rL||!rQ.trim()} onClick={async function(){setRL(true);setRR(null);try{var text=await vidhiResearch("Vidhi AI for Bihar. Research: \""+rQ+"\". SCC Online, LiveLaw. BNS/BNSS 2023. Bihar-specific. Under 600 words.",1200);setRR(text||"No results.");}catch(e){setRR("Error: "+(e&&e.message||"failed"));}setRL(false);}}>{rL?"Researching...":"Research with Vidhi"}</Btn>{rR&&<div style={{marginTop:6,padding:10,background:P.sf,borderRadius:6,fontSize:10,lineHeight:1.6,maxHeight:260,overflowY:"auto",whiteSpace:"pre-wrap"}}>{rR}</div>}</Card>
    {MODS.map(function(m,i){return (<button key={i} onClick={function(){setSelMod(m);setRR(null);}} style={{width:"100%",textAlign:"left",padding:9,borderRadius:7,border:"1px solid "+P.bd,background:P.cd,cursor:"pointer",fontFamily:FN,marginBottom:4,display:"flex",justifyContent:"space-between"}}><div><span style={{fontSize:11,fontWeight:700}}>{i+1}. {m.t}</span><div style={{fontSize:8,color:P.dim,marginTop:1}}>{m.s.slice(0,60)}...</div></div><span style={{color:P.ac}}>{"→"}</span></button>);})}
  </div>}
  {pg==="legal"&&selMod&&<div style={{animation:"rise .3s"}}>
    <button onClick={function(){setSelMod(null);setRR(null);}} style={{background:"none",border:"none",color:P.ac,fontSize:11,cursor:"pointer",fontFamily:FN,fontWeight:700,marginBottom:6}}>{"←"} All</button>
    <div style={{fontFamily:HD,fontSize:20,fontWeight:800,color:P.gold,marginBottom:6}}>{selMod.t}</div>
    <Card s={{borderLeft:"3px solid "+P.tl}}><div style={{fontSize:11,lineHeight:1.5}}>{selMod.s}</div></Card>
    <Btn full={true} c={P.blu} dis={rL} onClick={async function(){setRL(true);setRR(null);try{var text=await vidhiResearch("Vidhi AI. LATEST (2024-2026) \""+selMod.t+"\". LiveLaw, SCC. Bihar-specific. Full SCC citations. Actionable.",1500);setRR(text||"No results.");}catch(e){setRR("Error");}setRL(false);}}>{rL?"...":"Latest Judgments (2024-2026)"}</Btn>
    {rR&&<Card s={{marginTop:6}}><pre style={{fontSize:10,lineHeight:1.6,whiteSpace:"pre-wrap",fontFamily:FN}}>{rR}</pre></Card>}
  </div>}

  {pg==="docs"&&<div style={{animation:"rise .3s"}}>
    <Hd sub="Paste legal doc · AI extracts parties, sections, drafts">Document AI</Hd>
    <Card><textarea value={docT} onChange={function(e){setDocT(e.target.value);}} rows={6} placeholder="Paste FIR, court order, petition, certificate..." style={{resize:"vertical",lineHeight:1.5}}/><div style={{marginTop:6}}><Btn full={true} c={P.blu} dis={aiL||!docT.trim()} onClick={function(){runDoc(docT);}}>{aiL?"Analyzing...":"Analyze"}</Btn></div></Card>
    {ocrR&&!ocrR.error&&<div>
      <Card><div style={{display:"flex",gap:4,marginBottom:5,flexWrap:"wrap"}}><Pill c={P.blu}>{ocrR.doc_type}</Pill></div>{ocrR.case_no&&<div style={{fontSize:11,marginBottom:3}}><b style={{color:P.ac}}>Case:</b> {ocrR.case_no}</div>}{ocrR.court&&<div style={{fontSize:11,marginBottom:3}}><b style={{color:P.ac}}>Court:</b> {ocrR.court}</div>}{ocrR.parties&&ocrR.parties.length>0&&<div style={{fontSize:11,marginBottom:3}}><b style={{color:P.ac}}>Parties:</b> {ocrR.parties.join(" v. ")}</div>}{ocrR.sections&&ocrR.sections.length>0&&<div style={{fontSize:11,marginBottom:3}}><b style={{color:P.ac}}>Sections:</b> {ocrR.sections.join(", ")}</div>}{ocrR.findings&&<div style={{background:P.sf,padding:8,borderRadius:5,fontSize:11,lineHeight:1.5,marginTop:5}}>{ocrR.findings}</div>}</Card>
      <Card><div style={{fontSize:10,fontWeight:800,color:P.grn,marginBottom:5}}>{"✍️"} DRAFTING SUGGESTIONS</div>{(ocrR.suggestions||[]).map(function(s,i){return (<div key={i} style={{padding:"5px 7px",background:P.sf,borderRadius:4,marginBottom:3,borderLeft:"2px solid "+P.grn,fontSize:10,lineHeight:1.5}}>{i+1}. {s}</div>);})}</Card>
      <Card><div style={{fontSize:10,fontWeight:800,color:P.pur,marginBottom:5}}>{"\u{1F4DD}"} NEXT STEPS</div>{(ocrR.next_steps||[]).map(function(s,i){return (<div key={i} style={{padding:"5px 7px",background:P.sf,borderRadius:4,marginBottom:3,borderLeft:"2px solid "+P.pur,fontSize:10}}>{"→"} {s}</div>);})}</Card>
    </div>}
    <Card><div style={{fontSize:10,fontWeight:800,color:P.ac,marginBottom:5}}>{"⚡"} QUICK TEMPLATES</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["Bail","HC Writ","Letter SP/DM","Fact-Finding","Representation","RTPS","Compensation","Affidavit","RTI","Notice"].map(function(t){return (<button key={t} onClick={function(){setDocT("Draft a "+t+" for: [describe case]\n\nDistrict:\nParties:\nFacts:\nRelief sought:");}} style={{padding:"5px 9px",borderRadius:5,border:"1px solid "+P.bd,background:P.sf,color:P.ink,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:FN}}>{t}</button>);})}</div></Card>
  </div>}

  </div>

  <div style={{display:"flex",background:P.sf,borderTop:"1px solid "+P.bd,position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:20}}>
    <div style={{position:"absolute",top:-1,left:0,right:0,height:3,backgroundImage:"url(\""+BORDER+"\")",backgroundRepeat:"repeat-x",backgroundSize:"100px 10px",opacity:0.5}}/>
    {nav.map(function(n){return (<button key={n.id} onClick={function(){setPg(n.id);setSelQ(null);setSelDist(null);setSelMod(null);}} style={{flex:1,padding:"10px 2px 7px",border:"none",cursor:"pointer",fontFamily:FN,fontSize:9,fontWeight:pg===n.id?800:500,textAlign:"center",background:pg===n.id?P.ac+"12":"transparent",color:pg===n.id?P.gold:P.dim,borderTop:pg===n.id?"2px solid "+P.gold:"2px solid transparent",transition:"all .2s",letterSpacing:0.3}}><div style={{fontSize:16,marginBottom:2}}>{n.ic}</div>{n.lb}</button>);})}</div>
</div>);
}
