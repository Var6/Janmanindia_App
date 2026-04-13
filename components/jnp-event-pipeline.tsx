// @ts-nocheck
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

const fmt=function(d){return d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";};
const uid=function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5);};
const td=function(){return new Date().toISOString().slice(0,10);};
async function sg(k: string){try{var r=await (window as any).storage.get(k);return r?JSON.parse(r.value):null;}catch(e){return null;}}
async function ss(k: string,v: unknown){try{await (window as any).storage.set(k,JSON.stringify(v));}catch(e){}}

function Card(props){return <div style={Object.assign({background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"18px 22px"},props.style||{})}>{props.children}</div>;}
function Sec(props){return <div style={Object.assign({fontSize:10,fontFamily:"'Playfair Display',serif",letterSpacing:2.5,textTransform:"uppercase",color:C.accent,marginBottom:12,opacity:.9},props.style||{})}>{props.children}</div>;}
function Badge(props){var m={amber:C.accent,red:C.red,green:C.green,blue:C.blue,purple:C.purple,teal:C.teal,gray:C.dim};var col=m[props.color||"amber"]||C.accent;return <span style={{background:col+"22",color:col,border:"1px solid "+col+"40",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{props.label}</span>;}
function Inp(props){return <div style={Object.assign({marginBottom:10},props.style||{})}>{props.label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{props.label}</label>}{props.rows?<textarea value={props.value} onChange={props.onChange} rows={props.rows} placeholder={props.placeholder||""} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>:<input type={props.type||"text"} value={props.value} onChange={props.onChange} placeholder={props.placeholder||""} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,boxSizing:"border-box"}}/>}</div>;}
function Sel(props){return <div style={{marginBottom:10}}>{props.label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{props.label}</label>}<select value={props.value} onChange={props.onChange} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5}}>{(props.options||[]).map(function(o){var v=o.value!==undefined?o.value:o;var l=o.label!==undefined?o.label:o;return <option key={v} value={v}>{l}</option>;})}</select></div>;}
function Btn(props){var bgs={accent:C.accent,red:C.red,green:C.green,blue:C.blue,purple:C.purple,teal:C.teal,ghost:"transparent"};var bg=bgs[props.color||"accent"]||C.accent;var tc=(props.color==="accent"||props.color==="green"||props.color==="teal")?"#000":C.text;var pd=props.size==="sm"?"5px 11px":props.size==="lg"?"13px 28px":"8px 18px";return <button onClick={props.onClick} disabled={props.disabled} style={Object.assign({background:props.disabled?C.muted:bg,color:props.disabled?C.dim:tc,border:props.color==="ghost"?"1px solid "+C.border:"none",borderRadius:7,padding:pd,fontSize:props.size==="sm"?11:13,fontWeight:700,cursor:props.disabled?"not-allowed":"pointer"},props.style||{})}>{props.children}</button>;}

export default function JnpEventPipeline(){
  var [step,setStep]=useState(0);
  var [events,setEvents]=useState([]);
  var [recipTab,setRecipTab]=useState("social");
  var [conceptNote,setConceptNote]=useState("");
  var [agendaText,setAgendaText]=useState("");
  var [speakers,setSpeakers]=useState("");
  var [socialMedia,setSocialMedia]=useState("");
  var [formalInvite,setFormalInvite]=useState("");
  var [checklist,setChecklist]=useState([]);
  var [logistics,setLogistics]=useState({});
  var [reportFmt,setReportFmt]=useState("");
  var [postEventSocial,setPostEventSocial]=useState("");
  var [actionPoints,setActionPoints]=useState("");
  var [calMsg,setCalMsg]=useState("");
  var [emailMsg,setEmailMsg]=useState("");
  var [ganttVisible,setGanttVisible]=useState(false);
  var [postNotes,setPostNotes]=useState("");
  var [attendance,setAttendance]=useState("");
  var [keyHighlights,setKeyHighlights]=useState("");
  var [meetingDate,setMeetingDate]=useState(td());
  var [meetingTime,setMeetingTime]=useState("11:00");
  var [meetingAttendees,setMeetingAttendees]=useState([]);
  var [meetingAgenda,setMeetingAgenda]=useState("");
  var [inviteName,setInviteName]=useState("");
  var [inviteDesig,setInviteDesig]=useState("");
  var [inviteEmail,setInviteEmail]=useState("");
  var [inviteOrg,setInviteOrg]=useState("");
  var [loadingKeys,setLoadingKeys]=useState({});
  var [setup,setSetup]=useState({role:"Program Manager",project:"p1",eventType:"Legal Aid Camp",eventTitle:"",location:"",district:"Purnia",date:td(),endDate:"",coordinator:"Shashwat",budget:"",objectives:"",themes:[],orgsToLearnFrom:[],issues:"",acts:"",constitutional:"",targetAudience:"",expectedParticipants:"",specialGuests:""});

  useEffect(function(){sg("jnp_ev").then(function(d){if(d)setEvents(d);});},[]); 
  useEffect(function(){ss("jnp_ev",events);},[events]);

  var selProject=PROJECTS.find(function(p){return p.id===setup.project;})||PROJECTS[0];

  function setLoad(k,v){setLoadingKeys(function(p){var n=Object.assign({},p);n[k]=v;return n;});}
  function isLoading(k){return !!loadingKeys[k];}

  function updSetup(k,v){setSetup(function(p){var n=Object.assign({},p);n[k]=v;return n;});}
  function toggleTheme(t){setSetup(function(p){var themes=p.themes.includes(t)?p.themes.filter(function(x){return x!==t;}):[...p.themes,t];return Object.assign({},p,{themes:themes});});}
  function toggleOrg(o){setSetup(function(p){var orgs=p.orgsToLearnFrom.includes(o)?p.orgsToLearnFrom.filter(function(x){return x!==o;}):[...p.orgsToLearnFrom,o];return Object.assign({},p,{orgsToLearnFrom:orgs});});}
  function toggleAttendee(name){setMeetingAttendees(function(p){return p.includes(name)?p.filter(function(x){return x!==name;}):[...p,name];});}
  function toggleCheckDone(i){setChecklist(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{done:!x.done}):x;});});}

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
    var r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
    var d=await r.json();
    return (d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error generating content.";
  }

  async function genConceptNote(){
    setLoad("cn",true);
    try{
      var txt=await callAI("Generate a comprehensive concept note for this event. Learn from: "+setup.orgsToLearnFrom.join(", ")+" and other access-to-justice organisations in India.\n\n"+eventCtx()+"\n\nStructure:\n1. TITLE AND DATE\n2. BACKGROUND AND CONTEXT (Bihar-specific, constitutional grounding)\n3. OBJECTIVES (3-5 specific)\n4. METHODOLOGY AND FORMAT (creative, participatory, inspired by peoples movements)\n5. PROGRAMME OUTLINE (time-by-time)\n6. EXPECTED OUTCOMES\n7. TARGET PARTICIPANTS AND OUTREACH PLAN\n8. LEGAL AND CONSTITUTIONAL GROUNDING\n9. CREATIVE ELEMENTS (art, theatre, storytelling if applicable)\n10. RESOURCE REQUIREMENTS\n11. ORGANISING COMMITTEE\n\nBe creative, draw inspiration from Jan Sunwais, Nukkad Nataks, public hearings, community mobilisation used by NAPM, HRLN, PUCL, Right to Food Campaign.");
      setConceptNote(txt);
    }catch(e){setConceptNote("Error generating concept note.");}
    setLoad("cn",false);
  }

  async function genAgenda(){
    setLoad("agenda",true);
    try{
      var txt=await callAI("Design a detailed, creative, time-by-time agenda for this event. Include welcome, context-setting, interactive sessions, survivor testimonies, legal knowledge sessions, participatory exercises, breaks, cultural moments, and valedictory.\n\n"+eventCtx()+"\n\nFormat each item as:\n[TIME] | [DURATION] | [SESSION TITLE] | [FACILITATOR] | [FORMAT/METHOD]\n\nInclude creative session ideas inspired by PUCL, HRLN, NAPM approaches. End with vote of thanks and next steps.");
      setAgendaText(txt);
    }catch(e){setAgendaText("Error generating agenda.");}
    setLoad("agenda",false);
  }

  async function genSpeakers(){
    setLoad("speakers",true);
    try{
      var txt=await callAI("Suggest resource persons, speakers, and chief guest for this event. Include senior advocates, academics, activists, government officials, survivors, community members.\n\n"+eventCtx()+"\n\nFor each person suggest: Name, Designation / Organisation, Why relevant, Area of expertise, Suggested session or role, How to approach them.\n\nInclude senior figures (for credibility) and grassroots voices (for authenticity). Focus on themes: "+setup.themes.join(", ")+".");
      setSpeakers(txt);
    }catch(e){setSpeakers("Error generating speaker suggestions.");}
    setLoad("speakers",false);
  }

  async function genSocial(){
    setLoad("social",true);
    try{
      var txt=await callAI("Create a complete social media campaign kit for this event. Organisation: Janman Peoples Foundation, Jan Nyaya Abhiyan, Bihar.\n\n"+eventCtx()+"\n\nGenerate:\n\n1. PRE-EVENT CAMPAIGN (1 week before)\n   - 3 WhatsApp broadcast messages (Hindi, sharable)\n   - 2 Facebook posts (Hindi + English)\n   - 2 Instagram captions with hashtags\n   - 1 Twitter/X thread (5 tweets)\n\n2. EVENT DAY POSTS\n   - 2 live update posts (Hindi + English)\n   - 1 photographic post caption template\n\n3. INVITE GRAPHIC BRIEF\n   - What should appear on the invite poster\n   - Colour scheme suggestion\n   - Key text elements\n\n4. RECOMMENDED HASHTAGS (5-7)\n\nMake language powerful, movement-inspired, constitutionally grounded.");
      setSocialMedia(txt);
    }catch(e){setSocialMedia("Error generating social media kit.");}
    setLoad("social",false);
  }

  async function genInvite(){
    setLoad("invite",true);
    try{
      var txt=await callAI("Draft a formal invitation letter from Janman Peoples Foundation / Jan Nyaya Abhiyan to a resource person / speaker / chief guest.\n\n"+eventCtx()+"\n\nRECIPIENT:\nName: "+(inviteName||"[Name]")+"\nDesignation: "+(inviteDesig||"[Designation]")+"\nOrganisation: "+(inviteOrg||"[Organisation]")+"\n\nThe letter should:\n- Warmly but formally invite them to speak\n- Describe their specific role / session\n- Note the significance of the event and theme\n- Mention logistic details (date, venue, travel / accommodation support)\n- Explain why their expertise is particularly relevant\n- Request RSVP by a specific date\n- Be signed by "+setup.coordinator+" in the role of "+setup.role+"\n\nMake it compelling, they should feel honoured and motivated to attend.");
      setFormalInvite(txt);
    }catch(e){setFormalInvite("Error generating invite.");}
    setLoad("invite",false);
  }

  async function sendInviteEmail(){
    setEmailMsg("Sending...");
    try{
      var body="Send an email using Gmail. To: "+inviteEmail+". Subject: Invitation to Speak at "+setup.eventTitle+" | Janman Peoples Foundation. Body:\n\n"+formalInvite;
      await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:body}]})});
      setEmailMsg("Invitation sent via Gmail!");
    }catch(e){setEmailMsg("Email dispatch failed.");}
    setTimeout(function(){setEmailMsg("");},5000);
  }

  async function genChecklist(){
    setLoad("cl",true);
    try{
      var txt=await callAI("Create a comprehensive to-do checklist with timeline for this event. Assign to team. Include every detail from 4 weeks before to post-event follow-up.\n\n"+eventCtx()+"\nTEAM: "+TEAM.slice(0,6).join(", ")+"\n\nReturn ONLY a JSON array with items: [{\"task\":\"...\",\"category\":\"...\",\"assignee\":\"...\",\"deadline\":\"YYYY-MM-DD\",\"priority\":\"high/medium/low\",\"notes\":\"...\"}]\n\nCategories: Venue and Setup, Stationery and Materials, Food and Refreshments, Invitations and Calling, Photography and Videography, Social Media Communications, Travel and Accommodation, AV and Equipment, Documentation, Follow-up Actions");
      try{
        var arr=JSON.parse(txt.replace(/```json|```/g,"").trim());
        setChecklist(arr);
      }catch(pe){
        setChecklist([
          {task:"Book venue and confirm logistics",category:"Venue and Setup",assignee:"Roshin Jacob",deadline:setup.date,priority:"high",notes:""},
          {task:"Print materials and stationery",category:"Stationery and Materials",assignee:"Sachina",deadline:setup.date,priority:"high",notes:""},
          {task:"Send formal invitations to resource persons",category:"Invitations and Calling",assignee:setup.coordinator,deadline:setup.date,priority:"high",notes:""},
          {task:"Create social media posts for event promotion",category:"Social Media Communications",assignee:"Roshin Jacob",deadline:setup.date,priority:"medium",notes:""},
          {task:"Arrange photography and videography",category:"Photography and Videography",assignee:"Prakash Kumar",deadline:setup.date,priority:"medium",notes:""},
          {task:"Prepare event report format",category:"Documentation",assignee:setup.coordinator,deadline:setup.date,priority:"medium",notes:""},
          {task:"Arrange food and refreshments",category:"Food and Refreshments",assignee:"Sachina",deadline:setup.date,priority:"medium",notes:""},
          {task:"Test AV equipment",category:"AV and Equipment",assignee:"Roshin Jacob",deadline:setup.date,priority:"medium",notes:""},
        ]);
      }
    }catch(e){setChecklist([]);}
    setLoad("cl",false);
  }

  async function genLogistics(){
    setLoad("log",true);
    try{
      var txt=await callAI("Create a detailed logistics checklist for this event. Budget: Rs "+setup.budget+"\n\n"+eventCtx()+"\n\nReturn ONLY a JSON object: {\"Venue and Setup\":[{\"item\":\"name\",\"qty\":\"...\",\"person\":\"...\",\"cost\":\"...\",\"status\":\"pending\"}],...}\n\nCover: Venue and Setup, Stationery and Materials, Food and Refreshments, Photography and Videography, AV and Equipment, Travel and Accommodation, Printing, Communication.");
      try{
        var obj=JSON.parse(txt.replace(/```json|```/g,"").trim());
        setLogistics(obj);
      }catch(pe){
        setLogistics({"Venue and Setup":[{item:"Venue booking",qty:"1",person:setup.coordinator,cost:"As per venue",status:"pending"},{item:"Chairs and tables",qty:"As needed",person:"Roshin Jacob",cost:"Included in venue",status:"pending"}],"Stationery and Materials":[{item:"Registers and pens",qty:"50",person:"Sachina",cost:"Rs 500",status:"pending"},{item:"Folders and documents",qty:"50",person:"Sachina",cost:"Rs 1500",status:"pending"}]});
      }
    }catch(e){setLogistics({});}
    setLoad("log",false);
  }

  async function sendReminders(){
    setEmailMsg("Sending reminders...");
    var pending=checklist.filter(function(item){return !item.done;});
    var lines=pending.map(function(item){return "Task: "+item.task+" | Assignee: "+item.assignee+" | Deadline: "+item.deadline+" | Priority: "+item.priority;}).join("\n");
    var body="Send an email using Gmail. To: sshashwat8@gmail.com. Subject: Reminder — Event Preparation Tasks for "+setup.eventTitle+". Body:\n\nDear Team,\n\nThis is a reminder for pending tasks for: "+setup.eventTitle+" on "+fmt(setup.date)+" at "+setup.location+".\n\nPENDING TASKS:\n"+lines+"\n\nPlease ensure all tasks are completed by the deadline.\n\nRegards,\n"+setup.coordinator+"\n"+setup.role+"\nJanman Peoples Foundation";
    try{
      await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:body}]})});
      setEmailMsg("Reminder emails sent via Gmail!");
    }catch(e){setEmailMsg("Email dispatch failed.");}
    setTimeout(function(){setEmailMsg("");},5000);
  }

  async function scheduleMeeting(){
    setCalMsg("Scheduling meeting...");
    var desc="Planning meeting for: "+setup.eventTitle+" ("+setup.eventType+")\nProject: "+selProject.name+"\nEvent Date: "+setup.date+"\nAgenda: "+meetingAgenda+"\nAttendees: "+meetingAttendees.join(", ")+"\nOrganiser: "+setup.coordinator;
    try{
      var r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gcal.mcp.claude.com/mcp",name:"gcal"}],messages:[{role:"user",content:"Create a Google Calendar event on primary calendar. Title: Planning Meeting for "+setup.eventTitle+". Date: "+meetingDate+", time "+meetingTime+" IST, duration 1.5 hours. Description: "+desc}]})});
      var d=await r.json();
      var txt=(d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
      setCalMsg(txt.toLowerCase().indexOf("created")>=0||txt.toLowerCase().indexOf("event")>=0?"Meeting scheduled in Google Calendar!":"Meeting scheduling requested.");
    }catch(e){setCalMsg("Calendar sync failed.");}
    setTimeout(function(){setCalMsg("");},5000);
  }

  async function genReportFmt(){
    setLoad("report",true);
    try{
      var txt=await callAI("Create a comprehensive event report template AND verbatim transcription format for this event. Both ready to fill after the event.\n\n"+eventCtx()+"\n\n1. EVENT REPORT TEMPLATE\n   - Event summary table (name, date, venue, attendance by category)\n   - Executive summary\n   - Objectives vs Outcomes\n   - Session-by-session summary table\n   - Key discussions and debates\n   - Resolutions / Declarations passed\n   - Cases / issues identified for follow-up\n   - Participant feedback summary\n   - Media coverage\n   - Financial summary\n   - Action points table (responsible persons and deadlines)\n   - Annexures checklist\n   - Sign-off section\n\n2. TRANSCRIPTION FORMAT\n   - Speaker-wise transcript template\n   - Q&A transcript template\n   - Community testimony recording format\n   - Key quotes extraction format");
      setReportFmt(txt);
    }catch(e){setReportFmt("Error generating report format.");}
    setLoad("report",false);
  }

  async function genPostEventSocial(){
    setLoad("pSocial",true);
    var ctx=eventCtx()+"\nATTENDANCE: "+attendance+"\nKEY HIGHLIGHTS: "+keyHighlights+"\nPOST-EVENT NOTES: "+postNotes;
    try{
      var txt=await callAI("The event has concluded. Generate post-event social media communications.\n\n"+ctx+"\n\n1. WRAP-UP POSTS\n   - 2 Facebook posts (Hindi + English)\n   - 2 Instagram captions with emoji\n   - 1 Twitter/X thread (5 tweets) with key takeaways\n   - 1 WhatsApp broadcast (Hindi summary)\n\n2. KEY TAKEAWAYS DOCUMENT\n   - 5-7 bullet key takeaways\n   - 1 paragraph summary for newsletter or annual report\n\n3. FOLLOW-UP COMMUNICATIONS\n   - Thank you message to speakers\n   - Follow-up message to participants\n   - Message to community about next steps\n\n4. REPORT TEASER for social media when full report is published");
      setPostEventSocial(txt);
    }catch(e){setPostEventSocial("Error generating post-event social media.");}
    setLoad("pSocial",false);
  }

  async function genActionPoints(){
    setLoad("actions",true);
    var ctx=eventCtx()+"\nATTENDANCE: "+attendance+"\nKEY HIGHLIGHTS: "+keyHighlights+"\nPOST-EVENT NOTES: "+postNotes;
    try{
      var txt=await callAI("Based on this event's outcomes, generate a comprehensive Action Points, Way Forward, and Analysis document.\n\n"+ctx+"\n\n1. IMMEDIATE ACTION POINTS (within 1 week)\n   Table: Action | Responsible | Deadline | Resources Needed\n\n2. SHORT-TERM FOLLOW-UP (1 month)\n   - Cases to file, representations to submit, meetings to schedule, reports to produce\n\n3. MEDIUM-TERM PLAN (3-6 months)\n   - Strategic litigation potential, community mobilisation next steps, PLV deployment, policy advocacy\n\n4. ANALYSIS AND WAY FORWARD\n   - What worked well, gaps and challenges, lessons learned, recommendations for future events, systemic issues requiring legal intervention\n\n5. REPORTING TO FUNDER (APPI)\n   - How this event contributes to Grant No. "+selProject.grant+" outcomes\n   - Data points for annual report, SDG 16 linkages");
      setActionPoints(txt);
    }catch(e){setActionPoints("Error generating action points.");}
    setLoad("actions",false);
  }

  function saveEvent(){
    var evt={id:uid(),setup:Object.assign({},setup),conceptNote:conceptNote,agendaText:agendaText,speakers:speakers,socialMedia:socialMedia,checklist:checklist.slice(),reportFmt:reportFmt,createdAt:td(),status:"planning"};
    setEvents(function(p){return [...p,evt];});
  }

  function Output(props){
    return <Card style={{marginBottom:13}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <Sec style={{marginBottom:0}}>{props.title}</Sec>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
          {props.extra}
          {props.content&&<Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(props.content);}}>Copy</Btn>}
          <Btn size="sm" color="accent" onClick={props.onGen} disabled={isLoading(props.loadKey)}>{isLoading(props.loadKey)?"Generating...":"Generate with AI"}</Btn>
        </div>
      </div>
      {props.content?<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:420,overflowY:"auto"}}>{props.content}</pre>:<div style={{fontSize:12,color:C.dim,padding:"12px 0"}}>Click "Generate with AI" to create this document from your event brief.</div>}
    </Card>;
  }

  var doneCount=checklist.filter(function(c){return c.done;}).length;
  var pctDone=checklist.length>0?Math.round(doneCount/checklist.length*100):0;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}select,input,textarea{outline:none;color-scheme:dark;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#1C2B46;border-radius:3px;}"}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid "+C.border,padding:"0 22px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:C.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🎯</div>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:C.text}}>Event Planning AI Pipeline</span>
          <span style={{fontSize:10,color:C.muted}}>Jan Sahayak Pro · Janman Peoples Foundation</span>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <Badge label={events.length+" events saved"} color="purple"/>
          <Btn size="sm" color="ghost" onClick={function(){setStep(0);setConceptNote("");setAgendaText("");setSpeakers("");setSocialMedia("");setFormalInvite("");setChecklist([]);setLogistics({});setReportFmt("");setPostEventSocial("");setActionPoints("");setSetup({role:"Program Manager",project:"p1",eventType:"Legal Aid Camp",eventTitle:"",location:"",district:"Purnia",date:td(),endDate:"",coordinator:"Shashwat",budget:"",objectives:"",themes:[],orgsToLearnFrom:[],issues:"",acts:"",constitutional:"",targetAudience:"",expectedParticipants:"",specialGuests:""});}}>+ New Event</Btn>
        </div>
      </div>

      <div style={{display:"flex",gap:0}}>
        {/* SIDEBAR */}
        <div style={{width:190,borderRight:"1px solid "+C.border,minHeight:"calc(100vh - 52px)",padding:"16px 14px",flexShrink:0}}>
          <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Pipeline Steps</div>
          {STEPS.map(function(s,i){return(
            <button key={i} onClick={function(){setStep(i);}} style={{width:"100%",textAlign:"left",padding:"7px 9px",borderRadius:7,border:"none",background:step===i?C.accentSoft:"transparent",color:step===i?C.accent:C.dim,fontSize:11,fontWeight:step===i?700:400,cursor:"pointer",marginBottom:3,display:"flex",alignItems:"center",gap:7}}>
              <span style={{width:19,height:19,borderRadius:"50%",background:step===i?C.accent:i<step?C.green+"22":C.muted+"22",color:step===i?"#000":i<step?C.green:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{i<step?"✓":i+1}</span>
              {s}
            </button>
          );})}
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
            {events.slice().reverse().map(function(e){return(
              <div key={e.id} style={{padding:"7px 0",borderBottom:"1px solid "+C.border+"20"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.text,lineHeight:1.3}}>{e.setup.eventTitle}</div>
                <div style={{fontSize:10,color:C.dim}}>{fmt(e.setup.date)}</div>
              </div>
            );})}
          </div>}
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,padding:"20px 26px",maxWidth:1100,overflowY:"auto"}}>

          {/* STEP 0: SETUP */}
          {step===0&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Event Setup</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:16}}>Define the event, assign a role, select a project, and set the foundation for AI-assisted planning.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <Sec>Role, Project & Event</Sec>
                <Sel label="Your Role" value={setup.role} onChange={function(e){updSetup("role",e.target.value);}} options={ROLES}/>
                <Sel label="Project" value={setup.project} onChange={function(e){updSetup("project",e.target.value);}} options={PROJECTS.map(function(p){return {value:p.id,label:p.name};})}/>
                <div style={{background:C.surface,borderRadius:8,padding:"9px 11px",marginBottom:10,fontSize:11}}>
                  <div style={{fontWeight:600,color:C.text,marginBottom:2}}>{selProject.name}</div>
                  <div style={{color:C.dim}}>Grant: {selProject.grant}</div>
                  <div style={{color:C.dim}}>Budget: Rs {(selProject.budget/1e5).toFixed(0)}L · {selProject.start} to {selProject.end}</div>
                </div>
                <Sel label="Event Type" value={setup.eventType} onChange={function(e){updSetup("eventType",e.target.value);}} options={EVENT_TYPES}/>
                <Inp label="Event Title" value={setup.eventTitle} onChange={function(e){updSetup("eventTitle",e.target.value);}} placeholder="e.g. State-level Consultation on GBV and Access to Justice in Bihar"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Event Date" type="date" value={setup.date} onChange={function(e){updSetup("date",e.target.value);}}/>
                  <Inp label="End Date (multi-day)" type="date" value={setup.endDate} onChange={function(e){updSetup("endDate",e.target.value);}}/>
                </div>
                <Inp label="Location / Venue" value={setup.location} onChange={function(e){updSetup("location",e.target.value);}} placeholder="e.g. Hotel Chanakya, Patna"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="District" value={setup.district} onChange={function(e){updSetup("district",e.target.value);}}/>
                  <Inp label="Event Budget (Rs)" value={setup.budget} onChange={function(e){updSetup("budget",e.target.value);}} placeholder="e.g. 70000"/>
                </div>
                <Sel label="Event Coordinator" value={setup.coordinator} onChange={function(e){updSetup("coordinator",e.target.value);}} options={TEAM}/>
              </Card>
              <Card>
                <Sec>Brief & Context</Sec>
                <Inp label="Event Objectives" value={setup.objectives} onChange={function(e){updSetup("objectives",e.target.value);}} rows={2} placeholder="What do you want to achieve? What change will this catalyse?"/>
                <Inp label="Key Issues to Address" value={setup.issues} onChange={function(e){updSetup("issues",e.target.value);}} rows={2} placeholder="e.g. Police inaction in GBV cases, denial of MGNREGS wages, SC/ST atrocities in Seemanchal..."/>
                <Inp label="Relevant Acts and Laws" value={setup.acts} onChange={function(e){updSetup("acts",e.target.value);}} placeholder="e.g. PWDVA 2005, POCSO 2012, SC/ST Atrocities Act, NFSA, BNSS..."/>
                <Inp label="Constitutional Provisions" value={setup.constitutional} onChange={function(e){updSetup("constitutional",e.target.value);}} placeholder="e.g. Articles 14, 15, 17, 21, 21A, 32, 39A, 300A..."/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Target Audience" value={setup.targetAudience} onChange={function(e){updSetup("targetAudience",e.target.value);}} placeholder="e.g. Survivors, PLVs, lawyers, officials..."/>
                  <Inp label="Expected Participants" value={setup.expectedParticipants} onChange={function(e){updSetup("expectedParticipants",e.target.value);}} placeholder="e.g. 60-80"/>
                </div>
                <Inp label="Special Guests / Chief Guest" value={setup.specialGuests} onChange={function(e){updSetup("specialGuests",e.target.value);}} placeholder="e.g. District Judge, SP, DLSA Secretary..."/>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Themes</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {THEMES.map(function(t){var sel=setup.themes.includes(t);return <button key={t} onClick={function(){toggleTheme(t);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.accent+"55":C.border),background:sel?C.accentSoft:"transparent",color:sel?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{t}</button>;})}
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Learn From These Organisations</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {ORGS.map(function(o){var sel=setup.orgsToLearnFrom.includes(o);return <button key={o} onClick={function(){toggleOrg(o);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.purple+"55":C.border),background:sel?"rgba(155,114,207,0.1)":"transparent",color:sel?C.purple:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{o}</button>;})}
                  </div>
                </div>
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:13}}>
              <Btn color="accent" size="lg" onClick={function(){setStep(1);}} disabled={!setup.eventTitle.trim()}>{setup.eventTitle.trim()?"Next: Brief and Design →":"Enter Event Title to Continue"}</Btn>
            </div>
          </div>}

          {/* STEP 1: BRIEF & DESIGN */}
          {step===1&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Event Brief and AI Design</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate concept note, agenda and speaker suggestions — informed by your brief and inspired by leading access-to-justice organisations.</div>
            <div style={{background:C.surface,borderRadius:9,padding:"11px 14px",marginBottom:14,border:"1px solid "+C.border+"55"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[["Title",setup.eventTitle],["Type",setup.eventType],["Date",fmt(setup.date)],["Location",setup.location+", "+setup.district],["Coordinator",setup.coordinator],["Budget","Rs "+setup.budget],["Participants",setup.expectedParticipants],["Themes",setup.themes.slice(0,2).join(", ")+(setup.themes.length>2?"...":"")]].map(function(item){return <div key={item[0]} style={{background:C.card,borderRadius:7,padding:"7px 9px"}}><div style={{fontSize:9,color:C.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:.6}}>{item[0]}</div><div style={{fontSize:11,color:C.text,fontWeight:600,lineHeight:1.4}}>{item[1]||"—"}</div></div>;})}
              </div>
            </div>
            <Output title="Concept Note" content={conceptNote} loadKey="cn" onGen={genConceptNote}/>
            <Output title="Detailed Agenda (Time-by-Time)" content={agendaText} loadKey="agenda" onGen={genAgenda}/>
            <Output title="Speaker and Resource Person Suggestions" content={speakers} loadKey="speakers" onGen={genSpeakers}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={function(){setStep(0);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(2);}}>Next: Communications</Btn></div>
          </div>}

          {/* STEP 2: COMMUNICATIONS */}
          {step===2&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Communications and Invitations</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate social media kits and formal invitations for the event.</div>
            <div style={{display:"flex",gap:5,marginBottom:13}}>
              {["social","invite"].map(function(t){return <button key={t} onClick={function(){setRecipTab(t);}} style={{padding:"6px 14px",borderRadius:7,border:"none",background:recipTab===t?C.accentSoft:"transparent",color:recipTab===t?C.accent:C.dim,fontSize:12,fontWeight:recipTab===t?700:400,cursor:"pointer"}}>{t==="social"?"Social Media Campaign Kit":"Formal Invite Generator"}</button>;})}
            </div>
            {recipTab==="social"&&<Output title="Social Media Campaign Kit (Pre-Event, Event Day, Post)" content={socialMedia} loadKey="social" onGen={genSocial}/>}
            {recipTab==="invite"&&<div>
              <Card style={{marginBottom:13}}>
                <Sec>Recipient Details</Sec>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Recipient Name" value={inviteName} onChange={function(e){setInviteName(e.target.value);}} placeholder="e.g. Justice Abhay S. Oka"/>
                  <Inp label="Designation" value={inviteDesig} onChange={function(e){setInviteDesig(e.target.value);}} placeholder="e.g. Judge, Supreme Court of India"/>
                  <Inp label="Organisation" value={inviteOrg} onChange={function(e){setInviteOrg(e.target.value);}} placeholder="e.g. Supreme Court of India"/>
                  <Inp label="Email Address" value={inviteEmail} onChange={function(e){setInviteEmail(e.target.value);}} placeholder="recipient@email.com"/>
                </div>
              </Card>
              <Output title="Formal Invitation Letter" content={formalInvite} loadKey="invite" onGen={genInvite}
                extra={formalInvite&&inviteEmail?<Btn size="sm" color="blue" onClick={sendInviteEmail}>Send via Gmail</Btn>:null}/>
              {emailMsg&&<div style={{fontSize:12,color:C.accent,padding:"7px 11px",background:C.accentSoft,borderRadius:7,marginBottom:10}}>{emailMsg}</div>}
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={function(){setStep(1);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(3);}}>Next: Logistics</Btn></div>
          </div>}

          {/* STEP 3: LOGISTICS */}
          {step===3&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Logistics and Checklist</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>AI-generated to-do checklist with timeline and assignees, plus full logistics breakdown.</div>
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:14}}>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>To-Do Checklist ({doneCount}/{checklist.length})</Sec>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    {emailMsg&&<div style={{fontSize:10,color:C.accent,padding:"3px 8px",background:C.accentSoft,borderRadius:5}}>{emailMsg}</div>}
                    {checklist.length>0&&<Btn size="sm" color="blue" onClick={sendReminders}>Send Reminders</Btn>}
                    <Btn size="sm" color="accent" onClick={genChecklist} disabled={isLoading("cl")}>{isLoading("cl")?"Generating...":"Generate with AI"}</Btn>
                  </div>
                </div>
                {checklist.length>0&&<div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:pctDone+"%",background:C.green,borderRadius:2}}/></div>}
                {checklist.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate with AI" to create a comprehensive checklist from your event brief.</div>}
                {checklist.map(function(item,i){return(
                  <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}>
                    <input type="checkbox" checked={item.done||false} onChange={function(){toggleCheckDone(i);}} style={{marginTop:3,accentColor:C.accent,flexShrink:0}}/>
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
                  </div>
                );})}
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>Logistics Breakdown</Sec>
                  <Btn size="sm" color="accent" onClick={genLogistics} disabled={isLoading("log")}>{isLoading("log")?"Generating...":"Generate"}</Btn>
                </div>
                {Object.keys(logistics).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate" to create a logistics breakdown.</div>}
                {Object.keys(logistics).map(function(cat){return(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.7}}>{cat}</div>
                    {(logistics[cat]||[]).map(function(item,i){return(
                      <div key={i} style={{display:"flex",gap:7,padding:"5px 8px",background:C.surface,borderRadius:6,marginBottom:3}}>
                        <div style={{flex:1,fontSize:11,color:C.text}}>{item.item}</div>
                        <div style={{fontSize:10,color:C.dim}}>{item.qty}</div>
                        <div style={{fontSize:10,color:C.accent}}>{item.cost}</div>
                      </div>
                    );})}
                  </div>
                );})}
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={function(){setStep(2);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(4);}}>Next: Scheduling</Btn></div>
          </div>}

          {/* STEP 4: SCHEDULING & GANTT */}
          {step===4&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Meeting Scheduling and Gantt Chart</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Schedule a planning meeting via Google Calendar and view the project Gantt timeline.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <Sec>Schedule Planning Meeting</Sec>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <Inp label="Meeting Date" type="date" value={meetingDate} onChange={function(e){setMeetingDate(e.target.value);}}/>
                  <Inp label="Time" type="time" value={meetingTime} onChange={function(e){setMeetingTime(e.target.value);}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Attendees</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {TEAM.map(function(name){var sel=meetingAttendees.includes(name);return <button key={name} onClick={function(){toggleAttendee(name);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(sel?C.accent+"55":C.border),background:sel?C.accentSoft:"transparent",color:sel?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:sel?700:400}}>{name}</button>;})}
                  </div>
                </div>
                <Inp label="Meeting Agenda" value={meetingAgenda} onChange={function(e){setMeetingAgenda(e.target.value);}} rows={3} placeholder="e.g. Event planning discussion, task assignment, timeline review, budget approval..."/>
                {calMsg&&<div style={{fontSize:11,color:C.accent,padding:"7px 10px",background:C.accentSoft,borderRadius:7,marginBottom:9}}>{calMsg}</div>}
                <Btn onClick={scheduleMeeting} color="green" disabled={!meetingDate||meetingAttendees.length===0}>Schedule via Google Calendar</Btn>
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <Sec style={{marginBottom:0}}>Project Gantt Chart — {selProject.code}</Sec>
                  <Btn size="sm" color="purple" onClick={function(){setGanttVisible(!ganttVisible);}}>{ganttVisible?"Hide Gantt":"Show Gantt"}</Btn>
                </div>
                {!ganttVisible&&<div style={{color:C.dim,fontSize:12,padding:8}}>Click "Show Gantt" to view the full project timeline for {selProject.name}.</div>}
                {ganttVisible&&<div>
                  {[...new Set(GANTT_ITEMS.map(function(g){return g.cat;}))].map(function(cat){
                    var projStart=new Date(selProject.start);
                    var projEnd=new Date(selProject.end);
                    var total=projEnd-projStart;
                    return(
                      <div key={cat} style={{marginBottom:11}}>
                        <div style={{fontSize:9,fontWeight:700,color:CAT_COLORS[cat]||C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.8}}>{cat}</div>
                        {GANTT_ITEMS.filter(function(g){return g.cat===cat;}).map(function(item,i){
                          var iStart=Math.max(0,(new Date(item.start)-projStart)/total*100);
                          var iWidth=Math.min(100-iStart,(new Date(item.end)-new Date(item.start))/total*100);
                          return(
                            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                              <div style={{width:160,fontSize:10,color:C.text,flexShrink:0,lineHeight:1.3}}>{item.task}</div>
                              <div style={{flex:1,height:10,background:C.surface,borderRadius:3,position:"relative",overflow:"hidden"}}>
                                <div style={{position:"absolute",left:iStart+"%",width:Math.max(iWidth,2)+"%",height:"100%",background:CAT_COLORS[cat]||C.accent,borderRadius:3,opacity:.85}}/>
                              </div>
                              <div style={{width:60,fontSize:9,color:C.dim,flexShrink:0}}>{item.assignee.split(" ")[0]}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div style={{fontSize:9,color:C.dim,marginTop:6}}>{selProject.start} to {selProject.end}</div>
                </div>}
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={function(){setStep(3);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(5);}}>Next: Reporting</Btn></div>
          </div>}

          {/* STEP 5: REPORTING */}
          {step===5&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Reporting and Documentation Formats</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate ready-to-fill event report template and transcription format for post-event documentation.</div>
            <Output title="Event Report Template and Transcription Format" content={reportFmt} loadKey="report" onGen={genReportFmt}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={function(){setStep(4);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(6);}}>Next: Post-Event Analysis</Btn></div>
          </div>}

          {/* STEP 6: POST-EVENT */}
          {step===6&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Post-Event Analysis and Communications</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>Enter event outcomes, then generate post-event social media, action points, and way forward.</div>
            <Card style={{marginBottom:13}}>
              <Sec>Event Outcomes (Fill After Event)</Sec>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <Inp label="Actual Attendance" value={attendance} onChange={function(e){setAttendance(e.target.value);}} placeholder="e.g. 78 participants — 34 women, 12 PLVs, 8 lawyers, 6 officials"/>
                <Inp label="Key Highlights" value={keyHighlights} onChange={function(e){setKeyHighlights(e.target.value);}} placeholder="e.g. Survivors testified, 12 cases identified, resolution passed, DM committed to action"/>
              </div>
              <Inp label="Post-Event Notes" value={postNotes} onChange={function(e){setPostNotes(e.target.value);}} rows={4} placeholder="What happened, key discussions, decisions made, outcomes achieved, challenges, commitments received. You can also summarise video and report content here for AI analysis."/>
            </Card>
            <Output title="Post-Event Social Media Communications" content={postEventSocial} loadKey="pSocial" onGen={genPostEventSocial}/>
            <Output title="Action Points, Way Forward and Funder Reporting" content={actionPoints} loadKey="actions" onGen={genActionPoints}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
              <Btn color="ghost" onClick={function(){setStep(5);}}>Back</Btn>
              <Btn color="green" size="lg" onClick={saveEvent}>Save and Archive This Event</Btn>
            </div>
          </div>}

        </div>
      </div>

      <div style={{textAlign:"center",padding:"11px 22px",fontSize:10,color:C.muted,borderTop:"1px solid "+C.border}}>Event Planning AI Pipeline · Jan Sahayak Pro · Janman Peoples Foundation · Jan Nyaya Abhiyan</div>
    </div>
  );
}
