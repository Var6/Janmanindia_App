// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

const C={bg:"#09101F",surface:"#101724",card:"#182030",border:"#1C2B46",accent:"#E8A243",accentSoft:"rgba(232,162,67,0.09)",red:"#E05C5C",green:"#4CAF82",blue:"#4A90D9",purple:"#9B72CF",muted:"#3F5070",text:"#CBD8ED",dim:"#6278A0"};
const PIN="janman2025";
const GUSERS=[
  {email:"sshashwat8@gmail.com",name:"Shashwat",role:"Director, Litigation",access:"admin"},
  {email:"shourya@janman.org",name:"Shourya Roy",role:"Executive Director",access:"admin"},
  {email:"roshin@janman.org",name:"Roshin Jacob",role:"Fellowship Coordinator",access:"coordinator"},
  {email:"prakash@janman.org",name:"Prakash Kumar",role:"Lead Social Work",access:"worker"},
  {email:"sachina@janman.org",name:"Sachina",role:"DLF – Patna",access:"fellow"},
  {email:"nawaz@janman.org",name:"Nawaz Hassan",role:"DLF – Araria",access:"fellow"},
  {email:"tausif@janman.org",name:"Tausif Raza",role:"DLF – Katihar",access:"fellow"},
  {email:"mithlesh@janman.org",name:"Mithlesh Kumar",role:"DLF – Bhagalpur",access:"fellow"},
  {email:"pintu@janman.org",name:"Pintu Kumar Mehta",role:"DLF – Kishanganj",access:"fellow"},
  {email:"nagmani@janman.org",name:"Nagmani",role:"DLF – Purnia",access:"fellow"},
  {email:"ashwini@janman.org",name:"Ashwini Pandey",role:"Legal Consultant",access:"fellow"},
  {email:"mugdha@janman.org",name:"Mugdha",role:"Lead Litigation Research",access:"lawyer"},
];
const BD=["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran"];
const CTS=["Supreme Court of India","Patna High Court",...BD.map(d=>"District Court, "+d),"Sessions Court, Purnia","Sessions Court, Patna","JMFC, Purnia","JMFC, Patna","CJM, Purnia","CJM, Patna","Family Court, Patna","Family Court, Purnia","POCSO Court, Purnia","POCSO Court, Patna"];
const SCI_CASE_TYPES=[
  "SPECIAL LEAVE PETITION (CIVIL)",
  "SPECIAL LEAVE PETITION (CRIMINAL)",
  "CIVIL APPEAL",
  "CRIMINAL APPEAL",
  "WRIT PETITION (CIVIL)",
  "WRIT PETITION(CRIMINAL)",
  "TRANSFER PETITION (CIVIL)",
  "TRANSFER PETITION (CRIMINAL)",
  "REVIEW PETITION (CIVIL)",
  "REVIEW PETITION (CRIMINAL)",
  "TRANSFERRED CASE (CIVIL)",
  "TRANSFERRED CASE (CRIMINAL)",
  "SPECIAL LEAVE TO PETITION (CIVIL)...",
  "SPECIAL LEAVE TO PETITION (CRIMINAL)...",
  "WRIT TO PETITION (CIVIL)...",
  "WRIT TO PETITION (CRIMINAL)...",
  "ORIGINAL SUIT",
  "DEATH REFERENCE CASE",
  "CONTEMPT PETITION (CIVIL)",
  "CONTEMPT PETITION (CRIMINAL)",
  "TAX REFERENCE CASE",
  "SPECIAL REFERENCE CASE",
  "ELECTION PETITION (CIVIL)",
  "ARBITRATION PETITION",
  "CURATIVE PETITION(CIVIL)",
  "CURATIVE PETITION(CRL)",
  "REF. U/A 317(1)",
  "MOTION(CRL)",
  "DIARYNO AND DIARYYR",
  "SUO MOTO WRIT PETITION(CIVIL)",
  "SUO MOTO WRIT PETITION(CRIMINAL)",
  "SUO MOTO CONTEMPT PETITION(CIVIL)",
  "SUO MOTO CONTEMPT PETITION(CRIMINAL)",
  "REF. U/S 14 RTI",
  "REF. U/S 17 RTI",
  "MISCELLANEOUS APPLICATION",
  "SUO MOTO TRANSFER PETITION(CIVIL)",
  "SUO MOTO TRANSFER PETITION(CRIMINAL)",
];
const PATNA_HC_CASE_TYPES=[
  "ADMIRALITY SUIT[ADM. SUIT]",
  "CERTIFICATE APPEAL[CRT. APPEAL]",
  "CIVIL MISCELLANEOUS JURISDICTION[C.Misc.]",
  "CIVIL REFERENCE[C.REF.]",
  "CIVIL REVIEW[C. REV.]",
  "CIVIL REVISION[C.R.]",
  "Civil Writ Jurisdiction Case[CWJC]",
  "COMMERCIAL APPEAL[COMMERCIAL APP]",
  "COMPANY APPEAL[COMP. APP]",
  "COMPANY APPEAL (SJ)[COMP. APP. (SJ)]",
  "COMPANY APPEAL(DB)[COMP. APP.(DB)]",
  "COMPANY APPLICATION[COMP. APPLIC]",
  "COMPANY PETITION[COMP PET]",
  "Compensation Appeal[COMPAN. APP]",
  "ELECTION PETITION[E.P.]",
  "FIRST APPEAL[FA]",
  "Letters Patent Appeal[L.P.A]",
  "MATRIMONIAL REF.[MAT. REF.]",
  "MATRIMONIAL SUIT[MAT. SUIT]",
  "Miscellaneous Appeal[MA]",
  "Miscellaneous Jurisdiction Case[MJC]",
  "MONEY SUIT[MONEY SUIT]",
  "PATENT CASE[PATENT CASE]",
  "REQUEST CASE[REQ. CASE]",
  "SECOND APPEAL[SA]",
  "SPECIAL LEAVE PETITION[SLP]",
  "SUPREME COURT APPEAL[SCA]",
  "TAX CASES[TAX]",
  "TEST CASE[TEST CASE]",
  "TEST SUIT[TEST SUIT]",
  "TITLE SUIT[T.S.]",
  "CR. APP. 341 CR. P.C.[CR. APP(341]",
  "CRIMINAL APPEAL (DB)[CR. APP (DB)]",
  "CRIMINAL APPEAL (SJ)[CR. APP (SJ)]",
  "CRIMINAL APPEAL (U/S)[CR.APP(U/S)]",
  "CRIMINAL MISCELLANEOUS[CR. MISC.]",
  "CRIMINAL REFERENCE[CR. REF.]",
  "CRIMINAL REVISION[CR. REV.]",
  "Criminal Writ Jurisdiction Case[CR. WJC]",
  "DEATH REFERENCE[D. REF.]",
  "GOVT. APPEAL (DB)[G. APP. (DB)]",
  "GOVT. APPEAL (SJ)[G.APP.(SJ)]",
  "Or. Criminal Miscellaneous[OR. CR. MISC]",
  "Or. Criminal Miscellaneous (DB)[OCR.MISC(DB)]",
  "SPECIAL LEAVE APPLICATION[SLA]",
];
const BIHAR_ECOURTS_CASE_TYPES=[
  "ADMINISTRATIVE SUITE",
  "AMENDENT OF PLEADINGS -0-6-R-17",
  "APP. OF RES. SUBJUDICE U/S 10",
  "APP. OF RESJUDICATE U/S 11 CPC",
  "APPEAL -MISC A) INJECTION , B) RECEIVERSHIP , 3) O",
  "APPOINTMENT OF GUARDINA FOR MINOR O-32 , R-3",
  "APPOINTMENT OF RECIVER 0-40, R",
  "ARBITRATION CASE",
  "ARBITRATION R.D.",
  "ATTACHMENT BEFORE JUDGEMNT O-38 RULE 5",
  "Anticipatory Bail",
  "App u/s 12 A of CC",
  "App u/s 12A of CC",
  "C.APPLN.",
  "C.B.I Judge(South Bihar) PAT",
  "CLAIM CASES",
  "Claim Case",
  "Commercial Appeal",
  "Commercial Disputes Case",
  "Commercial Suit",
  "COMPROMISE PETITIONER 0-23 R-3",
  "CONTEMPT PROCEEDINGS",
  "CRI. APPEAL",
  "CRI. BAIL APPLN.",
  "CRI. CASE",
  "CRI. M.A.",
  "Comp. Case(Juvenile)",
  "Cr. Appeal",
  "Cr. Case",
  "Cr. Case Complaint (O)",
  "Cr. Case Complaint (P)",
  "Cr. Miscellaneous",
  "Cr. Rev.",
  "Cri. Case(Juvenile)",
  "Cri. Misc. Complaint",
  "Cri. Rev App.",
  "Criminal Mislaneous",
  "D. V. Misc. u/s 31",
  "D.V. appeal",
  "DARKHAST PETITIONER",
  "DECLARATIVCE SUIT",
  "DECLARATORY SUIT",
  "DISCOVERY OF DOCUMENTS 0-11, R-12",
  "DISSOLUTION OF PATNERSHIP",
  "DISTRESS WARRENT",
  "Domestic Violence Act 2005",
  "E.C.ACT.SPL.CASE",
  "E.S.I. ACT  CASE",
  "ELECT. PETN",
  "EVICTION SUIT",
  "EVICTION SUIT(U/S BBC ACT/ U/S 111 TP ACT)",
  "EXECUITION CASES",
  "Excise Act",
  "Execution",
  "FINAL DECREE",
  "GUARDIAN  and  WARDS CASE",
  "GUARDIAN & WARDS CASE",
  "GUARDIANSHIP",
  "Harizan Atrocities Act",
  "INJUNCTION O-39 , R1, 2",
  "INSOLVENCY",
  "INSPECTION OF DOCUMENTS -0-11 , R-15",
  "INTERPLEADER SUIT",
  "INTERROGATURIES  0-11 , R -1",
  "ISSUANCE OF COMMISON 0-26 , R -2 , 9 , 13",
  "Indian Penal Code (IPC)",
  "L. A.",
  "L.A",
  "L.R  DKST.",
  "LAND ACQ. CASES",
  "LAND ACQUISTAION CASES",
  "LAND REF.",
  "LUNACY/ ADOPTION/ INSOLVENCY",
  "MATRIMONIAL CASE",
  "MESNE PROFIT",
  "MESNS PROFIT 0-34 , R-10A",
  "MISC CASES a) O-9 , R-4  b) O-9, R-9 c) U/S 47CPC",
  "MISC CASES u/s47cpc",
  "MISC. CIVIL APPEAL",
  "MISJOINDER & NON JOINDER -0-1 , R-9",
  "MISJOINDER And  NON JOINDER -0-1 , R-9",
  "MONEY APPEAL",
  "MONEY SUIT",
  "MUNCI. APPEAL",
  "Maintainance",
  "Matrimonial",
  "Misc. Civil Appeal",
  "Miscellaneous",
  "Miscellaneous (Adoption)",
  "Mislaneous",
  "NDPS CREI. REVN.",
  "NDPS M.A.",
  "NDPS. S. CASE",
  "OBJECTION TO NON -JOINDER & MIS JOINDER -0-1 , R 1",
  "OBJECTION TO NON -JOINDER , MIS JOINDER -0-1 , R 1",
  "OTHER MISC. CRI. APPLN.",
  "PARTITION SUIT",
  "PAUPER APPLICATION",
  "PRELIMINARY ISSUES 0-14",
  "PROBATE CASE",
  "P.c. Act",
  "Partion Suit",
  "Probate Case",
  "RECALL OF WITNESS -0-18 , R-17",
  "REG. CIVIL SUIT",
  "REG. CRI. CASE",
  "REGULAR PETITION",
  "RENT APPEAL",
  "RENT SUIT",
  "RESTORATION OF SUITS 0-9 R-4 , 0-9 , R -9",
  "REVIEW APPLICATION",
  "REVIEW/RECALL PET. U/S-114CPC",
  "Reference - LARR Act",
  "Regular Bail",
  "Revocation Case",
  "Rights of person with Disabilities Act-2016",
  "SESSION CASE",
  "SETTING  ASIDE EXPARTE ORDER 0-9 - R -13",
  "SMALL CASES",
  "SMALL CAUSE SUIT",
  "SPL. CASE (Drug and Cos. Act)",
  "SPL. CASE BUDS ACT",
  "SPL. CASE( MSEB)",
  "SPL. CRI. MA",
  "SPL. DARKHAST",
  "SPL. MARRIAGE PETITION",
  "SPL.CIV. SUIT",
  "STRIKE OUT OR ADD PARTIES -0-1 , R -10",
  "STRIKING OUT PLEADING -0-6 , R-16",
  "SUBSTITUTION 0-22 R -3 & 4",
  "SUBSTITUTION 0-22 R -3 And amp 4",
  "SUCCESSION",
  "SUCCESSION CASE",
  "SUCESSION CERT. CASE",
  "SUCESSION CERTIFICATE CASES",
  "SUIT BNY PERSON OF UNSOIUND MIND",
  "SUIT BY  CORPORATION/FIRM/TRUSTEE/INDEGENT PERSON",
  "SUIT BY MINOR",
  "SUIT FOR PERPERTUAL INJECTION",
  "SUIT FOR SPECIAL PERFORMANCE OF CONTRACT",
  "SUIT OF ENCHORMENT",
  "SUIT OF PUBLIC NAUSIANCE",
  "SUITE BY GOVT OR PUBLIC  OFFICERS IN OFFICIAL CAPA",
  "SUM. CIVIL SUIT",
  "SUMMARY CASE",
  "SUMMARY SUIT",
  "Spl Case (Child Act.)",
  "Spl Case (P.O.C.S.O. Act.)",
  "Spl. Case",
  "Spl. Case (Confiscation)",
  "Spl. Case (E.C.ACT)",
  "Spl. Case (Excise)",
  "Spl. Case (Food Adultration)",
  "Spl. Case (MP/MLA)",
  "Spl. Case (N.D.P.S.)",
  "Spl. Case (N.I.A.)",
  "Spl. Case (P.C. Act)",
  "Spl. Case (PESU)",
  "Spl. Case (Prev. of Money Laundering Act)",
  "Spl. Case (R.C.)",
  "Spl. Case (Rice Mills)",
  "Spl. Case (Right of persons with Disabilities Act)",
  "Spl. Case (SC / ST Act)",
  "Spl. Case (Vigilance)",
  "Spl. Case A.T.S.",
  "Spl. Case Human Rights",
  "TITLE APPEAL",
  "TRANSPOSITION OF DEFENDENT  AS PLAINTIFF  0-23 RUL",
  "TRUST APPEAL",
  "TRUST SUIT",
  "Title Appeal",
  "Title Eviction Appeal",
  "Title Eviction Suit",
  "Title Mortgage Suit",
  "Title Partition Suit",
  "Title Suit",
  "Transfer",
  "WITHDRAWAL OF SUITS 0-23 , R1",
  "Weight & measurement Act 1985",
  "Weight And measurement Act 1985",
  "Weight and Measurement Act",
];
const CTYPES=[...new Set([...PATNA_HC_CASE_TYPES,...SCI_CASE_TYPES,...BIHAR_ECOURTS_CASE_TYPES])];
const ATYPES=["Legal Aid Camp","PLV Training","DLF Residential Training","Annual Consultation","Fact-Finding","Community Outreach","Networking Meeting","Advocacy","Representation","OSC/DLSA Coordination","Court Visit"];
const ACTIVITY_PIPELINE_TYPES=[...new Set([...ATYPES,"Advocacy Campaign","State-level Conference","District-level Workshop","Awareness Campaign","Jan Sunwai (Public Hearing)","Press Conference","Donor Visit / Review Meeting","Team Review Meeting"])];
const ECATS=["Travel – Auto/Cab","Travel – Train/Bus","Travel – Fuel","Accommodation","Food/Meals","Camp Expenses","Printing & Stationery","Court Fees / Filing","Communication","PLV Allowance","Photography / Documentation","Office Supplies","Other"];
const GCATS=["Core Grant","Top-up Grant","Donation","CSR Contribution","Interest Income","Other"];
const PS=["Community Visit","Youth Leader Scoping","Camp Scheduling","Camp Execution","Post-Camp Report","Litigation Scoping","Filing"];
const STAFF=[
  {id:"u1",uid:"JNY-001",name:"Shashwat",role:"Director, Litigation & Co-Founder",type:"mentor",loc:"Patna",dist:"Patna",phone:"8527809671",email:"sshashwat8@gmail.com",status:"active",qual:"BA(H) History, KMC Delhi; LLB, Faculty of Law, Delhi University",join:"2022-01-01",bio:"Human rights lawyer and co-founder. Leads Jan Nyay Abhiyan litigation before Patna High Court and district courts, mentors district fellows."},
  {id:"u2",uid:"JNY-002",name:"Mugdha",role:"Lead – Litigation & Research",type:"lawyer",loc:"Delhi",dist:"Patna",phone:"9810025572",email:"",status:"active",qual:"BA LLB(Hons), Christ University; LLM, Columbia University",join:"2023-06-01",bio:"Trial and appellate lawyer. Leads litigation and research from Delhi, supports complex drafting in GBV and criminal justice matters."},
  {id:"u3",uid:"JNY-003",name:"Shourya Roy",role:"Executive Director & Co-Founder",type:"admin",loc:"Delhi",dist:"Patna",phone:"",email:"",status:"active",qual:"BA(H) History, KMC Delhi; MSW, DSSW Delhi; PhD pursuing",join:"2022-01-01",bio:"Social worker and researcher overseeing organisational strategy and programme design."},
  {id:"u4",uid:"JNY-004",name:"Roshin Jacob",role:"Legal Fellowship Coordinator",type:"coordinator",loc:"Patna",dist:"Patna",phone:"",email:"",status:"active",qual:"BSW, Nirmala Niketan Mumbai; LLB & LLM, Bangalore University",join:"2024-07-01",bio:"Coordinates the District Legal Fellowship Programme. Guides fellows on case strategy, drafting and hearing preparation."},
  {id:"u5",uid:"JNY-005",name:"Prakash Kumar",role:"Lead – Social Work",type:"worker",loc:"Patna",dist:"Patna",phone:"",email:"",status:"active",qual:"MSW, Tata Institute of Social Sciences",join:"2023-01-01",bio:"Senior social work professional heading Jan Nyay's field and community work."},
  {id:"u6",uid:"JNY-006",name:"Sachina",role:"District Legal Fellow – Patna",type:"fellow",loc:"Patna",dist:"Patna",phone:"",email:"",status:"active",qual:"B.Sc and LLB, Tilka Manjhi University, Bhagalpur",join:"2024-10-01",bio:"First-generation lawyer from Lakhisarai. DV, dowry, POCSO, juvenile justice, housing and labour rights."},
  {id:"u7",uid:"JNY-007",name:"Ashwini Pandey",role:"Legal Consultant",type:"consultant",loc:"Purnia",dist:"Purnia",phone:"",email:"",status:"active",qual:"LLB",join:"2024-07-01",bio:"Works across Seemanchal trial courts on domestic violence, sexual offences and GBV cases."},
  {id:"u8",uid:"JNY-008",name:"Nawaz Hassan",role:"District Legal Fellow – Araria",type:"fellow",loc:"Araria",dist:"Araria",phone:"",email:"",status:"active",qual:"LL.B., Aligarh Muslim University",join:"2025-01-01",bio:"Practicing lawyer in Araria. POCSO, rape, GBV, custodial deaths, unjust eviction and police brutality."},
  {id:"u9",uid:"JNY-009",name:"Tausif Raza",role:"District Legal Fellow – Katihar",type:"fellow",loc:"Katihar",dist:"Katihar",phone:"",email:"",status:"active",qual:"LL.B., Aligarh Muslim University",join:"2025-01-01",bio:"Criminal defence advocate, Civil Court Katihar. Prison visits, legal aid camps, PLV trainings, GBV representation."},
  {id:"u10",uid:"JNY-010",name:"Mithlesh Kumar",role:"District Legal Fellow – Bhagalpur",type:"fellow",loc:"Bhagalpur",dist:"Bhagalpur",phone:"",email:"",status:"active",qual:"LL.B., Tilka Manjhi University",join:"2025-01-01",bio:"GBV and criminal matters in Bhagalpur courts. Survivor support, complaint filing and documentation."},
  {id:"u11",uid:"JNY-011",name:"Pintu Kumar Mehta",role:"District Legal Fellow – Kishanganj",type:"fellow",loc:"Kishanganj",dist:"Kishanganj",phone:"",email:"",status:"active",qual:"LL.B., Tilka Manjhi University",join:"2025-01-01",bio:"Legal awareness and free legal aid for SC/ST, minorities, women and children in Kishanganj."},
  {id:"u12",uid:"JNY-012",name:"Nagmani",role:"District Legal Fellow – Purnia",type:"fellow",loc:"Purnia",dist:"Purnia",phone:"",email:"",status:"active",qual:"BA LL.B., Bihar Institute of Law, Patna",join:"2025-01-01",bio:"First-generation lawyer from Purnia. GBV, crimes against minors, welfare scheme access and pro bono representation."},
];
const IC=[
  {id:"c1",title:"Rukmani Devi v. State of Bihar",client:"Rukmani Devi & Ors",respondent:"State of Bihar",court:"Patna High Court",caseNo:"CWJC 4521/2025",firNo:"123/2023",section:"Art. 226 Constitution",ps:"Kotwali, Purnia",type:"Criminal Writ Petition",district:"Purnia",advocate:"Shashwat",worker:"Nagmani",status:"active",priority:"high",facts:"State defaulting on investigation. FIR registered but IO not recording statements u/s 161 CrPC. Key witnesses threatened. No arrest despite cognisable offence.",grounds:"1. Non-investigation violates Art. 21 — Nilabati Behera v. State of Orissa (1993) 2 SCC 746\n2. Mandatory investigation — Lalita Kumari v. State of UP (2014) 2 SCC 1\n3. Mandamus lies for inaction — Vineet Narain v. Union of India (1998) 1 SCC 226",relief:"(a) Direction to constitute SIT; (b) Monthly status reports to HC; (c) Protection to witnesses",hearings:[{id:"h1",date:"2025-03-10",court:"Patna High Court",purpose:"Admission",outcome:"Notice issued to State; compliance next date",nextDate:"2025-04-20",by:"Shashwat"}],diary:[{id:"d1",date:"2025-03-10",action:"Filed Criminal Writ Petition CWJC 4521/2025",by:"Shashwat",notes:"Admitted; interim order for SP status report"}],docs:["Writ Petition CWJC 4521/2025","Vakalatnama","FIR Copy 123/2023","Affidavit — Rukmani Devi"],createdAt:"2025-03-10",updatedAt:"2025-03-15"},
  {id:"c2",title:"Mob Lynching Teghda — Criminal Application",client:"Mob Lynching Teghda Victims",respondent:"State of Bihar",court:"District Court, Purnia",caseNo:"Cr. App. 089/2024",firNo:"45/2024",section:"IPC 302, 34",ps:"Teghda",type:"Application u/s 156(3) CrPC",district:"Purnia",advocate:"Sachina",worker:"Nagmani",status:"overdue",priority:"high",facts:"Mob lynching FIR filed Sept 2024 but chargesheet not submitted despite 6 months. Victim families receiving threats.",grounds:"1. Delay violates CrPC 167 — Hussainara Khatoon (1979)\n2. Mandatory investigation — Lalita Kumari (2014)",relief:"Direction to IO to file chargesheet within 15 days; victim protection order",hearings:[{id:"h1",date:"2025-03-28",court:"District Court, Purnia",purpose:"Appearance",outcome:"IO directed to file report",nextDate:"2025-04-15",by:"Sachina"}],diary:[{id:"d1",date:"2024-09-01",action:"Case opened — FIR registration confirmed",by:"Sachina",notes:""}],docs:["Application u/s 156(3) CrPC","FIR Copy 45/2024","Victim Affidavits (3)"],createdAt:"2024-09-01",updatedAt:"2025-03-28"},
];
const IA=[
  {id:"a1",type:"Legal Aid Camp",title:"Legal Aid Camp — Ramchak Bariya",location:"Ramchak Bariya, Purnia",district:"Purnia",date:"2025-04-05",coordinator:"Sachina",conductedBy:["Sachina","Nagmani"],beneficiaries:34,casesIdentified:6,casesReferred:2,summary:"34 beneficiaries. Issues: land rights (12), DV (8), MGNREGS wages (7), bonded labour (3).",status:"completed",followUp:"File representations for 3 MGNREGS cases; initiate 2 DV cases",participants:[{name:"Ramkali Devi",phone:"9876543210"}],attachments:[],linkedCases:[]},
  {id:"a2",type:"PLV Training",title:"PLV Training — Batch 3",location:"Janman Office, Purnia",district:"Purnia",date:"2025-03-22",coordinator:"Shashwat",conductedBy:["Shashwat","Roshin Jacob"],beneficiaries:12,casesIdentified:0,casesReferred:0,summary:"12 youth paralegals trained. Modules: FIR drafting, rights of arrested persons, POCSO, SC/ST Act.",status:"completed",followUp:"Deploy Batch 3 to Teghda and Kasba blocks by April 20",participants:[],attachments:[],linkedCases:[]},
];
const IF=[
  {id:"f1",date:"2025-04-01",type:"grant",amount:2998000,category:"Top-up Grant",project:"DLF Programme",description:"APPI Top-up Grant — Addendum 1 (18 months, 6 districts)",approvedBy:"Shashwat"},
  {id:"f2",date:"2025-04-08",type:"expense",amount:150000,category:"Salary/Honorarium",project:"DLF Programme",description:"Fellow honoraria — April 2025 (6 fellows @ Rs 25,000)",approvedBy:"Shashwat"},
  {id:"f3",date:"2025-04-05",type:"expense",amount:5800,category:"Camp/Training Expenses",project:"Jan Nyaya Abhiyan",description:"Legal Aid Camp — Ramchak Bariya",approvedBy:"Sachina"},
];
const IT=[
  {id:"t1",title:"Prepare brief for Rukmani Devi hearing",assignedTo:"Shashwat",caseId:"c1",deadline:"2025-04-18",status:"pending",priority:"high",notes:"Focus on non-investigation ground; cite Lalita Kumari"},
  {id:"t2",title:"Follow up with Teghda victim family",assignedTo:"Sachina",caseId:"c2",deadline:"2025-04-14",status:"pending",priority:"high",notes:"Confirm whether threats continuing; file victim protection application if yes"},
];
const IPROJECTS=[
  {id:"pr1",name:"Jan Nyaya Abhiyan – Access to Justice",code:"JNA-2024",funder:"Azim Premji Philanthropic Initiatives",grant:"R 2409-19929",budget:6000000,startDate:"2024-07-01",endDate:"2027-06-30",status:"active",lead:"Shashwat",team:["Shashwat","Sachina","Prakash Kumar","Roshin Jacob"],objectives:["Quality legal representation in Patna and Purnia","Legal Aid Camps in communities","Undertrial support in Purnia jail","Organisational capacity building"],milestones:[{id:"m1",title:"Year 1 Annual Report + FUR",due:"2025-07-31",status:"pending"},{id:"m2",title:"MIS/KMS system development",due:"2024-10-01",status:"done"},{id:"m3",title:"100 beneficiaries supported",due:"2025-06-30",status:"inprogress"}]},
  {id:"pr2",name:"District Legal Fellowship – 6 Districts",code:"DLF-2025",funder:"Azim Premji Philanthropic Initiatives",grant:"R 2409-19929 Addendum 1",budget:4528000,startDate:"2025-01-01",endDate:"2026-07-31",status:"active",lead:"Roshin Jacob",team:["Shashwat","Roshin Jacob","Sachina","Nawaz Hassan","Tausif Raza","Mithlesh Kumar","Pintu Kumar Mehta","Nagmani"],objectives:["Deploy 6 fellows in Araria, Kishanganj, Katihar, Purnia, Bhagalpur, Patna","File 60 cases across 6 districts","36 community legal literacy sessions","Form state-level collective of lawyers"],milestones:[{id:"m1",title:"6 Fellows recruited and inducted",due:"2025-01-31",status:"done"},{id:"m2",title:"Residential induction training",due:"2025-02-28",status:"done"},{id:"m3",title:"30 cases filed (50% target)",due:"2025-07-31",status:"inprogress"},{id:"m4",title:"18 community literacy sessions (50% target)",due:"2025-07-31",status:"pending"}]},
];
const IGRANTS=[
  {id:"g1",funder:"Azim Premji Philanthropic Initiatives",grantNo:"R 2409-19929",project:"Access to Justice — Jan Nyaya Abhiyan",totalAmount:6000000,period:"3 years",startDate:"2024-07-01",endDate:"2027-06-30",status:"active",disbursements:[{id:"d1",amount:2000000,date:"2024-07-10",label:"Year 1",status:"received"},{id:"d2",amount:2046000,date:"2025-07-10",label:"Year 2",status:"pending"},{id:"d3",amount:1954000,date:"2026-07-10",label:"Year 3",status:"pending"}],budgetHeads:[{head:"Salary, Honorarium, Staff benefits",budgeted:3578400,spent:300000},{head:"Fixed assets / CAPEX",budgeted:63000,spent:63000},{head:"Travel, Boarding & Lodging",budgeted:402045,spent:8500},{head:"Program expenses",budgeted:1404824,spent:5800},{head:"Administration cost",budgeted:551732,spent:0}],compliance:[{id:"c1",item:"Year 1 Annual Report — Narrative + FUR (Annexure-2)",due:"2025-07-31",status:"pending"},{id:"c2",item:"Year 1 Bank Statement submission",due:"2025-07-31",status:"pending"},{id:"c3",item:"Year 2 disbursement request (85% utilisation required)",due:"2025-07-01",status:"pending"},{id:"c4",item:"MIS / KMS system development certification",due:"2024-10-01",status:"done"}],notes:"Year 2 and Year 3 tranches contingent on satisfactory implementation and 85% utilisation. All expenditures must flow through designated bank account."},
  {id:"g2",funder:"Azim Premji Philanthropic Initiatives",grantNo:"R 2409-19929 — Addendum 1",project:"District Legal Fellowship (6 Districts)",totalAmount:4528000,period:"18 months",startDate:"2025-01-01",endDate:"2026-07-31",status:"active",disbursements:[{id:"d1",amount:2998000,date:"2025-01-15",label:"Tranche 1",status:"received"},{id:"d2",amount:1530000,date:"2026-01-15",label:"Tranche 2",status:"pending"}],budgetHeads:[{head:"6 Fellows @ Rs 25,000/month (18 months)",budgeted:2700000,spent:150000},{head:"Programme Coordinators (PC1 40% + PC2 50%)",budgeted:1260000,spent:0},{head:"Programme Staff Travel",budgeted:360000,spent:8500},{head:"Programme Expenses (workshops, quarterly)",budgeted:483000,spent:5800},{head:"Case Filing (60 cases @ Rs 1,000)",budgeted:60000,spent:0}],compliance:[{id:"c1",item:"DLF Progress Report — Tranche 1 (narrative + FUR)",due:"2025-07-31",status:"pending"},{id:"c2",item:"Quarterly fellow performance assessments",due:"2025-04-30",status:"pending"},{id:"c3",item:"Tranche 2 disbursement request",due:"2026-01-01",status:"pending"}],notes:"Top-up grant for District Legal Fellowship. 18 months ending July 2026. 6 fellows @ Rs 25,000/month. Tranche 2 contingent on 85% utilisation of Tranche 1."},
];
const PIPELINE_ROLES=["Chief Operating Officer","Program Manager","Activity Coordinator","District Legal Fellow","Legal Consultant","Social Worker","Litigation Director"];
const PIPELINE_THEMES=["Gender-Based Violence","Caste Atrocities / SC/ST Rights","Child Rights / POCSO","Right to Food / NFSA","Land & Forest Rights","Housing Rights / Eviction","Undertrial Rights / Bail","Manual Scavengers Rights","Minority Rights","Environmental Justice","Custodial Deaths / Police Atrocities","Disability Rights / RPWD","Access to Justice (General)","Labour Rights / MGNREGS","Child Marriage / POCSO"];
const PIPELINE_ORGS=["PUCL (People's Union for Civil Liberties)","HRLN (Human Rights Law Network)","NAPM (National Alliance of People's Movements)","AIDWA (All India Democratic Women's Association)","Breakthrough India","Jan Sahas","SLIC (Socio Legal Information Centre)","Right to Food Campaign","Amnesty International India","Commonwealth Human Rights Initiative","Centre for Equity Studies","Praxis Institute for Participatory Practices","Nazdeek","Sama Resource Group for Women and Health"];
const PIPELINE_GANTT_ITEMS=[
  {task:"Fellow Recruitment & Selection",start:"2025-01-01",end:"2025-01-31",cat:"HR",assignee:"Roshin Jacob"},
  {task:"Induction & Residential Training",start:"2025-01-15",end:"2025-02-28",cat:"Training",assignee:"Shashwat"},
  {task:"Monthly Online Training Sessions",start:"2025-03-01",end:"2026-07-31",cat:"Training",assignee:"Roshin Jacob"},
  {task:"Quarterly Field Visits",start:"2025-04-01",end:"2026-07-31",cat:"Monitoring",assignee:"Roshin Jacob"},
  {task:"Legal Aid Camps (6 per district)",start:"2025-02-01",end:"2026-07-31",cat:"Programme",assignee:"All Fellows"},
  {task:"PLV Training Batches",start:"2025-03-01",end:"2026-07-31",cat:"Training",assignee:"All Fellows"},
  {task:"Case Filing (target 60 cases)",start:"2025-02-01",end:"2026-07-31",cat:"Litigation",assignee:"All Fellows"},
  {task:"Community Legal Literacy Sessions",start:"2025-03-01",end:"2026-07-31",cat:"Programme",assignee:"All Fellows"},
  {task:"Annual Consultation / Conference",start:"2025-09-01",end:"2025-09-30",cat:"Activities",assignee:"Shashwat"},
  {task:"Year 1 Annual Report + FUR",start:"2025-06-01",end:"2025-07-31",cat:"Reporting",assignee:"Shashwat"},
  {task:"Mid-term Review",start:"2025-10-01",end:"2025-11-30",cat:"Monitoring",assignee:"Shashwat"},
  {task:"State-level Collective Formation",start:"2025-06-01",end:"2026-03-31",cat:"Programme",assignee:"Shashwat"},
  {task:"Tranche 2 Disbursement Request",start:"2025-12-01",end:"2026-01-31",cat:"Finance",assignee:"Shourya Roy"},
  {task:"Final Evaluation",start:"2026-05-01",end:"2026-07-31",cat:"Monitoring",assignee:"Shourya Roy"},
  {task:"Project Closeout & Final Report",start:"2026-06-01",end:"2026-07-31",cat:"Reporting",assignee:"Shashwat"},
];
const PIPELINE_CAT_COLORS={Programme:C.green,Training:C.blue,Litigation:C.accent,HR:C.purple,Monitoring:C.blue,Activities:C.red,Reporting:C.dim,Finance:C.green};
const PIPELINE_STEPS=["Setup","Brief & Design","Communications","Logistics","Scheduling","Reporting","Post-Activity"];

const td=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const dF=d=>d?Math.floor((Date.now()-new Date(d))/864e5):0;
const dT=d=>d?Math.floor((new Date(d)-Date.now())/864e5):999;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function getStorageBridge(){
  if(typeof window==="undefined")return null;
  if((window as any).storage&&typeof (window as any).storage.get==="function"&&typeof (window as any).storage.set==="function"){
    return {
      get:async function(key:string){return (window as any).storage.get(key);},
      set:async function(key:string,value:string){return (window as any).storage.set(key,value);},
    };
  }
  if(window.localStorage){
    return {
      get:async function(key:string){
        const value=window.localStorage.getItem(key);
        return value===null?null:{value:value};
      },
      set:async function(key:string,value:string){
        window.localStorage.setItem(key,value);
      },
    };
  }
  return null;
}
async function sg(k: string){
  try{
    const storage=getStorageBridge();
    if(!storage)return null;
    const r=await storage.get(k);
    return r?JSON.parse(r.value):null;
  }catch{
    return null;
  }
}
async function ss(k: string,v: unknown){
  try{
    const storage=getStorageBridge();
    if(!storage)return;
    await storage.set(k,JSON.stringify(v));
  }catch{}
}
function isDistrictCourtLike(court){
  return !!court&&court!=="Supreme Court of India"&&court!=="Patna High Court";
}
function getCaseTypeOptions(court){
  if(court==="Supreme Court of India")return SCI_CASE_TYPES;
  if(court==="Patna High Court")return PATNA_HC_CASE_TYPES;
  if(isDistrictCourtLike(court))return BIHAR_ECOURTS_CASE_TYPES;
  return CTYPES;
}
function getCaseTypeSource(court){
  if(court==="Supreme Court of India")return "Official SCI case-status case-type list";
  if(court==="Patna High Court")return "Official Patna High Court filing/case-status case-type list";
  if(isDistrictCourtLike(court))return "Official Bihar district eCourts case-type list (Patna district frontend)";
  return "Combined court catalog";
}
function getPreferredCaseType(court){
  if(court==="Supreme Court of India")return "SPECIAL LEAVE PETITION (CIVIL)";
  if(court==="Patna High Court")return "Civil Writ Jurisdiction Case[CWJC]";
  if(isDistrictCourtLike(court))return "Title Suit";
  return CTYPES[0];
}
function formatBytes(bytes){
  if(bytes===undefined||bytes===null)return "—";
  if(bytes<1024)return bytes+" B";
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";
  return (bytes/1024/1024).toFixed(1)+" MB";
}
function readFileAsDataUrl(file){
  return new Promise(function(resolve,reject){
    const fr=new FileReader();
    fr.onload=function(){resolve(String(fr.result||""));};
    fr.onerror=function(){reject(fr.error||new Error("read failed"));};
    fr.readAsDataURL(file);
  });
}
async function filesToAttachments(fileList,maxInlineBytes){
  const files=Array.from(fileList||[]);
  const limit=maxInlineBytes||1800000;
  const out=[];
  for(const file of files){
    let dataUrl="";
    let persisted=file.size<=limit;
    if(persisted){
      try{dataUrl=await readFileAsDataUrl(file);}catch(e){persisted=false;dataUrl="";}
    }
    out.push({id:uid(),name:file.name,type:file.type||"application/octet-stream",size:file.size||0,date:td(),dataUrl:dataUrl,persisted:persisted});
  }
  return out;
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
function Card({children,style}){return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"18px 22px",...style}}>{children}</div>;}
function Sec({children,style}){return <div style={{fontSize:10,fontFamily:"'Playfair Display',serif",letterSpacing:2.5,textTransform:"uppercase",color:C.accent,marginBottom:12,opacity:.9,...style}}>{children}</div>;}
function Badge({label,color}){const m={amber:C.accent,red:C.red,green:C.green,blue:C.blue,purple:C.purple,teal:"#26A69A",gray:C.dim};const col=m[color||"amber"]||C.accent;return <span style={{background:col+"25",color:col,border:"1px solid "+col+"40",borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;}
function Dot({color}){return <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:color||C.green,boxShadow:"0 0 5px "+(color||C.green),marginRight:5,flexShrink:0}}/>;}
function Inp({label,value,onChange,type,placeholder,rows,style,...r}){return <div style={{marginBottom:10,...style}}>{label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</label>}{rows?<textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder||""} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>:<input type={type||"text"} value={value} onChange={onChange} placeholder={placeholder||""} {...r} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5,boxSizing:"border-box"}}/>}</div>;}
function Sel({label,value,onChange,options}){return <div style={{marginBottom:10}}>{label&&<label style={{fontSize:9,color:C.dim,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</label>}<select value={value} onChange={onChange} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 11px",color:C.text,fontSize:12.5}}>{(options||[]).map(function(o){const v=o.value!==undefined?o.value:o;const l=o.label!==undefined?o.label:o;return <option key={v} value={v}>{l}</option>;})}</select></div>;}
function Btn({children,onClick,color,disabled,size,style}){const bg={accent:C.accent,red:C.red,green:C.green,blue:C.blue,ghost:"transparent"}[color||"accent"]||C.accent;const tc=(color==="accent"||color==="green")?"#000":C.text;const pd=size==="sm"?"5px 11px":"8px 18px";return <button onClick={onClick} disabled={disabled} style={{background:disabled?C.muted:bg,color:disabled?C.dim:tc,border:color==="ghost"?"1px solid "+C.border:"none",borderRadius:7,padding:pd,fontSize:size==="sm"?11:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",...style}}>{children}</button>;}
function Alert({emoji,color,label,text}){return <div style={{display:"flex",gap:9,alignItems:"flex-start",padding:"9px 13px",background:color+"12",borderRadius:8,borderLeft:"3px solid "+color,marginBottom:7}}><span style={{fontSize:14}}>{emoji}</span><div><span style={{fontWeight:700,fontSize:11,color,marginRight:5}}>{label}</span><span style={{fontSize:12,color:C.dim}}>{text}</span></div></div>;}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({onAuth}){
  const [mode,setMode]=useState("select");
  const [pin,setPin]=useState("");
  const [email,setEmail]=useState("");
  const [err,setErr]=useState(false);
  function checkPin(){if(pin===PIN){onAuth({name:"Shashwat",role:"Director",access:"admin",email:"sshashwat8@gmail.com"});}else{setErr(true);setTimeout(function(){setErr(false);},2000);setPin("");}}
  function checkGoogle(){const u=GUSERS.find(function(x){return x.email.toLowerCase()===email.toLowerCase().trim();});if(u){onAuth(u);}else{setErr(true);setTimeout(function(){setErr(false);},2000);}}
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}select,input,textarea{outline:none;color-scheme:dark;}"}</style>
      <Card style={{width:370,textAlign:"center",padding:"36px 30px"}}>
        <div style={{width:50,height:50,borderRadius:12,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 16px"}}>⚖</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.text,marginBottom:3}}>Jan Sahayak Pro</div>
        <div style={{fontSize:11,color:C.dim,marginBottom:22}}>Janman Peoples Foundation · Restricted Access</div>
        {mode==="select"&&<div>
          <button onClick={function(){setMode("google");}} style={{width:"100%",padding:"12px",borderRadius:8,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:9,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span style={{fontSize:17,fontWeight:700,color:C.accent}}>G</span> Sign in with Google Workspace</button>
          <button onClick={function(){setMode("pin");}} style={{width:"100%",padding:"10px",borderRadius:8,border:"1px solid "+C.border,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer"}}>Admin PIN Login</button>
        </div>}
        {mode==="google"&&<div>
          <div style={{fontSize:11,color:C.dim,marginBottom:12,textAlign:"left"}}>Enter your Janman Google Workspace email</div>
          <Inp label="Email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="name@janman.org" onKeyDown={function(e){if(e.key==="Enter")checkGoogle();}}/>
          {err&&<div style={{color:C.red,fontSize:11,marginBottom:8}}>Email not found in authorised users list.</div>}
          <Btn onClick={checkGoogle} style={{width:"100%",marginBottom:8}}>Sign In</Btn>
          <button onClick={function(){setMode("select");setErr(false);}} style={{background:"none",border:"none",color:C.dim,fontSize:11,cursor:"pointer"}}>← Back</button>
        </div>}
        {mode==="pin"&&<div>
          <Inp label="Admin PIN" type="password" value={pin} onChange={function(e){setPin(e.target.value);}} placeholder="Enter PIN" onKeyDown={function(e){if(e.key==="Enter")checkPin();}}/>
          {err&&<div style={{color:C.red,fontSize:11,marginBottom:8}}>Incorrect PIN.</div>}
          <Btn onClick={checkPin} style={{width:"100%",marginBottom:8}}>Access System</Btn>
          <button onClick={function(){setMode("select");setErr(false);}} style={{background:"none",border:"none",color:C.dim,fontSize:11,cursor:"pointer"}}>← Back</button>
        </div>}
        <div style={{fontSize:10,color:C.muted,marginTop:14}}>Authorised Janman team members only.</div>
      </Card>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({cases,activities,finance,tasks,team}){
  const ov=cases.filter(function(c){return dF(c.updatedAt)>7&&c.status==="active";});
  const uh=cases.flatMap(function(c){return c.hearings.filter(function(h){return dT(h.nextDate)>=0&&dT(h.nextDate)<=7;}).map(function(h){return Object.assign({},h,{cas:c});});}).sort(function(a,b){return new Date(a.nextDate)-new Date(b.nextDate);});
  const pt=tasks.filter(function(t){return t.status!=="done";});
  const odt=tasks.filter(function(t){return t.status!=="done"&&dT(t.deadline)<0;});
  const mo=new Date().toISOString().slice(0,7);
  const mG=finance.filter(function(f){return f.type==="grant"&&f.date.startsWith(mo);}).reduce(function(s,f){return s+f.amount;},0);
  const mE=finance.filter(function(f){return f.type==="expense"&&f.date.startsWith(mo);}).reduce(function(s,f){return s+f.amount;},0);
  const hr=new Date().getHours();const greet=hr<12?"morning":hr<17?"afternoon":"evening";
  const stats=[{l:"Active Cases",v:cases.filter(function(c){return c.status==="active";}).length,icon:"⚖",col:C.blue},{l:"Overdue",v:ov.length,icon:"⚠",col:C.red},{l:"Activities (month)",v:activities.filter(function(a){return a.date.startsWith(mo);}).length,icon:"🏕",col:C.green},{l:"Pending Tasks",v:pt.length,icon:"📋",col:C.accent},{l:"Month Grants",v:"₹"+(mG/1e5).toFixed(1)+"L",icon:"💰",col:C.green},{l:"Month Expenses",v:"₹"+(mE/1000).toFixed(0)+"K",icon:"💸",col:C.red}];
  return(
    <div>
      <Card style={{marginBottom:13}}>
        <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:16}}>
          <div style={{width:42,height:42,borderRadius:10,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>☀️</div>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>Good {greet}, Shashwat</div><div style={{fontSize:12,color:C.dim}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
        </div>
        {ov.length>0&&<Alert emoji="🔴" color={C.red} label="Overdue Cases" text={ov.length+" case(s) not updated in 7+ days: "+ov.map(function(c){return c.client;}).join(", ")}/>}
        {odt.length>0&&<Alert emoji="⏰" color={C.red} label="Overdue Tasks" text={odt.length+" task(s) past deadline: "+odt.slice(0,2).map(function(t){return t.title;}).join("; ")}/>}
        {uh.length>0&&<Alert emoji="🗓" color={C.accent} label="Hearings This Week" text={uh.map(function(h){return h.cas.client+" — "+fmt(h.nextDate)+" ("+(dT(h.nextDate)===0?"today":dT(h.nextDate)+"d")+")";}).join("; ")}/>}
        {ov.length===0&&odt.length===0&&uh.length===0&&<Alert emoji="✅" color={C.green} label="All Clear" text="No critical alerts today."/>}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:13}}>
        {stats.map(function(s){return <Card key={s.l} style={{padding:"12px 15px",display:"flex",alignItems:"center",gap:11}}><div style={{width:34,height:34,borderRadius:8,background:s.col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div><div><div style={{fontSize:20,fontWeight:700,color:s.col}}>{s.v}</div><div style={{fontSize:10,color:C.dim}}>{s.l}</div></div></Card>;})}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <Card><Sec>Hearings This Week</Sec>{uh.length===0?<div style={{color:C.dim,fontSize:12}}>No hearings in the next 7 days.</div>:uh.map(function(h){return <div key={h.id} style={{display:"flex",gap:9,padding:"8px 11px",background:C.surface,borderRadius:8,marginBottom:6}}><div style={{width:32,height:32,borderRadius:7,background:C.accent+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🗓</div><div><div style={{fontWeight:600,fontSize:12,color:C.text}}>{h.cas.client}</div><div style={{fontSize:10,color:C.dim}}>{h.court} · {fmt(h.nextDate)} · {h.by}</div></div></div>;})}</Card>
        <Card><Sec>Team Task Status</Sec>{team.filter(function(m){return m.status==="active";}).map(function(m){const mt=pt.filter(function(t){return t.assignedTo===m.name;});if(!mt.length)return null;return <div key={m.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:700,color:C.accent}}>{m.name}</span><div style={{display:"flex",gap:3}}><Badge label={mt.length+" tasks"} color="amber"/>{mt.filter(function(t){return dT(t.deadline)<0;}).length>0&&<Badge label="overdue" color="red"/>}</div></div>{mt.slice(0,1).map(function(t){return <div key={t.id} style={{fontSize:11,color:C.dim,paddingLeft:5}}>{t.title}</div>;})}</div>;})}
        </Card>
      </div>
    </div>
  );
}

// ── CASES ─────────────────────────────────────────────────────────────────────
function Cases({cases,setCases,tasks,setTasks,team}){
  const [view,setView]=useState("list");const [sel,setSel]=useState(null);const [filter,setFilter]=useState("all");
  const [form,setForm]=useState(bc());
  const [panel,setPanel]=useState("diary");
  const [df,setDf]=useState({action:"",notes:"",by:"Shashwat"});
  const [hf,setHf]=useState({date:"",court:"Patna High Court",purpose:"",outcome:"",nextDate:"",by:"Shashwat"});
  const [docF,setDocF]=useState("");const [tf,setTf]=useState({title:"",assignedTo:"Shashwat",deadline:"",priority:"medium",notes:""});
  const [calMsg,setCalMsg]=useState("");
  function bc(){return{id:uid(),title:"",client:"",respondent:"",court:"Patna High Court",caseNo:"",firNo:"",section:"",ps:"",type:getPreferredCaseType("Patna High Court"),district:"Patna",advocate:"Shashwat",worker:"",status:"active",priority:"medium",facts:"",grounds:"",relief:"",hearings:[],diary:[],docs:[],attachments:[],createdAt:td(),updatedAt:td()};}
  const lawyers=team.filter(function(m){return ["mentor","lawyer","fellow","consultant","coordinator"].includes(m.type)&&m.status==="active";}).map(function(m){return m.name;});
  const workers=team.filter(function(m){return ["worker","fellow"].includes(m.type)&&m.status==="active";}).map(function(m){return m.name;});
  const allNames=team.filter(function(m){return m.status==="active";}).map(function(m){return m.name;});
  const filtered=filter==="all"?cases:cases.filter(function(c){return c.status===filter;});
  const cas=cases.find(function(c){return c.id===sel;});
  const caseTypeOptions=getCaseTypeOptions(form.court);
  function save(){setCases(function(p){return [...p,form];});setView("list");setForm(bc());}
  function upd(id,patch){setCases(function(p){return p.map(function(c){return c.id===id?Object.assign({},c,patch,{updatedAt:td()}):c;});});}
  function addDiary(){if(!df.action.trim())return;upd(sel,{diary:[...(cas.diary||[]),Object.assign({id:uid()},df,{date:td()})]});setDf({action:"",notes:"",by:"Shashwat"});}
  function addHearing(){if(!hf.date.trim())return;upd(sel,{hearings:[...(cas.hearings||[]),Object.assign({id:uid()},hf)]});setHf({date:"",court:cas?cas.court:"Patna High Court",purpose:"",outcome:"",nextDate:"",by:"Shashwat"});}
  function addDoc(){if(!docF.trim())return;upd(sel,{docs:[...(cas.docs||[]),docF]});setDocF("");}
  function addTask(){if(!tf.title.trim())return;setTasks(function(p){return [...p,Object.assign({id:uid()},tf,{caseId:sel,status:"pending"})];});setTf({title:"",assignedTo:"Shashwat",deadline:"",priority:"medium",notes:""});}
  async function addFilesToForm(fileList){
    const files=await filesToAttachments(fileList,2200000);
    if(!files.length)return;
    setForm(function(p){return Object.assign({},p,{attachments:[...(p.attachments||[]),...files]});});
  }
  async function addFilesToCase(fileList){
    if(!cas)return;
    const files=await filesToAttachments(fileList,2200000);
    if(!files.length)return;
    upd(sel,{attachments:[...(cas.attachments||[]),...files]});
  }
  async function syncCal(h){
    setCalMsg("⏳ Syncing...");
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gcal.mcp.claude.com/mcp",name:"gcal"}],messages:[{role:"user",content:"Create a Google Calendar event on primary calendar. Title: Hearing — "+cas.client+" ["+cas.court+"]. Date: "+h.nextDate+", time 10:30 AM IST, duration 2 hours. Description: Case: "+cas.title+", Case No: "+cas.caseNo+", Purpose: "+h.purpose+", Advocate: "+h.by+", Janman Peoples Foundation"}]})});setCalMsg("✅ Synced to Google Calendar!");}catch(e){setCalMsg("❌ Sync failed.");}
    setTimeout(function(){setCalMsg("");},4000);
  }
  if(view==="add")return(
    <div>
      <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:14}}><Btn color="ghost" size="sm" onClick={function(){setView("list");}}>← Back</Btn><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text}}>Register New Case</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <Card>
          <Sec>Case Particulars</Sec>
          <Inp label="Case Title" value={form.title} onChange={function(e){setForm(function(p){return Object.assign({},p,{title:e.target.value});});}} placeholder="e.g. Rukmani Devi v. State of Bihar"/>
          <Inp label="Client / Petitioner" value={form.client} onChange={function(e){setForm(function(p){return Object.assign({},p,{client:e.target.value});});}}/>
          <Inp label="Respondent" value={form.respondent} onChange={function(e){setForm(function(p){return Object.assign({},p,{respondent:e.target.value});});}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            <Sel label="Court" value={form.court} onChange={function(e){const nextCourt=e.target.value;const nextTypes=getCaseTypeOptions(nextCourt);setForm(function(p){return Object.assign({},p,{court:nextCourt,type:nextTypes.includes(p.type)?p.type:getPreferredCaseType(nextCourt)});});}} options={CTS}/>
            <Sel label="Case Type" value={form.type} onChange={function(e){setForm(function(p){return Object.assign({},p,{type:e.target.value});});}} options={caseTypeOptions}/>
          </div>
          <div style={{fontSize:10,color:C.dim,marginTop:-2,marginBottom:9}}>Source: {getCaseTypeSource(form.court)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Case No." value={form.caseNo} onChange={function(e){setForm(function(p){return Object.assign({},p,{caseNo:e.target.value});});}} placeholder="e.g. CWJC 4521/2025"/><Inp label="FIR No." value={form.firNo} onChange={function(e){setForm(function(p){return Object.assign({},p,{firNo:e.target.value});});}} placeholder="e.g. 123/2023"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Sections / Articles" value={form.section} onChange={function(e){setForm(function(p){return Object.assign({},p,{section:e.target.value});});}} placeholder="e.g. Art. 226 / IPC 302"/><Inp label="Police Station" value={form.ps} onChange={function(e){setForm(function(p){return Object.assign({},p,{ps:e.target.value});});}} placeholder="e.g. Kotwali Purnia"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Sel label="District" value={form.district} onChange={function(e){setForm(function(p){return Object.assign({},p,{district:e.target.value});});}} options={BD}/><Sel label="Priority" value={form.priority} onChange={function(e){setForm(function(p){return Object.assign({},p,{priority:e.target.value});});}} options={["high","medium","low"]}/><Sel label="Advocate" value={form.advocate} onChange={function(e){setForm(function(p){return Object.assign({},p,{advocate:e.target.value});});}} options={lawyers}/></div>
          <Sel label="Field Worker / Fellow" value={form.worker} onChange={function(e){setForm(function(p){return Object.assign({},p,{worker:e.target.value});});}} options={["—",...workers]}/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Case Documents (add names)</div>
            <div style={{display:"flex",gap:7,marginBottom:7}}><input value={docF} onChange={function(e){setDocF(e.target.value);}} placeholder="e.g. Writ Petition, Vakalatnama, FIR Copy" style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12}}/><Btn size="sm" onClick={function(){if(docF.trim()){setForm(function(p){return Object.assign({},p,{docs:[...p.docs,docF]});});setDocF("");}}} style={{flexShrink:0}}>+ Add</Btn></div>
            {form.docs.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{form.docs.map(function(d,i){return <span key={i} style={{background:C.accentSoft,color:C.accent,borderRadius:5,padding:"3px 8px",fontSize:11}}>📄 {d}</span>;})}</div>}
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Upload Case Files</div>
            <input type="file" multiple onChange={async function(e){await addFilesToForm(e.target.files);e.target.value="";}} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:12,boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:C.muted,marginTop:5}}>Files under about 2.2 MB are stored locally with preview/download support. Larger files are logged with metadata only.</div>
            {form.attachments.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>{form.attachments.map(function(file){return <div key={file.id} style={{padding:"8px 10px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}><div style={{fontSize:12,color:C.text,fontWeight:600,lineHeight:1.4}}>{file.name}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{formatBytes(file.size)} · {file.persisted?"saved locally":"metadata only"}</div></div>;})}</div>}
          </div>
        </Card>
        <Card>
          <Sec>Legal Substance</Sec>
          <Inp label="Statement of Facts" value={form.facts} onChange={function(e){setForm(function(p){return Object.assign({},p,{facts:e.target.value});});}} rows={5} placeholder="Chronological narrative of material facts..."/>
          <Inp label="Legal Grounds (with citations)" value={form.grounds} onChange={function(e){setForm(function(p){return Object.assign({},p,{grounds:e.target.value});});}} rows={5} placeholder="1. Ground — citing case and year"/>
          <Inp label="Relief Sought" value={form.relief} onChange={function(e){setForm(function(p){return Object.assign({},p,{relief:e.target.value});});}} rows={3}/>
          <div style={{display:"flex",gap:8,marginTop:6}}><Btn onClick={save}>Save Case</Btn><Btn color="ghost" onClick={function(){setView("list");}}>Cancel</Btn></div>
        </Card>
      </div>
    </div>
  );
  if(view==="detail"&&cas)return(
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:13,flexWrap:"wrap"}}><Btn color="ghost" size="sm" onClick={function(){setView("list");}}>← Cases</Btn><div style={{flex:1,fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text}}>{cas.title}</div><Badge label={cas.type.length>18?cas.type.slice(0,18)+"…":cas.type} color={cas.type.includes("PIL")?"blue":cas.type.includes("Writ")?"red":"amber"}/><Badge label={cas.status} color={cas.status==="active"?"green":cas.status==="overdue"?"red":"gray"}/><Badge label={cas.priority+" priority"} color={cas.priority==="high"?"red":"amber"}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:12,marginBottom:12}}>
        <Card>
          <Sec>Case Particulars</Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:11}}>
            {[["Court",cas.court],["Case No.",cas.caseNo||"—"],["FIR No.",cas.firNo||"—"],["Sections",cas.section||"—"],["Police Station",cas.ps||"—"],["District",cas.district||"—"],["Advocate",cas.advocate],["Field Worker",cas.worker||"—"],["Last Updated",fmt(cas.updatedAt)+" ("+dF(cas.updatedAt)+"d ago)"]].map(function(item){return <div key={item[0]} style={{background:C.surface,borderRadius:7,padding:"7px 10px"}}><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{item[0]}</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{item[1]}</div></div>;})}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{["active","overdue","stayed","closed"].map(function(s){return <Btn key={s} size="sm" color={cas.status===s?"accent":"ghost"} onClick={function(){upd(sel,{status:s});}} style={{textTransform:"capitalize"}}>{s}</Btn>;})}</div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Card style={{flex:1}}><Sec>Statement of Facts</Sec><div style={{fontSize:12.5,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{cas.facts||"No facts recorded."}</div></Card>
          <Card><Sec>Relief Sought</Sec><div style={{fontSize:12.5,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{cas.relief||"—"}</div></Card>
        </div>
      </div>
      {cas.grounds&&<Card style={{marginBottom:12}}><Sec>Legal Grounds</Sec><div style={{fontSize:12.5,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{cas.grounds}</div></Card>}
      <Card>
        <div style={{display:"flex",gap:4,marginBottom:13,borderBottom:"1px solid "+C.border,paddingBottom:10,flexWrap:"wrap"}}>
          {["diary","hearings","documents","tasks"].map(function(p){const labels={diary:"📓 Case Diary",hearings:"🗓 Hearings",documents:"📁 Documents ("+(((cas.docs||[]).length)+((cas.attachments||[]).length))+")",tasks:"✅ Tasks ("+tasks.filter(function(t){return t.caseId===sel&&t.status!=="done";}).length+")"};return <button key={p} onClick={function(){setPanel(p);}} style={{padding:"5px 12px",borderRadius:6,border:"none",background:panel===p?C.accentSoft:"transparent",color:panel===p?C.accent:C.dim,fontSize:11,fontWeight:panel===p?700:400,cursor:"pointer"}}>{labels[p]}</button>;})}
        </div>
        {panel==="diary"&&<div>
          <div style={{padding:"11px 13px",background:C.surface,borderRadius:8,marginBottom:11}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Action Taken" value={df.action} onChange={function(e){setDf(function(p){return Object.assign({},p,{action:e.target.value});});}} placeholder="e.g. Filed writ petition"/><Sel label="By" value={df.by} onChange={function(e){setDf(function(p){return Object.assign({},p,{by:e.target.value});});}} options={allNames}/></div>
            <Inp label="Notes" value={df.notes} onChange={function(e){setDf(function(p){return Object.assign({},p,{notes:e.target.value});});}}/>
            <Btn size="sm" onClick={addDiary}>Add Entry</Btn>
          </div>
          {(cas.diary||[]).slice().reverse().map(function(d){return <div key={d.id} style={{display:"flex",gap:11,padding:"9px 0",borderBottom:"1px solid "+C.border+"20"}}><div style={{width:62,fontSize:11,color:C.dim,flexShrink:0,paddingTop:2}}>{fmt(d.date)}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{d.action}</div>{d.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{d.notes}</div>}<div style={{fontSize:11,color:C.accent,marginTop:2}}>— {d.by}</div></div></div>;})}
        </div>}
        {panel==="hearings"&&<div>
          <div style={{padding:"11px 13px",background:C.surface,borderRadius:8,marginBottom:11}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Hearing Date" type="date" value={hf.date} onChange={function(e){setHf(function(p){return Object.assign({},p,{date:e.target.value});});}} /><Inp label="Next Date" type="date" value={hf.nextDate} onChange={function(e){setHf(function(p){return Object.assign({},p,{nextDate:e.target.value});});}} /><Sel label="By" value={hf.by} onChange={function(e){setHf(function(p){return Object.assign({},p,{by:e.target.value});});}} options={allNames}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Purpose" value={hf.purpose} onChange={function(e){setHf(function(p){return Object.assign({},p,{purpose:e.target.value});});}} placeholder="e.g. Admission, Arguments"/><Inp label="Outcome" value={hf.outcome} onChange={function(e){setHf(function(p){return Object.assign({},p,{outcome:e.target.value});});}} placeholder="e.g. Notice to State"/></div>
            <Btn size="sm" onClick={addHearing}>Add Hearing</Btn>
          </div>
          {calMsg&&<div style={{marginBottom:9,fontSize:12,color:C.accent,padding:"7px 11px",background:C.accentSoft,borderRadius:7}}>{calMsg}</div>}
          {(cas.hearings||[]).slice().reverse().map(function(h){return <div key={h.id} style={{display:"flex",gap:11,padding:"10px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}><div style={{width:62,flexShrink:0}}><div style={{fontSize:11,color:C.dim}}>{fmt(h.date)}</div></div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.text}}>{h.purpose||"Hearing"}</div><div style={{fontSize:11,color:C.dim}}>{h.court}</div>{h.outcome&&<div style={{fontSize:12,color:C.text,marginTop:2}}>Outcome: {h.outcome}</div>}{h.nextDate&&<div style={{fontSize:12,color:C.accent,marginTop:2}}>Next: {fmt(h.nextDate)} · {h.by}</div>}</div>{h.nextDate&&dT(h.nextDate)>=0&&<Btn size="sm" color="ghost" onClick={function(){syncCal(h);}}>📅 Calendar</Btn>}</div>;})}
        </div>}
        {panel==="documents"&&<div>
          <div style={{display:"flex",gap:7,marginBottom:11}}><input value={docF} onChange={function(e){setDocF(e.target.value);}} placeholder="Document name (e.g. Writ Petition, Vakalatnama, Affidavit)" style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12.5}}/><Btn size="sm" onClick={addDoc}>Add</Btn></div>
          <div style={{marginBottom:10}}>
            <input type="file" multiple onChange={async function(e){await addFilesToCase(e.target.files);e.target.value="";}} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:12.5,boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:C.muted,marginTop:5}}>You can upload FIRs, vakalatnama, orders, affidavits, photos, medical records, or other supporting documents here.</div>
          </div>
          {(cas.docs||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:9}}>{(cas.docs||[]).map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:C.surface,borderRadius:8}}><span style={{fontSize:16}}>📄</span><div style={{fontSize:12.5,color:C.text}}>{d}</div></div>;})}</div>}
          {(cas.attachments||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{(cas.attachments||[]).map(function(file){return <div key={file.id} style={{padding:"10px 12px",background:C.surface,borderRadius:8}}><div style={{fontSize:12.5,color:C.text,fontWeight:600,lineHeight:1.4}}>{file.name}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{file.type||"Document"} · {formatBytes(file.size)} · {fmt(file.date)}</div>{file.dataUrl?<a href={file.dataUrl} download={file.name} style={{display:"inline-block",marginTop:6,fontSize:11,color:C.accent,textDecoration:"none"}}>Download file</a>:<div style={{fontSize:10,color:C.muted,marginTop:6}}>Metadata logged only</div>}</div>;})}</div>}
        </div>}
        {panel==="tasks"&&<div>
          <div style={{padding:"11px 13px",background:C.surface,borderRadius:8,marginBottom:11}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Task" value={tf.title} onChange={function(e){setTf(function(p){return Object.assign({},p,{title:e.target.value});});}} placeholder="e.g. Prepare brief"/><Sel label="Assign To" value={tf.assignedTo} onChange={function(e){setTf(function(p){return Object.assign({},p,{assignedTo:e.target.value});});}} options={allNames}/><Inp label="Deadline" type="date" value={tf.deadline} onChange={function(e){setTf(function(p){return Object.assign({},p,{deadline:e.target.value});});}}/></div>
            <Inp label="Instructions" value={tf.notes} onChange={function(e){setTf(function(p){return Object.assign({},p,{notes:e.target.value});});}} placeholder="Specific instructions..."/>
            <Btn size="sm" onClick={addTask}>Assign Task</Btn>
          </div>
          {tasks.filter(function(t){return t.caseId===sel;}).map(function(t){return <div key={t.id} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid "+C.border+"20"}}><input type="checkbox" checked={t.status==="done"} onChange={function(){setTasks(function(p){return p.map(function(x){return x.id===t.id?Object.assign({},x,{status:x.status==="done"?"pending":"done"}):x;});});}} style={{marginTop:3,accentColor:C.accent}}/><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600,color:t.status==="done"?C.dim:C.text,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</div>{t.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{t.notes}</div>}</div><div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}><Badge label={t.priority} color={t.priority==="high"?"red":"amber"}/><div style={{fontSize:10,color:dT(t.deadline)<0?C.red:C.dim}}>{t.deadline?(dT(t.deadline)<0?Math.abs(dT(t.deadline))+"d over":fmt(t.deadline)):"—"}</div></div></div>;})}
        </div>}
      </Card>
    </div>
  );
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:4}}>{["all","active","overdue","stayed","closed"].map(function(f){return <button key={f} onClick={function(){setFilter(f);}} style={{padding:"4px 10px",borderRadius:6,border:"none",background:filter===f?C.accent+"22":"transparent",color:filter===f?C.accent:C.dim,fontSize:11,fontWeight:filter===f?700:400,cursor:"pointer",textTransform:"capitalize"}}>{f}</button>;})}</div>
        <Btn size="sm" onClick={function(){setView("add");}}>+ Register Case</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {filtered.map(function(c){return <div key={c.id} onClick={function(){setSel(c.id);setView("detail");setPanel("diary");}} style={{padding:"13px 17px",borderRadius:10,cursor:"pointer",background:C.surface,border:"1px solid "+C.border}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}><div style={{fontWeight:700,fontSize:13,color:C.text,flex:1,marginRight:7,lineHeight:1.4}}>{c.title}</div><div style={{display:"flex",gap:3,flexShrink:0}}><Badge label={c.type.length>16?c.type.slice(0,16)+"…":c.type} color={c.type.includes("PIL")?"blue":c.type.includes("Writ")?"red":"amber"}/><Badge label={c.priority} color={c.priority==="high"?"red":"amber"}/></div></div>
          <div style={{fontSize:11,color:C.dim,marginBottom:2}}>{c.court} · {c.caseNo||"No. pending"}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><Dot color={c.status==="active"?C.green:c.status==="overdue"?C.red:C.muted}/><span style={{fontSize:11,color:C.dim,textTransform:"capitalize"}}>{c.status}</span>{dF(c.updatedAt)>7&&<Badge label={dF(c.updatedAt)+"d no update"} color="red"/>}{c.hearings&&c.hearings.filter(function(h){return dT(h.nextDate)>=0&&dT(h.nextDate)<=7;}).length>0&&<Badge label="Hearing this week" color="amber"/>}</div>
        </div>;})}
      </div>
    </div>
  );
}

// ── ACTIVITIES ────────────────────────────────────────────────────────────────
function Activities({activities,setActivities,team}){
  const [view,setView]=useState("list");const [sel,setSel]=useState(null);const [tf,setTf]=useState("all");const [form,setForm]=useState(ba());const [bulk,setBulk]=useState("");const [showReg,setShowReg]=useState(false);const [attName,setAttName]=useState("");const [attType,setAttType]=useState("Photo");
  function ba(){return{id:uid(),type:"Legal Aid Camp",title:"",location:"",district:BD[0],date:td(),coordinator:"Sachina",conductedBy:[],beneficiaries:0,casesIdentified:0,casesReferred:0,summary:"",status:"planned",followUp:"",participants:[],attachments:[],linkedCases:[]};}
  function save(){setActivities(function(p){return [...p,form];});setView("list");setForm(ba());}
  function addAtt(){if(!attName.trim())return;setForm(function(p){return Object.assign({},p,{attachments:[...p.attachments,{name:attName,type:attType,date:td()}]});});setAttName("");}
  function bulkAdd(id){const lines=bulk.trim().split("\n").filter(Boolean);const newP=lines.map(function(l){const pts=l.split(",");return{name:(pts[0]||"").trim(),phone:(pts[1]||"").trim()};}).filter(function(p){return p.name;});setActivities(function(prev){return prev.map(function(a){return a.id===id?Object.assign({},a,{participants:[...a.participants,...newP]}):a;});});setBulk("");setShowReg(false);}
  const allNames=team.filter(function(m){return m.status==="active";}).map(function(m){return m.name;});
  const filtered=tf==="all"?activities:activities.filter(function(a){return a.type===tf;});
  const tc={"Legal Aid Camp":"green","PLV Training":"purple","DLF Residential Training":"blue","Annual Consultation":"blue","Fact-Finding":"blue","Community Outreach":"amber"};
  const stats=[{l:"Total",v:activities.length,icon:"📋"},{l:"Beneficiaries",v:activities.reduce(function(s,a){return s+a.beneficiaries;},0),icon:"👥"},{l:"Cases Identified",v:activities.reduce(function(s,a){return s+a.casesIdentified;},0),icon:"⚖"},{l:"Registered",v:activities.reduce(function(s,a){return s+(a.participants||[]).length;},0),icon:"📝"},{l:"Cases Referred",v:activities.reduce(function(s,a){return s+a.casesReferred;},0),icon:"→"}];
  if(view==="add")return(
    <div>
      <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:14}}><Btn color="ghost" size="sm" onClick={function(){setView("list");}}>← Back</Btn><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text}}>Record Activity</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <Card>
          <Sec>Activity Details</Sec>
          <Sel label="Type" value={form.type} onChange={function(e){setForm(function(p){return Object.assign({},p,{type:e.target.value});});}} options={ATYPES}/>
          <Inp label="Title" value={form.title} onChange={function(e){setForm(function(p){return Object.assign({},p,{title:e.target.value});});}} placeholder="e.g. Legal Aid Camp — Ramchak Bariya"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Location" value={form.location} onChange={function(e){setForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="Village/Venue"/><Sel label="District" value={form.district} onChange={function(e){setForm(function(p){return Object.assign({},p,{district:e.target.value});});}} options={BD}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Date" type="date" value={form.date} onChange={function(e){setForm(function(p){return Object.assign({},p,{date:e.target.value});});}} /><Sel label="Coordinator" value={form.coordinator} onChange={function(e){setForm(function(p){return Object.assign({},p,{coordinator:e.target.value});});}} options={allNames}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Beneficiaries" type="number" value={form.beneficiaries} onChange={function(e){setForm(function(p){return Object.assign({},p,{beneficiaries:+e.target.value});});}}/><Inp label="Cases Identified" type="number" value={form.casesIdentified} onChange={function(e){setForm(function(p){return Object.assign({},p,{casesIdentified:+e.target.value});});}}/><Inp label="Cases Referred" type="number" value={form.casesReferred} onChange={function(e){setForm(function(p){return Object.assign({},p,{casesReferred:+e.target.value});});}}/></div>
          <Sel label="Status" value={form.status} onChange={function(e){setForm(function(p){return Object.assign({},p,{status:e.target.value});});}} options={["planned","ongoing","completed"]}/>
          <div style={{marginTop:4}}>
            <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Attachments (Photos, Reports, Videos)</div>
            <div style={{display:"flex",gap:7,marginBottom:7}}>
              <input value={attName} onChange={function(e){setAttName(e.target.value);}} placeholder="Attachment name (e.g. Camp photos, Fact-finding report)" style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12}}/>
              <select value={attType} onChange={function(e){setAttType(e.target.value);}} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12}}>
                {["Photo","Video","Report","Document","Other"].map(function(t){return <option key={t}>{t}</option>;})}
              </select>
              <Btn size="sm" onClick={addAtt}>+ Add</Btn>
            </div>
            {form.attachments.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{form.attachments.map(function(a,i){return <span key={i} style={{background:C.accentSoft,color:C.accent,borderRadius:5,padding:"3px 8px",fontSize:11}}>📎 {a.name} ({a.type})</span>;})}</div>}
            <div style={{fontSize:10,color:C.muted,marginTop:5}}>Upload actual files to Janman Google Drive activity folder. Log names here for reference.</div>
          </div>
        </Card>
        <Card>
          <Sec>Activity Report</Sec>
          <Inp label="Summary" value={form.summary} onChange={function(e){setForm(function(p){return Object.assign({},p,{summary:e.target.value});});}} rows={6} placeholder="Issues identified, proceedings, key observations..."/>
          <Inp label="Follow-up Actions" value={form.followUp} onChange={function(e){setForm(function(p){return Object.assign({},p,{followUp:e.target.value});});}} rows={3} placeholder="e.g. File representation for 3 MGNREGS cases..."/>
          <div style={{display:"flex",gap:8,marginTop:6}}><Btn onClick={save}>Save Activity</Btn><Btn color="ghost" onClick={function(){setView("list");}}>Cancel</Btn></div>
        </Card>
      </div>
    </div>
  );
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>{stats.map(function(s){return <Card key={s.l} style={{padding:"9px 12px",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{s.icon}</span><div><div style={{fontSize:18,fontWeight:700,color:C.accent}}>{s.v}</div><div style={{fontSize:9,color:C.dim}}>{s.l}</div></div></Card>;})}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["all",...ATYPES.slice(0,6)].map(function(t){return <button key={t} onClick={function(){setTf(t);}} style={{padding:"4px 8px",borderRadius:6,border:"none",background:tf===t?C.accent+"22":"transparent",color:tf===t?C.accent:C.dim,fontSize:10,fontWeight:tf===t?700:400,cursor:"pointer"}}>{t.length>14?t.slice(0,14)+"…":t}</button>;})}</div>
        <Btn size="sm" onClick={function(){setView("add");}}>+ Record Activity</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {filtered.map(function(a){return <div key={a.id} style={{borderRadius:10,background:C.surface,border:"1px solid "+(sel===a.id?C.accent+"55":C.border),overflow:"hidden"}}>
          <div onClick={function(){setSel(sel===a.id?null:a.id);}} style={{padding:"13px 16px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}><div style={{fontWeight:700,fontSize:13,color:C.text,flex:1,marginRight:7}}>{a.title}</div><div style={{display:"flex",gap:3}}><Badge label={a.type.length>12?a.type.slice(0,12)+"…":a.type} color={tc[a.type]||"amber"}/><Badge label={a.status} color={a.status==="completed"?"green":a.status==="planned"?"blue":"amber"}/></div></div>
            <div style={{fontSize:11,color:C.dim,marginBottom:2}}>📍 {a.location}, {a.district} · {fmt(a.date)}</div>
            <div style={{display:"flex",gap:10}}><span style={{fontSize:12,color:C.text}}>👥 {a.beneficiaries}</span><span style={{fontSize:12,color:C.accent}}>⚖ {a.casesIdentified}</span><span style={{fontSize:12,color:C.green}}>📝 {(a.participants||[]).length}</span>{(a.attachments||[]).length>0&&<span style={{fontSize:12,color:C.purple}}>📎 {a.attachments.length}</span>}</div>
          </div>
          {sel===a.id&&<div style={{padding:"0 16px 13px",borderTop:"1px solid "+C.border}}>
            {a.summary&&<div style={{fontSize:12.5,color:C.text,lineHeight:1.75,marginBottom:7,paddingTop:10}}>{a.summary}</div>}
            {a.followUp&&<div style={{background:C.accent+"15",borderRadius:7,padding:"7px 11px",fontSize:12,color:C.accent,marginBottom:9}}>Follow-up: {a.followUp}</div>}
            {(a.attachments||[]).length>0&&<div style={{marginBottom:9}}><div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.8,marginBottom:5}}>Attachments</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{a.attachments.map(function(at,i){return <span key={i} style={{background:C.accentSoft,color:C.accent,borderRadius:5,padding:"3px 8px",fontSize:11}}>📎 {at.name} ({at.type})</span>;})}</div></div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.8}}>Participants ({(a.participants||[]).length})</div><Btn size="sm" color="ghost" onClick={function(){setShowReg(!showReg);}}>+ Bulk Add</Btn></div>
            {showReg&&<div style={{background:C.surface,borderRadius:8,padding:"9px 11px",marginBottom:9}}>
              <div style={{fontSize:10,color:C.dim,marginBottom:5}}>One per line: Name, Phone</div>
              <textarea value={bulk} onChange={function(e){setBulk(e.target.value);}} rows={3} placeholder={"Ramkali Devi, 9876543210\nSunita Paswan, 9876543211"} style={{width:"100%",background:C.bg,border:"1px solid "+C.border,borderRadius:6,padding:"7px 9px",color:C.text,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:6,marginTop:6}}><Btn size="sm" onClick={function(){bulkAdd(a.id);}}>Add All</Btn><Btn size="sm" color="ghost" onClick={function(){setShowReg(false);}}>Cancel</Btn></div>
            </div>}
            {(a.participants||[]).length>0&&<div style={{maxHeight:120,overflowY:"auto"}}>{a.participants.map(function(p,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 7px",background:i%2===0?C.bg:"transparent",borderRadius:5,fontSize:11}}><span style={{color:C.text}}>{p.name}</span><span style={{color:C.dim}}>{p.phone}</span></div>;})}</div>}
          </div>}
        </div>;})}
      </div>
    </div>
  );
}

// ── FINANCE ───────────────────────────────────────────────────────────────────
function Finance({finance,setFinance}){
  const [form,setForm]=useState({date:td(),type:"expense",amount:"",category:"Camp/Training Expenses",project:"Jan Nyaya Abhiyan",description:"",approvedBy:"Shashwat"});
  const [show,setShow]=useState(false);const [filter,setFilter]=useState("all");
  function add(){if(!form.amount||!form.description)return;setFinance(function(p){return [{id:uid(),...form,amount:+form.amount},...p];});setShow(false);}
  const filtered=filter==="all"?finance:finance.filter(function(f){return f.type===filter;});
  const tG=finance.filter(function(f){return f.type==="grant";}).reduce(function(s,f){return s+f.amount;},0);
  const tE=finance.filter(function(f){return f.type==="expense";}).reduce(function(s,f){return s+f.amount;},0);
  const expByCat=[...new Set(finance.filter(function(f){return f.type==="expense";}).map(function(f){return f.category;}))].map(function(cat){return{cat,amt:finance.filter(function(f){return f.type==="expense"&&f.category===cat;}).reduce(function(s,f){return s+f.amount;},0)};}).sort(function(a,b){return b.amt-a.amt;});
  const maxE=Math.max(...expByCat.map(function(x){return x.amt;}),1);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:13}}>
        {[{l:"Total Grants Received",v:tG,col:C.green,icon:"💰"},{l:"Total Expenditure",v:tE,col:C.red,icon:"💸"},{l:"Balance",v:tG-tE,col:(tG-tE)>=0?C.green:C.red,icon:"⚖"}].map(function(s){return <Card key={s.l} style={{padding:"13px 16px"}}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>{s.icon} {s.l}</div><div style={{fontSize:21,fontWeight:700,color:s.col}}>₹{Math.abs(s.v).toLocaleString("en-IN")}</div></Card>;})}</div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:13}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
            <div style={{display:"flex",gap:4}}>{["all","grant","expense"].map(function(f){return <button key={f} onClick={function(){setFilter(f);}} style={{padding:"4px 9px",borderRadius:6,border:"none",background:filter===f?C.accent+"22":"transparent",color:filter===f?C.accent:C.dim,fontSize:10,fontWeight:filter===f?700:400,cursor:"pointer"}}>{f==="grant"?"Grants":f==="expense"?"Expenses":"All"}</button>;})}</div>
            <Btn size="sm" onClick={function(){setShow(!show);}}>+ Add Entry</Btn>
          </div>
          {show&&<Card style={{marginBottom:10}}>
            <Sec>New Transaction</Sec>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Sel label="Type" value={form.type} onChange={function(e){setForm(function(p){return Object.assign({},p,{type:e.target.value,category:e.target.value==="grant"?"Core Grant":"Camp/Training Expenses"});});}} options={[{value:"grant",label:"Grant / Donation Received"},{value:"expense",label:"Expenditure"}]}/><Inp label="Date" type="date" value={form.date} onChange={function(e){setForm(function(p){return Object.assign({},p,{date:e.target.value});})}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Amount (₹)" type="number" value={form.amount} onChange={function(e){setForm(function(p){return Object.assign({},p,{amount:e.target.value});});}} placeholder="0"/><Sel label="Category" value={form.category} onChange={function(e){setForm(function(p){return Object.assign({},p,{category:e.target.value});});}} options={form.type==="grant"?GCATS:["Salary/Honorarium","Travel & Boarding","Camp/Training Expenses","Case Filing","Printing & Materials","Office Expenses","Communication","Audit & Compliance","Other"]}/></div>
            <Inp label="Description" value={form.description} onChange={function(e){setForm(function(p){return Object.assign({},p,{description:e.target.value});});}} placeholder="Brief description..."/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Project" value={form.project} onChange={function(e){setForm(function(p){return Object.assign({},p,{project:e.target.value});});}}/><Sel label="Approved By" value={form.approvedBy} onChange={function(e){setForm(function(p){return Object.assign({},p,{approvedBy:e.target.value});});}} options={["Shashwat","Shourya Roy","Roshin Jacob"]}/></div>
            <div style={{display:"flex",gap:7}}><Btn size="sm" onClick={add}>Save</Btn><Btn size="sm" color="ghost" onClick={function(){setShow(false);}}>Cancel</Btn></div>
          </Card>}
          <Card>{filtered.map(function(f){return <div key={f.id} style={{display:"flex",gap:9,alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+C.border+"20"}}><div style={{width:28,height:28,borderRadius:7,background:(f.type==="grant"?C.green:C.red)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{f.type==="grant"?"↓":"↑"}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{f.description}</div><div style={{fontSize:10,color:C.dim}}>{f.category} · {f.project} · {fmt(f.date)} · {f.approvedBy}</div></div><div style={{fontSize:13,fontWeight:700,color:f.type==="grant"?C.green:C.red,flexShrink:0}}>{f.type==="grant"?"+":"-"}₹{f.amount.toLocaleString("en-IN")}</div></div>;})}
          </Card>
        </div>
        <Card>
          <Sec>Expenses by Category</Sec>
          {expByCat.map(function(item){return <div key={item.cat} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><div style={{fontSize:11,color:C.text}}>{item.cat}</div><div style={{fontSize:11,fontWeight:600,color:C.accent}}>₹{item.amt.toLocaleString("en-IN")}</div></div><div style={{height:5,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(item.amt/maxE*100)+"%",background:C.accent,borderRadius:2}}/></div></div>;})}
        </Card>
      </div>
    </div>
  );
}

// ── EXPENSE LOG ───────────────────────────────────────────────────────────────
function ExpenseLog({team}){
  const [entries,setEntries]=useState([]);const [show,setShow]=useState(false);const [filter,setFilter]=useState("all");
  const [form,setForm]=useState({date:td(),category:"Travel – Auto/Cab",amount:"",paidBy:"Shashwat",project:"Jan Nyaya Abhiyan",purpose:"",location:"",notes:"",attachments:[],approvedBy:"Shashwat"});
  const [attN,setAttN]=useState("");const [attT,setAttT]=useState("Receipt");
  useEffect(function(){sg("jnf_exp").then(function(d){if(d)setEntries(d);});},[]); useEffect(function(){ss("jnf_exp",entries);},[entries]);
  function addAtt(){if(!attN.trim())return;setForm(function(p){return Object.assign({},p,{attachments:[...p.attachments,{name:attN,type:attT,date:td()}]});});setAttN("");}
  function save(){if(!form.amount||!form.purpose)return;setEntries(function(p){return [{id:uid(),...form,amount:+form.amount},...p];});setForm({date:td(),category:"Travel – Auto/Cab",amount:"",paidBy:"Shashwat",project:"Jan Nyaya Abhiyan",purpose:"",location:"",notes:"",attachments:[],approvedBy:"Shashwat"});setShow(false);}
  const allNames=team.filter(function(m){return m.status==="active";}).map(function(m){return m.name;});
  const filtered=filter==="all"?entries:entries.filter(function(e){return e.category.startsWith(filter);});
  const total=entries.reduce(function(s,e){return s+e.amount;},0);
  const byPerson={};entries.forEach(function(e){byPerson[e.paidBy]=(byPerson[e.paidBy]||0)+e.amount;});
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:13}}>
        <Card style={{padding:"12px 15px"}}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>💸 Total Logged</div><div style={{fontSize:20,fontWeight:700,color:C.red}}>₹{total.toLocaleString("en-IN")}</div></Card>
        <Card style={{padding:"12px 15px"}}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>📋 Entries</div><div style={{fontSize:20,fontWeight:700,color:C.accent}}>{entries.length}</div></Card>
        <Card style={{padding:"12px 15px"}}><div style={{fontSize:10,color:C.dim,marginBottom:7}}>By Person</div>{Object.entries(byPerson).slice(0,3).map(function(item){return <div key={item[0]} style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:C.text}}>{item[0]}</span><span style={{color:C.accent,fontWeight:600}}>₹{item[1].toLocaleString("en-IN")}</span></div>;})}</Card>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",gap:4}}>{["all","Travel","Camp","Court","PLV"].map(function(f){return <button key={f} onClick={function(){setFilter(f);}} style={{padding:"4px 9px",borderRadius:6,border:"none",background:filter===f?C.accent+"22":"transparent",color:filter===f?C.accent:C.dim,fontSize:10,fontWeight:filter===f?700:400,cursor:"pointer"}}>{f}</button>;})}</div>
        <Btn size="sm" onClick={function(){setShow(!show);}}>+ Log Expense</Btn>
      </div>
      {show&&<Card style={{marginBottom:12}}>
        <Sec>Log Expense / Activity Cost</Sec>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Date" type="date" value={form.date} onChange={function(e){setForm(function(p){return Object.assign({},p,{date:e.target.value});})}}/><Sel label="Category" value={form.category} onChange={function(e){setForm(function(p){return Object.assign({},p,{category:e.target.value});});}} options={ECATS}/><Inp label="Amount (₹)" type="number" value={form.amount} onChange={function(e){setForm(function(p){return Object.assign({},p,{amount:e.target.value});});}} placeholder="0"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Purpose / Description" value={form.purpose} onChange={function(e){setForm(function(p){return Object.assign({},p,{purpose:e.target.value});});}} placeholder="e.g. Travel to Darbhanga for fact-finding"/><Inp label="Location / Route" value={form.location} onChange={function(e){setForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="e.g. Purnia → Darbhanga"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Sel label="Paid By" value={form.paidBy} onChange={function(e){setForm(function(p){return Object.assign({},p,{paidBy:e.target.value});});}} options={allNames}/><Sel label="Approved By" value={form.approvedBy} onChange={function(e){setForm(function(p){return Object.assign({},p,{approvedBy:e.target.value});});}} options={["Shashwat","Shourya Roy","Roshin Jacob"]}/><Inp label="Project" value={form.project} onChange={function(e){setForm(function(p){return Object.assign({},p,{project:e.target.value});})}}/></div>
        <Inp label="Notes (Drive link, remarks)" value={form.notes} onChange={function(e){setForm(function(p){return Object.assign({},p,{notes:e.target.value});});}} placeholder="Paste Google Drive link to bill/receipt here..."/>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Attachment Log (Bills, Receipts, Photos)</div>
          <div style={{display:"flex",gap:7,marginBottom:7}}><input value={attN} onChange={function(e){setAttN(e.target.value);}} placeholder="Attachment name (e.g. Petrol receipt – Rs 450)" style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12}}/><select value={attT} onChange={function(e){setAttT(e.target.value);}} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12}}>{["Receipt","Bill","Photo","Invoice","Ticket","Other"].map(function(t){return <option key={t}>{t}</option>;})}</select><Btn size="sm" onClick={addAtt}>+ Add</Btn></div>
          {form.attachments.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{form.attachments.map(function(a,i){return <span key={i} style={{background:C.accentSoft,color:C.accent,borderRadius:5,padding:"3px 8px",fontSize:11}}>📎 {a.name} ({a.type})</span>;})}</div>}
        </div>
        <div style={{display:"flex",gap:7}}><Btn onClick={save}>Save Expense</Btn><Btn color="ghost" onClick={function(){setShow(false);}}>Cancel</Btn></div>
      </Card>}
      <Card>{filtered.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:20}}>No expense entries yet. Click "+ Log Expense" to start recording.</div>}{filtered.map(function(e){return <div key={e.id} style={{display:"flex",gap:9,padding:"10px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}><div style={{width:30,height:30,borderRadius:7,background:C.red+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>💸</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.text}}>{e.purpose}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{e.category} · {e.location||e.project} · {fmt(e.date)} · {e.paidBy}</div>{e.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>📝 {e.notes}</div>}{e.attachments&&e.attachments.length>0&&<div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>{e.attachments.map(function(a,i){return <span key={i} style={{fontSize:10,color:C.accent,background:C.accentSoft,borderRadius:4,padding:"2px 6px"}}>📎 {a.name}</span>;})}</div>}</div><div style={{fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>–₹{e.amount.toLocaleString("en-IN")}</div></div>;})}</Card>
    </div>
  );
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────
function Projects({team,tasks,setTasks,cases,finance}){
  const [projects,setProjects]=useState(IPROJECTS);const [sel,setSel]=useState("pr1");const [pTab,setPTab]=useState("overview");const [showM,setShowM]=useState(false);const [mf,setMf]=useState({title:"",due:"",status:"pending"});const [showT,setShowT]=useState(false);const [tf,setTf]=useState({title:"",assignedTo:"Shashwat",deadline:"",priority:"medium",notes:""});
  const selP=projects.find(function(p){return p.id===sel;});if(!selP)return null;
  const spent=finance.filter(function(f){return f.type==="expense";}).reduce(function(s,f){return s+f.amount;},0);
  const received=selP.totalAmount||selP.budget||0;const util=received>0?Math.min(Math.round(spent/received*100),100):0;
  const pTasks=tasks.filter(function(t){return selP.team.includes(t.assignedTo);});
  function addM(){if(!mf.title.trim())return;setProjects(function(p){return p.map(function(pr){return pr.id===sel?Object.assign({},pr,{milestones:[...pr.milestones,Object.assign({id:uid()},mf)]}):pr;});});setMf({title:"",due:"",status:"pending"});setShowM(false);}
  function toggleM(pid,mid){setProjects(function(p){return p.map(function(pr){return pr.id===pid?Object.assign({},pr,{milestones:pr.milestones.map(function(m){return m.id===mid?Object.assign({},m,{status:m.status==="done"?"pending":"done"}):m;})}):pr;});});}
  function addTask(){if(!tf.title.trim())return;setTasks(function(p){return [...p,Object.assign({id:uid()},tf,{caseId:null,status:"pending"})];});setTf({title:"",assignedTo:"Shashwat",deadline:"",priority:"medium",notes:""});setShowT(false);}
  const mc={done:C.green,inprogress:C.accent,pending:C.muted};
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:13,flexWrap:"wrap"}}>{projects.map(function(p){return <button key={p.id} onClick={function(){setSel(p.id);setPTab("overview");}} style={{padding:"9px 15px",borderRadius:9,border:"1px solid "+(sel===p.id?C.accent+"55":C.border),background:sel===p.id?C.accentSoft:C.surface,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:sel===p.id?C.accent:C.text}}>{p.name}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{p.code} · ₹{((p.budget||0)/1e5).toFixed(0)}L</div></button>;})}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:13}}>
        {[{l:"Budget",v:"₹"+((selP.budget||0)/1e5).toFixed(0)+"L",col:C.green},{l:"Spent",v:"₹"+(spent/1000).toFixed(0)+"K",col:C.red},{l:"Utilisation",v:util+"%",col:util>=70?C.green:C.accent},{l:"Days Left",v:dT(selP.endDate)>0?dT(selP.endDate)+"d":"Ended",col:dT(selP.endDate)>60?C.green:C.red}].map(function(s){return <Card key={s.l} style={{padding:"11px 14px"}}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>{s.l}</div><div style={{fontSize:19,fontWeight:700,color:s.col}}>{s.v}</div></Card>;})}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:13}}>{["overview","milestones","tasks","team"].map(function(t){return <button key={t} onClick={function(){setPTab(t);}} style={{padding:"5px 12px",borderRadius:6,border:"none",background:pTab===t?C.accentSoft:"transparent",color:pTab===t?C.accent:C.dim,fontSize:11,fontWeight:pTab===t?700:400,cursor:"pointer",textTransform:"capitalize"}}>{t==="tasks"?"Tasks ("+pTasks.filter(function(x){return x.status!=="done";}).length+")":t}</button>;})}</div>
      {pTab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <Card><Sec>Project Details</Sec>{[["Code",selP.code],["Funder",selP.funder],["Grant",selP.grant],["Lead",selP.lead],["Start",fmt(selP.startDate)],["End",fmt(selP.endDate)],["Status",selP.status.toUpperCase()]].map(function(item){return <div key={item[0]} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+C.border+"20",fontSize:12}}><span style={{color:C.dim}}>{item[0]}</span><span style={{color:C.text,fontWeight:600}}>{item[1]}</span></div>;})}<div style={{marginTop:11}}><div style={{fontSize:10,color:C.dim,marginBottom:5,textTransform:"uppercase",letterSpacing:.8}}>Budget Utilisation</div><div style={{height:7,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:util+"%",background:util>=85?C.green:util>=60?C.accent:C.muted,borderRadius:3}}/></div><div style={{fontSize:10,color:C.dim,marginTop:3}}>{util}% utilised</div></div></Card>
        <Card><Sec>Objectives</Sec>{selP.objectives.map(function(o,i){return <div key={i} style={{display:"flex",gap:7,padding:"5px 0",borderBottom:"1px solid "+C.border+"15",fontSize:12,color:C.text}}><span style={{color:C.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span>{o}</div>;})}</Card>
      </div>}
      {pTab==="milestones"&&<Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><Sec style={{marginBottom:0}}>Milestones</Sec><Btn size="sm" onClick={function(){setShowM(!showM);}}>+ Add</Btn></div>
        {showM&&<div style={{padding:"11px 13px",background:C.surface,borderRadius:8,marginBottom:11}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Milestone" value={mf.title} onChange={function(e){setMf(function(p){return Object.assign({},p,{title:e.target.value});});}} placeholder="Milestone description"/><Inp label="Due Date" type="date" value={mf.due} onChange={function(e){setMf(function(p){return Object.assign({},p,{due:e.target.value});})}}/><Sel label="Status" value={mf.status} onChange={function(e){setMf(function(p){return Object.assign({},p,{status:e.target.value});});}} options={["pending","inprogress","done"]}/></div><div style={{display:"flex",gap:7}}><Btn size="sm" onClick={addM}>Save</Btn><Btn size="sm" color="ghost" onClick={function(){setShowM(false);}}>Cancel</Btn></div></div>}
        {selP.milestones.map(function(m){const over=dT(m.due)<0&&m.status!=="done";return <div key={m.id} style={{display:"flex",gap:11,padding:"11px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"center"}}><div style={{width:26,height:26,borderRadius:7,background:mc[m.status]+"20",border:"2px solid "+mc[m.status],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,cursor:"pointer",flexShrink:0}} onClick={function(){toggleM(selP.id,m.id);}}>{m.status==="done"?"✓":m.status==="inprogress"?"◐":"○"}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:m.status==="done"?C.dim:C.text,textDecoration:m.status==="done"?"line-through":"none"}}>{m.title}</div><div style={{fontSize:11,color:over?C.red:C.dim,marginTop:2}}>Due: {fmt(m.due)}{over?" — OVERDUE":""}</div></div><Badge label={m.status==="inprogress"?"In Progress":m.status} color={m.status==="done"?"green":m.status==="inprogress"?"amber":"gray"}/></div>;})}
      </Card>}
      {pTab==="tasks"&&<Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><Sec style={{marginBottom:0}}>Project Tasks</Sec><Btn size="sm" onClick={function(){setShowT(!showT);}}>+ Assign Task</Btn></div>
        {showT&&<div style={{padding:"11px 13px",background:C.surface,borderRadius:8,marginBottom:11}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Task" value={tf.title} onChange={function(e){setTf(function(p){return Object.assign({},p,{title:e.target.value});});}}/><Sel label="Assign To" value={tf.assignedTo} onChange={function(e){setTf(function(p){return Object.assign({},p,{assignedTo:e.target.value});});}} options={selP.team}/><Inp label="Deadline" type="date" value={tf.deadline} onChange={function(e){setTf(function(p){return Object.assign({},p,{deadline:e.target.value});})}}/></div><Inp label="Instructions" value={tf.notes} onChange={function(e){setTf(function(p){return Object.assign({},p,{notes:e.target.value});})}}/><div style={{display:"flex",gap:7}}><Btn size="sm" onClick={addTask}>Assign</Btn><Btn size="sm" color="ghost" onClick={function(){setShowT(false);}}>Cancel</Btn></div></div>}
        {pTasks.map(function(t){return <div key={t.id} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}><input type="checkbox" checked={t.status==="done"} onChange={function(){setTasks(function(p){return p.map(function(x){return x.id===t.id?Object.assign({},x,{status:x.status==="done"?"pending":"done"}):x;});});}} style={{marginTop:3,accentColor:C.accent}}/><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600,color:t.status==="done"?C.dim:C.text,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</div><div style={{fontSize:11,color:C.accent,marginTop:1}}>{t.assignedTo}</div>{t.notes&&<div style={{fontSize:11,color:C.dim,marginTop:1}}>{t.notes}</div>}</div><div style={{fontSize:10,color:dT(t.deadline)<0?C.red:C.dim,flexShrink:0}}>{t.deadline?fmt(t.deadline):"—"}</div></div>;})}
      </Card>}
      {pTab==="team"&&<Card><Sec>Project Team</Sec><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{selP.team.map(function(name){const m=team.find(function(x){return x.name===name;});return <div key={name} style={{padding:"9px 12px",background:C.surface,borderRadius:8}}><div style={{fontWeight:600,fontSize:13,color:C.text}}>{name}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{m?m.role:""}</div></div>;})}</div></Card>}
    </div>
  );
}

// ── MONTHLY REPORTS ───────────────────────────────────────────────────────────
function MonthlyReports({team}){
  const [member,setMember]=useState(STAFF[0].name);const [month,setMonth]=useState(new Date().toISOString().slice(0,7));const [saved,setSaved]=useState([]);const [loading,setLoading]=useState(false);
  const mInfo=team.find(function(m){return m.name===member;});const isW=mInfo&&mInfo.type==="worker";
  const [lf,setLf]=useState({hearings:"",newCases:"",drafts:"",orders:"",witness:"",govtMtgs:"",civilMtgs:"",networking:"",communityVisits:"",plv:"",training:"",mentor:"",challenges:"",plan:""});
  const [wf,setWf]=useState({caseIntake:"",homeVisits:"",beneficiaries:"",referrals:"",osc:"",dlsa:"",cwc:"",ahtu:"",police:"",communityMtgs:"",legalLiteracy:"",plvCoord:"",documentation:"",challenges:"",plan:""});
  useEffect(function(){sg("jnf_mr").then(function(d){if(d)setSaved(d);});},[]); 
  async function saveReport(){const data=isW?wf:lf;const r={id:uid(),member,month,type:isW?"sw":"lawyer",data,createdAt:td()};const upd=[...saved.filter(function(x){return !(x.member===member&&x.month===month);}),r];setSaved(upd);await ss("jnf_mr",upd);}
  async function genSummary(){setLoading(true);const data=isW?wf:lf;const role=mInfo?mInfo.role:"";const p="Generate a professional monthly activity summary for "+member+" ("+role+") for the month of "+month+".\n\nData submitted:\n"+JSON.stringify(data,null,2)+"\n\nWrite: (1) Activity Summary (2) Key Achievements (3) Challenges (4) Plan for Next Month. Formal and concise.";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:p}]})});const d=await r.json();const txt=(d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");const r2={id:uid(),member,month,type:isW?"sw":"lawyer",data:isW?wf:lf,summary:txt,createdAt:td()};const upd=[...saved.filter(function(x){return !(x.member===member&&x.month===month);}),r2];setSaved(upd);await ss("jnf_mr",upd);}catch(e){}setLoading(false);}
  const existing=saved.find(function(r){return r.member===member&&r.month===month;});
  const activeNames=team.filter(function(m){return m.status==="active";}).map(function(m){return m.name;});
  function LRow(label,key,ph){return <Inp key={key} label={label} value={lf[key]||""} onChange={function(e){const v=e.target.value;setLf(function(p){const n=Object.assign({},p);n[key]=v;return n;});}} placeholder={ph||""}/>;}
  function WRow(label,key,ph){return <Inp key={key} label={label} value={wf[key]||""} onChange={function(e){const v=e.target.value;setWf(function(p){const n=Object.assign({},p);n[key]=v;return n;});}} placeholder={ph||""}/>;}
  return(
    <div style={{display:"grid",gridTemplateColumns:"210px 1fr",gap:13,alignItems:"start"}}>
      <div>
        <Card style={{marginBottom:10}}>
          <Sec>Select Member</Sec>
          <Sel label="Team Member" value={member} onChange={function(e){setMember(e.target.value);}} options={activeNames}/>
          <Inp label="Month" type="month" value={month} onChange={function(e){setMonth(e.target.value);}}/>
          <div style={{fontSize:11,color:C.dim,marginBottom:11}}>Type: <span style={{color:C.accent,fontWeight:700}}>{isW?"Social Worker":"Lawyer / Fellow"}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Btn onClick={saveReport} size="sm">💾 Save Draft</Btn>
            <Btn onClick={genSummary} disabled={loading} size="sm" color="blue">{loading?"⏳ Generating...":"✨ AI Summary"}</Btn>
          </div>
        </Card>
        <Card><Sec>Past Reports</Sec>{saved.length===0&&<div style={{fontSize:11,color:C.dim}}>No reports yet.</div>}{saved.slice().reverse().map(function(r){return <div key={r.id} style={{padding:"6px 0",borderBottom:"1px solid "+C.border+"20"}}><div style={{fontSize:12,fontWeight:600,color:C.text}}>{r.member}</div><div style={{fontSize:10,color:C.dim}}>{r.month} · {r.type==="sw"?"SW":"Lawyer"}</div>{r.summary&&<div style={{fontSize:10,color:C.green,marginTop:2}}>✓ Summary generated</div>}</div>;})}</Card>
      </div>
      <div>
        {existing&&existing.summary&&<Card style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><Sec style={{marginBottom:0}}>AI Monthly Summary</Sec><Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(existing.summary);}}>Copy</Btn></div><pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0}}>{existing.summary}</pre></Card>}
        <Card>
          <Sec>{isW?"Social Worker":"Lawyer / Fellow"} Monthly Report — {month}</Sec>
          {!isW&&<div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,letterSpacing:1,textTransform:"uppercase"}}>A. Litigation Activities</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{LRow("Hearings Attended","hearings","No. and courts")}{LRow("New Cases Registered","newCases","No. and brief description")}{LRow("Drafts / Filings / Applications","drafts","Documents drafted or filed")}{LRow("Court Orders / Judgments Obtained","orders","Orders secured")}</div>
            {LRow("Witness Examination / Evidence Recording","witness","Details if any")}
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>B. Networking & Stakeholder Engagement</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{LRow("Government / State Meetings","govtMtgs","SP, DM, DLSA, OSC meetings")}{LRow("Civil Society / NGO Meetings","civilMtgs","Partner orgs, networks")}</div>
            {LRow("Other Networking","networking","Bar association, collective meetings")}
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>C. Community & Training</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{LRow("Community Visits / Legal Aid Camps","communityVisits","No. and locations")}{LRow("PLV Training / Outreach","plv","No. of sessions, participants")}{LRow("Training / Learning Sessions Attended","training","Online or residential")}{LRow("Mentor Sessions / Supervision","mentor","Meetings with Shashwat or Roshin")}</div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>D. Reflection</div>
            {LRow("Challenges Faced","challenges","Systemic, procedural or personal challenges...")}{LRow("Plan for Next Month","plan","Key priorities and planned actions...")}
          </div>}
          {isW&&<div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,letterSpacing:1,textTransform:"uppercase"}}>A. Case Intake & Direct Support</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{WRow("New Cases Identified / Intake","caseIntake","No. and type")}{WRow("Home Visits Conducted","homeVisits","No. of visits and families")}{WRow("Total Beneficiaries Reached","beneficiaries","Individuals supported")}{WRow("Referrals Made","referrals","No. referred and where")}</div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>B. Institutional Coordination</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{WRow("OSC Visits","osc","Location, purpose, outcome")}{WRow("DLSA Coordination","dlsa","Meetings, cases referred")}{WRow("CWC Appearances","cwc","Cases, orders")}{WRow("AHTU Coordination","ahtu","Meetings, coordination")}{WRow("Police Station Visits","police","Stations visited, purpose, outcome")}</div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>C. Community & Outreach</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{WRow("Community Meetings","communityMtgs","No. of meetings, locations, attendance")}{WRow("Legal Literacy Sessions","legalLiteracy","No. of sessions, topics, participants")}{WRow("PLV Coordination","plvCoord","PLV supervision, deployment")}</div>
            <div style={{fontSize:10,color:C.accent,marginBottom:9,marginTop:6,letterSpacing:1,textTransform:"uppercase"}}>D. Documentation & Reflection</div>
            {WRow("Documentation Activities","documentation","Reports written, case files updated")}{WRow("Challenges Faced","challenges","Systemic or community-level challenges...")}{WRow("Plan for Next Month","plan","Key priorities and planned actions...")}
          </div>}
        </Card>
      </div>
    </div>
  );
}

// ── GRANT MANAGEMENT ──────────────────────────────────────────────────────────
function Grants(){
  const [sel,setSel]=useState("g1");const [gTab,setGTab]=useState("overview");const [cnP,setCnP]=useState("");const [cnOut,setCnOut]=useState("");const [loading,setLoading]=useState(false);
  const selG=IGRANTS.find(function(g){return g.id===sel;});if(!selG)return null;
  const totalSpent=selG.budgetHeads.reduce(function(s,h){return s+h.spent;},0);const totalBudget=selG.budgetHeads.reduce(function(s,h){return s+h.budgeted;},0);const received=selG.disbursements.filter(function(d){return d.status==="received";}).reduce(function(s,d){return s+d.amount;},0);const util=received>0?Math.round(totalSpent/received*100):0;
  async function genProposal(){if(!cnP.trim())return;setLoading(true);setCnOut("");const p="You are the Director of Janman Peoples Foundation (Jan Nyaya Abhiyan). Write a professional grant concept note.\n\nOrganisation: Janman Peoples Foundation — Jan Nyaya Abhiyan, Bihar\nExisting grants: APPI Grant No. R 2409-19929 (Rs 60L, 3 years, July 2024-June 2027) + DLF Addendum (Rs 45.28L, 18 months). Active in 6 districts.\n\nPROPOSAL BRIEF:\n"+cnP+"\n\nGenerate full concept note:\n1. Executive Summary\n2. Context and Problem Statement (Bihar-specific)\n3. Programme Approach and Theory of Change\n4. Key Interventions\n5. Implementation Plan (timeline)\n6. Team and Organisational Capacity\n7. Expected Outcomes and Impact Metrics\n8. Budget Outline (head-wise)\n9. Why This Partnership\n10. Conclusion\n\nProfessional, evidence-based, suitable for strategic philanthropic funders.";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:p}]})});const d=await r.json();setCnOut((d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error.");}catch(e){setCnOut("Error generating proposal.");}setLoading(false);}
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:13,flexWrap:"wrap"}}>{IGRANTS.map(function(g){return <button key={g.id} onClick={function(){setSel(g.id);setGTab("overview");}} style={{padding:"9px 14px",borderRadius:9,border:"1px solid "+(sel===g.id?C.accent+"55":C.border),background:sel===g.id?C.accentSoft:C.surface,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:sel===g.id?C.accent:C.text}}>{g.funder}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{g.grantNo} · ₹{(g.totalAmount/1e5).toFixed(0)}L · {g.period}</div></button>;})}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:13}}>{[{l:"Total Grant",v:"₹"+(selG.totalAmount/1e5).toFixed(1)+"L",col:C.green,icon:"💰"},{l:"Received",v:"₹"+(received/1e5).toFixed(1)+"L",col:C.blue,icon:"↓"},{l:"Spent",v:"₹"+(totalSpent/1000).toFixed(0)+"K",col:C.accent,icon:"↑"},{l:"Utilisation",v:util+"%",col:util>=85?C.green:util>=60?C.accent:C.red,icon:"📊"}].map(function(s){return <Card key={s.l} style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:11}}><div style={{width:32,height:32,borderRadius:8,background:s.col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{s.icon}</div><div><div style={{fontSize:19,fontWeight:700,color:s.col}}>{s.v}</div><div style={{fontSize:10,color:C.dim}}>{s.l}</div></div></Card>;})}</div>
      <div style={{display:"flex",gap:4,marginBottom:13}}>{["overview","disbursements","budget","compliance","proposal"].map(function(t){return <button key={t} onClick={function(){setGTab(t);}} style={{padding:"5px 12px",borderRadius:6,border:"none",background:gTab===t?C.accentSoft:"transparent",color:gTab===t?C.accent:C.dim,fontSize:11,fontWeight:gTab===t?700:400,cursor:"pointer",textTransform:"capitalize"}}>{t==="proposal"?"New Proposal":t}</button>;})}</div>
      {gTab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}><Card><Sec>Grant Details</Sec>{[["Funder",selG.funder],["Grant No.",selG.grantNo],["Project",selG.project],["Total Amount","₹"+selG.totalAmount.toLocaleString("en-IN")],["Period",selG.period],["Start",fmt(selG.startDate)],["End",fmt(selG.endDate)],["Days Remaining",dT(selG.endDate)>0?dT(selG.endDate)+" days":"Period ended"]].map(function(item){return <div key={item[0]} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+C.border+"20",fontSize:12}}><span style={{color:C.dim,flexShrink:0,marginRight:9}}>{item[0]}</span><span style={{color:C.text,fontWeight:600,textAlign:"right"}}>{item[1]}</span></div>;})}</Card><Card><Sec>Conditions & Notes</Sec><div style={{fontSize:12.5,color:C.text,lineHeight:1.85,marginBottom:14}}>{selG.notes}</div><div style={{height:7,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(Math.max(0,Math.round((1-dT(selG.endDate)/(dT(selG.endDate)+dF(selG.startDate)))*100)),100)+"%",background:C.accent,borderRadius:3}}/></div><div style={{fontSize:11,color:C.dim,marginTop:4}}>{dT(selG.endDate)>0?dT(selG.endDate)+" days remaining":"Grant period ended"}</div></Card></div>}
      {gTab==="disbursements"&&<Card><Sec>Disbursement Schedule</Sec>{selG.disbursements.map(function(d){return <div key={d.id} style={{display:"flex",gap:11,padding:"12px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"center"}}><div style={{width:32,height:32,borderRadius:8,background:(d.status==="received"?C.green:C.muted)+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{d.status==="received"?"✓":"○"}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.text}}>{d.label}</div><div style={{fontSize:11,color:C.dim}}>Date: {fmt(d.date)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:d.status==="received"?C.green:C.dim}}>₹{d.amount.toLocaleString("en-IN")}</div><Badge label={d.status} color={d.status==="received"?"green":"gray"}/></div></div>;})}<div style={{marginTop:12,padding:"9px 13px",background:C.accentSoft,borderRadius:8,fontSize:12,color:C.accent}}>Subsequent disbursements require 85% utilisation of prior tranche and satisfactory achievement of programme outcomes as per Annexure-3.</div></Card>}
      {gTab==="budget"&&<Card><Sec>Budget vs Actual — APPI Annexure-1 Budget Heads</Sec><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid "+C.border}}>{["Budget Head","Budgeted (₹)","Spent (₹)","Balance (₹)","Utilisation"].map(function(h){return <th key={h} style={{textAlign:"left",padding:"7px 9px",color:C.dim,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:.7}}>{h}</th>;})}</tr></thead><tbody>{selG.budgetHeads.map(function(h){const bal=h.budgeted-h.spent;const u=h.budgeted>0?Math.round(h.spent/h.budgeted*100):0;return <tr key={h.head} style={{borderBottom:"1px solid "+C.border+"20"}}><td style={{padding:"8px 9px",color:C.text,fontWeight:500}}>{h.head}</td><td style={{padding:"8px 9px",color:C.text}}>₹{h.budgeted.toLocaleString("en-IN")}</td><td style={{padding:"8px 9px",color:C.red}}>₹{h.spent.toLocaleString("en-IN")}</td><td style={{padding:"8px 9px",color:bal>=0?C.green:C.red}}>₹{Math.abs(bal).toLocaleString("en-IN")}</td><td style={{padding:"8px 9px"}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:50,height:4,background:C.border,borderRadius:2}}><div style={{height:"100%",width:Math.min(u,100)+"%",background:u>=85?C.green:u>=50?C.accent:C.muted,borderRadius:2}}/></div><span style={{color:C.dim,fontSize:10}}>{u}%</span></div></td></tr>;})}
      <tr style={{borderTop:"2px solid "+C.border}}><td style={{padding:"8px 9px",color:C.accent,fontWeight:700}}>TOTAL</td><td style={{padding:"8px 9px",color:C.text}}>₹{totalBudget.toLocaleString("en-IN")}</td><td style={{padding:"8px 9px",color:C.red}}>₹{totalSpent.toLocaleString("en-IN")}</td><td style={{padding:"8px 9px",color:(totalBudget-totalSpent)>=0?C.green:C.red}}>₹{Math.abs(totalBudget-totalSpent).toLocaleString("en-IN")}</td><td style={{padding:"8px 9px",color:util>=85?C.green:util>=60?C.accent:C.red,fontWeight:700}}>{util}%</td></tr></tbody></table></div></Card>}
      {gTab==="compliance"&&<Card><Sec>Compliance Calendar</Sec>{selG.compliance.map(function(c){const over=dT(c.due)<0&&c.status!=="done";const near=dT(c.due)>=0&&dT(c.due)<=30&&c.status!=="done";return <div key={c.id} style={{display:"flex",gap:11,padding:"12px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"center"}}><div style={{width:32,height:32,borderRadius:8,background:(c.status==="done"?C.green:over?C.red:near?C.accent:C.muted)+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{c.status==="done"?"✓":over?"!":"○"}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.text}}>{c.item}</div><div style={{fontSize:11,color:over?C.red:C.dim,marginTop:2}}>Due: {fmt(c.due)}{over?" — OVERDUE":near?" — Due in "+dT(c.due)+" days":""}</div></div><Badge label={c.status==="done"?"Submitted":over?"Overdue":near?"Due Soon":"Pending"} color={c.status==="done"?"green":over?"red":near?"amber":"gray"}/></div>;})}</Card>}
      {gTab==="proposal"&&<div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:13}}>
        <Card><Sec>New Grant Proposal</Sec><Inp label="Describe the proposed programme" value={cnP} onChange={function(e){setCnP(e.target.value);}} rows={9} placeholder="e.g. Expansion of DLF to 10 districts including Begusarai. Focus on SC/ST Atrocities. 2-year programme. Target funder: Tata Trusts / Rohini Nilekani. Budget: Rs 90L."/><Btn onClick={genProposal} disabled={loading} style={{width:"100%",marginTop:4}}>{loading?"⏳ Drafting...":"📄 Generate Concept Note"}</Btn></Card>
        <Card style={{minHeight:400}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><Sec style={{marginBottom:0}}>Concept Note Output</Sec>{cnOut&&<Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(cnOut);}}>Copy</Btn>}</div>{loading&&<div style={{color:C.dim,fontSize:13}}>Drafting concept note with Janman programme history pre-filled...</div>}{!loading&&cnOut&&<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:500,overflowY:"auto"}}>{cnOut}</pre>}{!loading&&!cnOut&&<div style={{color:C.dim,fontSize:13,lineHeight:1.9}}>Describe the proposed programme, target funder, geography, focus areas, duration, and indicative budget. The AI will generate a professional concept note pre-populated with Janman's track record, team credentials, and existing grant history.</div>}</Card>
      </div>}
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({cases,activities,finance,tasks,team}){
  const [rType,setRType]=useState("donor");const [period,setPeriod]=useState("Year 1 (July 2024 — June 2025)");const [out,setOut]=useState("");const [loading,setLoading]=useState(false);
  const [uploads,setUploads]=useState([]);const [uploadNotes,setUploadNotes]=useState("");
  useEffect(function(){sg("jnf_report_uploads").then(function(d){if(d)setUploads(d);});sg("jnf_report_upload_notes").then(function(d){if(d)setUploadNotes(d);});},[]);
  useEffect(function(){ss("jnf_report_uploads",uploads);},[uploads]);
  useEffect(function(){ss("jnf_report_upload_notes",uploadNotes);},[uploadNotes]);
  async function addUploads(fileList){
    const files=await filesToAttachments(fileList,2500000);
    if(!files.length)return;
    setUploads(function(p){return [...p,...files];});
  }
  function removeUpload(id){setUploads(function(p){return p.filter(function(file){return file.id!==id;});});}
  async function gen(){
    setLoading(true);setOut("");
    const tBen=activities.reduce(function(s,a){return s+a.beneficiaries;},0);const tG=finance.filter(function(f){return f.type==="grant";}).reduce(function(s,f){return s+f.amount;},0);const tE=finance.filter(function(f){return f.type==="expense";}).reduce(function(s,f){return s+f.amount;},0);
    const uploadCtx=uploads.length?"\n\nSUPPORTING REPORTS / DOCUMENTS:\n"+uploads.map(function(file){return "- "+file.name+" | "+(file.type||"Document")+" | "+formatBytes(file.size)+" | "+(file.persisted?"stored locally":"metadata only");}).join("\n"):"";
    const notesCtx=uploadNotes.trim()?"\n\nUSER NOTES ABOUT UPLOADS:\n"+uploadNotes.trim():"";
    const ctx="Janman Peoples Foundation — Jan Nyaya Abhiyan\nFunder: Azim Premji Philanthropic Initiatives (Grant No. R 2409-19929 + Addendum)\nPeriod: "+period+"\n\nCASES ("+cases.length+"):\n"+cases.map(function(c){return c.title+" | "+c.court+" | "+c.type+" | "+c.status+" | "+c.advocate;}).join("\n")+"\n\nACTIVITIES:\n"+activities.map(function(a){return a.title+" | "+a.type+" | "+a.location+" | "+fmt(a.date)+" | Beneficiaries: "+a.beneficiaries;}).join("\n")+"\nTotal beneficiaries: "+tBen+"\n\nTEAM: "+team.filter(function(m){return m.status==="active";}).map(function(m){return m.name+" ("+m.role+")";}).join(", ")+"\n\nFINANCE:\nTotal Grants: Rs "+tG.toLocaleString("en-IN")+"\nTotal Expenditure: Rs "+tE.toLocaleString("en-IN")+"\nBalance: Rs "+(tG-tE).toLocaleString("en-IN")+uploadCtx+notesCtx;
    const prompts={donor:"Write a formal donor progress report for "+period+" for APPI. Data:\n\n"+ctx+"\n\nStructure: Executive Summary | Programme Highlights | Case Docket Update | Field Activities Report | DLF Update | Financial Utilisation | Challenges & Mitigation | Way Forward.",appi:"Write Annual Progress Report in APPI format for Grant No. R 2409-19929. Period: "+period+". Data:\n\n"+ctx+"\n\nStructure per Annexure-2: 1. Progress against indicators 2. Annual Narrative Report 3. Fund Utilisation Report against budget categories (Annexure-1) 4. Challenges and course corrections.",internal:"Write a concise internal operational status brief for "+period+". Data:\n\n"+ctx+"\n\nFocus on: case status, overdue matters, team accountability, financial position, priorities for next 4 weeks."};
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1100,messages:[{role:"user",content:prompts[rType]}]})});const d=await r.json();setOut((d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error.");}catch(e){setOut("Error generating report.");}
    setLoading(false);
  }
  return(
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:13,alignItems:"start"}}>
      <div>
        <Card style={{marginBottom:10}}>
          <Sec>Generate Report</Sec>
          <Sel label="Report Type" value={rType} onChange={function(e){setRType(e.target.value);}} options={[{value:"donor",label:"Donor Progress Report"},{value:"appi",label:"APPI Annual Report (Annexure-2)"},{value:"internal",label:"Internal Status Brief"}]}/>
          <Inp label="Reporting Period" value={period} onChange={function(e){setPeriod(e.target.value);}}/>
          <Btn onClick={gen} disabled={loading} style={{width:"100%",marginTop:4}}>{loading?"⏳ Generating...":"📋 Generate Report"}</Btn>
        </Card>
        <Card style={{marginBottom:10}}>
          <Sec>Upload Reports / Documents</Sec>
          <input type="file" multiple onChange={async function(e){await addUploads(e.target.files);e.target.value="";}} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"8px 10px",color:C.text,fontSize:12.5,boxSizing:"border-box",marginBottom:9}}/>
          <Inp label="Notes About Uploaded Material" value={uploadNotes} onChange={function(e){setUploadNotes(e.target.value);}} rows={4} placeholder="e.g. Upload includes last quarter donor report, scanned attendance sheets, and draft field note from Purnia camp."/>
          <div style={{fontSize:10,color:C.muted}}>Use this for report annexures, prior reports, donor templates, attendance sheets, photos, or supporting documents.</div>
          {uploads.length>0&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>{uploads.map(function(file){return <div key={file.id} style={{padding:"9px 10px",background:C.surface,borderRadius:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:12,color:C.text,fontWeight:600,lineHeight:1.4}}>{file.name}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{file.type||"Document"} · {formatBytes(file.size)} · {file.persisted?"stored locally":"metadata only"}</div></div><button onClick={function(){removeUpload(file.id);}} style={{border:"none",background:"transparent",color:C.red,cursor:"pointer",fontSize:11}}>Remove</button></div>{file.dataUrl&&<a href={file.dataUrl} download={file.name} style={{display:"inline-block",marginTop:6,fontSize:11,color:C.accent,textDecoration:"none"}}>Download copy</a>}</div>;})}</div>}
        </Card>
        <Card><Sec>Live Data</Sec>{[["Cases",cases.length],["Activities",activities.length],["Beneficiaries",activities.reduce(function(s,a){return s+a.beneficiaries;},0)],["Grants","₹"+finance.filter(function(f){return f.type==="grant";}).reduce(function(s,f){return s+f.amount;},0).toLocaleString("en-IN")],["Expenditure","₹"+finance.filter(function(f){return f.type==="expense";}).reduce(function(s,f){return s+f.amount;},0).toLocaleString("en-IN")],["Pending Tasks",tasks.filter(function(t){return t.status!=="done";}).length]].map(function(item){return <div key={item[0]} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{color:C.dim}}>{item[0]}</span><span style={{color:C.text,fontWeight:600}}>{item[1]}</span></div>;})}</Card>
      </div>
      <Card style={{minHeight:500}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}><Sec style={{marginBottom:0}}>Report Output</Sec>{out&&<Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(out);}}>Copy</Btn>}</div>{loading&&<div style={{color:C.dim,fontSize:13}}>⏳ Synthesising live programme data and uploaded supporting material...</div>}{!loading&&out&&<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0}}>{out}</pre>}{!loading&&!out&&<div style={{color:C.dim,fontSize:13,lineHeight:1.9}}>Select a report type, optionally upload supporting reports or documents, and click Generate. The AI will combine live case, activity, finance and team data with your uploaded material notes to produce a professional report.</div>}</Card>
    </div>
  );
}

// ── DRAFTER ───────────────────────────────────────────────────────────────────
function Drafter({cases}){
  const [docType,setDocType]=useState("Criminal Writ Petition");const [linked,setLinked]=useState("");const [prompt,setPrompt]=useState("");const [out,setOut]=useState("");const [loading,setLoading]=useState(false);const [msgs,setMsgs]=useState([]);
  async function draft(){
    if(!prompt.trim())return;setLoading(true);
    const cas=linked?cases.find(function(c){return c.id===linked;}):null;
    const sys="You are a senior advocate with 25+ years at Patna High Court and Supreme Court, working with Janman Peoples Foundation — Jan Nyaya Abhiyan. Draft legal documents with precision citing SC and Patna HC precedents. Formal legal English for Indian courts. Always include: Court heading with full parties, case particulars, chronological statement of facts, legal grounds with citations (year, court, reporter), and prayer clause. Deep knowledge of Bihar courts, SC/ST Act, POCSO, CrPC/BNSS, PIL jurisprudence, PWDVA.";
    const um="Draft a "+docType+(cas?" for "+cas.client+" v. "+cas.respondent+" ("+cas.court+", "+cas.caseNo+", FIR: "+(cas.firNo||"N/A")+").\n\nFacts:\n"+cas.facts+"\n\nGrounds:\n"+cas.grounds+"\n\nRelief:\n"+cas.relief:"")+"\n\nAdvocate's directions: "+prompt;
    const nm=[...msgs,{role:"user",content:um}];setMsgs(nm);
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:nm})});const d=await r.json();const txt=(d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error.";setOut(txt);setMsgs([...nm,{role:"assistant",content:txt}]);}catch(e){setOut("Connection error.");}
    setLoading(false);setPrompt("");
  }
  return(
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:13,alignItems:"start"}}>
      <Card>
        <Sec>Senior Advocate Mode</Sec>
        <Sel label="Document Type" value={docType} onChange={function(e){setDocType(e.target.value);}} options={["Criminal Writ Petition","PIL","Anticipatory Bail Application","Regular Bail Application","Application u/s 156(3) CrPC","Application u/s 482 CrPC","Representation to SP / DM","Legal Notice","Affidavit","Revision Petition","Criminal Appeal","Contempt Petition","Protection Order Application (PWDVA)","Compensation Petition","Habeas Corpus"]}/>
        <Sel label="Link Case (optional)" value={linked} onChange={function(e){setLinked(e.target.value);}} options={[{value:"",label:"— None —"},...cases.map(function(c){return {value:c.id,label:c.client};})]}/>
        <Inp label="Your Directions" value={prompt} onChange={function(e){setPrompt(e.target.value);}} rows={7} placeholder="e.g. Chargesheet not filed in 6 months. IO not recording S.161 CrPC statements. Emphasise Lalita Kumari, Vineet Narain. Seek SIT appointment..."/>
        <Btn onClick={draft} disabled={loading} style={{width:"100%"}}>{loading?"⚖ Drafting...":"⚖ Draft Document"}</Btn>
        {msgs.length>0&&<Btn color="ghost" size="sm" onClick={function(){setMsgs([]);setOut("");}} style={{width:"100%",marginTop:7}}>Clear and Start New</Btn>}
      </Card>
      <Card style={{minHeight:500}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}><Sec style={{marginBottom:0}}>Draft Output</Sec>{out&&<Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(out);}}>Copy</Btn>}</div>{loading&&<div style={{color:C.dim,fontSize:13}}>⚖ Drafting in senior advocate mode...</div>}{!loading&&out&&<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0}}>{out}</pre>}{!loading&&!out&&<div style={{color:C.dim,fontSize:13,lineHeight:1.9}}>Select a document type, link a case to auto-pull facts and grounds, give your directions and receive a court-ready draft with full heading, facts, grounds with citations, and prayer clause.</div>}</Card>
    </div>
  );
}

// ── TEAM ──────────────────────────────────────────────────────────────────────
function Team({team,setTeam,tasks,setTasks,cases}){
  const [view,setView]=useState("list");const [sel,setSel]=useState(null);const [showAdd,setShowAdd]=useState(false);const [ol,setOl]=useState("");const [olLoad,setOlLoad]=useState(false);const [emailTo,setEmailTo]=useState("");const [emailMsg,setEmailMsg]=useState("");
  const [nf,setNf]=useState({name:"",role:"",type:"fellow",loc:"",dist:BD[0],phone:"",email:"",qual:"",join:td(),bio:""});
  const pt=tasks.filter(function(t){return t.status!=="done";});const selM=team.find(function(m){return m.id===sel;});
  function addMember(){const newUid="JNY-"+String(team.length+1).padStart(3,"0");const m=Object.assign({id:uid(),uid:newUid,status:"active"},nf);setTeam(function(p){return [...p,m];});setShowAdd(false);setNf({name:"",role:"",type:"fellow",loc:"",dist:BD[0],phone:"",email:"",qual:"",join:td(),bio:""});}
  function terminate(id){setTeam(function(p){return p.map(function(m){return m.id===id?Object.assign({},m,{status:"terminated",terminatedAt:td()}):m;});});}
  function reactivate(id){setTeam(function(p){return p.map(function(m){return m.id===id?Object.assign({},m,{status:"active"}):m;});});}
  async function genOl(){if(!selM)return;setOlLoad(true);setOl("");const sys="You are Shashwat, Director of Janman People's Foundation. Draft a formal consultancy engagement letter. Include: salutation, appointment details, role description, remuneration (district legal fellows receive Rs 25,000/month), duration 18 months, reporting structure to Shashwat (Director) and Roshin Jacob (Fellowship Coordinator), monthly reporting requirements, and confidentiality obligations. Janman People's Foundation, Jan Nyaya Abhiyan. APPI Grant No. R 2409-19929.";const prompt="Generate a consultancy offer letter for:\nName: "+selM.name+"\nRole: "+selM.role+"\nLocation: "+selM.loc+", "+selM.dist+"\nJoin Date: "+selM.join+"\nQualification: "+selM.qual+"\nProject: District Legal Fellowship Programme (Jan Nyaya Abhiyan)";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:[{role:"user",content:prompt}]})});const d=await r.json();setOl((d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error.");}catch(e){setOl("Error generating letter.");}setOlLoad(false);}
  async function sendEmail(){if(!selM||!ol||!emailTo)return;setEmailMsg("⏳ Sending via Gmail...");try{await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:"Send an email using Gmail. To: "+emailTo+". Subject: Appointment as "+selM.role+" — Janman People's Foundation. Body:\n\n"+ol}]})});setEmailMsg("✅ Offer letter sent successfully via Gmail.");}catch(e){setEmailMsg("❌ Email dispatch failed.");}setTimeout(function(){setEmailMsg("");},6000);}
  const tc={mentor:"amber",lawyer:"blue",fellow:"green",worker:"purple",consultant:"amber",coordinator:"blue",admin:"gray"};
  if(view==="detail"&&selM)return(
    <div>
      <Btn color="ghost" size="sm" onClick={function(){setView("list");}} style={{marginBottom:13}}>← Team</Btn>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:13}}>
        <div>
          <Card style={{marginBottom:11}}>
            <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:14}}><div style={{width:48,height:48,borderRadius:12,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,fontWeight:700,color:C.accent}}>{selM.name[0]}</div><div><div style={{fontWeight:700,fontSize:15,color:C.text}}>{selM.name}</div><div style={{fontSize:11,color:C.dim,marginTop:2}}>{selM.role}</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{selM.uid}</div></div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>{[["Location",selM.loc],["District",selM.dist],["Phone",selM.phone||"—"],["Email",selM.email||"—"],["Join Date",fmt(selM.join)],["Qualification",selM.qual]].map(function(item){return <div key={item[0]} style={{background:C.surface,borderRadius:7,padding:"7px 10px"}}><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{item[0]}</div><div style={{fontSize:11,color:C.text,fontWeight:600,wordBreak:"break-word"}}>{item[1]}</div></div>;})}</div>
            {selM.bio&&<div style={{fontSize:12,color:C.dim,lineHeight:1.7,marginBottom:12}}>{selM.bio}</div>}
            <div style={{display:"flex",gap:6}}>{selM.status==="active"?<Btn size="sm" color="red" onClick={function(){terminate(selM.id);}}>Terminate</Btn>:<Btn size="sm" color="green" onClick={function(){reactivate(selM.id);}}>Reactivate</Btn>}</div>
          </Card>
          <Card><Sec>Tasks</Sec>{pt.filter(function(t){return t.assignedTo===selM.name;}).map(function(t){return <div key={t.id} style={{padding:"6px 0",borderBottom:"1px solid "+C.border+"20",display:"flex",justifyContent:"space-between"}}><div style={{fontSize:12,color:C.text}}>{t.title}</div><div style={{fontSize:10,color:dT(t.deadline)<0?C.red:C.dim}}>{fmt(t.deadline)}</div></div>;})}{pt.filter(function(t){return t.assignedTo===selM.name;}).length===0&&<div style={{fontSize:12,color:C.dim}}>No pending tasks.</div>}</Card>
        </div>
        <Card>
          <Sec>Offer / Appointment Letter</Sec>
          <div style={{display:"flex",gap:7,marginBottom:11,flexWrap:"wrap"}}><Btn onClick={genOl} disabled={olLoad}>{olLoad?"⏳ Generating...":"📄 Generate Offer Letter"}</Btn>{ol&&<Btn color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(ol);}}>Copy Text</Btn>}</div>
          {ol&&<div><pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,background:C.surface,borderRadius:8,padding:"13px",maxHeight:360,overflowY:"auto",marginBottom:11}}>{ol}</pre><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><input value={emailTo} onChange={function(e){setEmailTo(e.target.value);}} placeholder="Recipient email address" style={{flex:1,minWidth:200,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12.5}}/><Btn color="blue" onClick={sendEmail}>📧 Send via Gmail</Btn></div>{emailMsg&&<div style={{fontSize:12,color:C.accent,marginTop:7,padding:"6px 10px",background:C.accentSoft,borderRadius:7}}>{emailMsg}</div>}</div>}
          {!ol&&!olLoad&&<div style={{fontSize:12.5,color:C.dim,lineHeight:1.8}}>Generate a formal appointment letter for {selM.name} pre-filled with Janman programme and grant details. Dispatch directly via Gmail.</div>}
        </Card>
      </div>
    </div>
  );
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><Sec style={{marginBottom:0}}>Team Registry</Sec><Btn size="sm" onClick={function(){setShowAdd(!showAdd);}}>+ Add Member</Btn></div>
      {showAdd&&<Card style={{marginBottom:13}}><Sec>New Team Member</Sec><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}><Inp label="Full Name" value={nf.name} onChange={function(e){setNf(function(p){return Object.assign({},p,{name:e.target.value});})}}/><Inp label="Role / Designation" value={nf.role} onChange={function(e){setNf(function(p){return Object.assign({},p,{role:e.target.value});})}}/><Sel label="Type" value={nf.type} onChange={function(e){setNf(function(p){return Object.assign({},p,{type:e.target.value});});}} options={["mentor","lawyer","fellow","consultant","coordinator","worker","admin"]}/><Inp label="Location" value={nf.loc} onChange={function(e){setNf(function(p){return Object.assign({},p,{loc:e.target.value});})}}/><Sel label="District" value={nf.dist} onChange={function(e){setNf(function(p){return Object.assign({},p,{dist:e.target.value});});}} options={BD}/><Inp label="Phone" value={nf.phone} onChange={function(e){setNf(function(p){return Object.assign({},p,{phone:e.target.value});})}}/><Inp label="Email" value={nf.email} onChange={function(e){setNf(function(p){return Object.assign({},p,{email:e.target.value});})}}/><Inp label="Join Date" type="date" value={nf.join} onChange={function(e){setNf(function(p){return Object.assign({},p,{join:e.target.value});})}}/></div><Inp label="Qualification" value={nf.qual} onChange={function(e){setNf(function(p){return Object.assign({},p,{qual:e.target.value});})}}/><Inp label="Biography" value={nf.bio} onChange={function(e){setNf(function(p){return Object.assign({},p,{bio:e.target.value});});}} rows={2}/><div style={{display:"flex",gap:7,marginTop:4}}><Btn onClick={addMember}>Add to Registry</Btn><Btn color="ghost" onClick={function(){setShowAdd(false);}}>Cancel</Btn></div></Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>{team.map(function(m){const mt=pt.filter(function(t){return t.assignedTo===m.name;});const od=mt.filter(function(t){return dT(t.deadline)<0;});return <div key={m.id} onClick={function(){setSel(m.id);setView("detail");setOl("");}} style={{padding:"14px 16px",borderRadius:10,cursor:"pointer",background:C.surface,border:"1px solid "+C.border,opacity:m.status==="terminated"?.6:1}}>
        <div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:9}}><div style={{width:36,height:36,borderRadius:9,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:C.accent,flexShrink:0}}>{m.name[0]}</div><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text}}>{m.name}</div><div style={{fontSize:10,color:C.dim,marginTop:1}}>{m.role}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{m.uid}</div></div></div>
        <div style={{fontSize:11,color:C.dim,marginBottom:5}}>📍 {m.loc}, {m.dist}</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}><Badge label={m.type} color={tc[m.type]||"amber"}/><Badge label={m.status} color={m.status==="active"?"green":m.status==="terminated"?"red":"gray"}/>{mt.length>0&&<Badge label={mt.length+" tasks"} color={od.length>0?"red":"amber"}/>}</div>
      </div>;})}
      </div>
    </div>
  );
}

// ── ACTIVITY AI PIPELINE ─────────────────────────────────────────────────────
function ActivityPipeline({team,setActivities}){
  const [step,setStep]=useState(0);
  const [savedActivities,setSavedActivities]=useState([]);
  const [saveMsg,setSaveMsg]=useState("");
  const [recipTab,setRecipTab]=useState("social");
  const [conceptNote,setConceptNote]=useState("");
  const [agendaText,setAgendaText]=useState("");
  const [speakers,setSpeakers]=useState("");
  const [socialMedia,setSocialMedia]=useState("");
  const [formalInvite,setFormalInvite]=useState("");
  const [checklist,setChecklist]=useState([]);
  const [logistics,setLogistics]=useState({});
  const [reportFmt,setReportFmt]=useState("");
  const [postActivitySocial,setPostActivitySocial]=useState("");
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
  const [setup,setSetup]=useState({role:"Program Manager",project:"pr1",activityType:"Legal Aid Camp",activityTitle:"",location:"",district:"Purnia",date:td(),endDate:"",coordinator:"Shashwat",budget:"",objectives:"",themes:[],orgsToLearnFrom:[],issues:"",acts:"",constitutional:"",targetAudience:"",expectedParticipants:"",specialGuests:""});

  useEffect(function(){sg("jnf_activity_pipeline_saved").then(function(d){if(d)setSavedActivities(d);});},[]);
  useEffect(function(){ss("jnf_activity_pipeline_saved",savedActivities);},[savedActivities]);

  const activeTeam=team.filter(function(m){return m.status==="active";}).map(function(m){return m.name;});
  const teamNames=activeTeam.length?activeTeam:STAFF.map(function(m){return m.name;});
  const selProject=IPROJECTS.find(function(p){return p.id===setup.project;})||IPROJECTS[0];
  const doneCount=checklist.filter(function(item){return item.done;}).length;
  const pctDone=checklist.length>0?Math.round(doneCount/checklist.length*100):0;

  function resetPipeline(){
    setStep(0);setRecipTab("social");setConceptNote("");setAgendaText("");setSpeakers("");setSocialMedia("");setFormalInvite("");
    setChecklist([]);setLogistics({});setReportFmt("");setPostActivitySocial("");setActionPoints("");setPostNotes("");setAttendance("");
    setKeyHighlights("");setMeetingDate(td());setMeetingTime("11:00");setMeetingAttendees([]);setMeetingAgenda("");setInviteName("");
    setInviteDesig("");setInviteEmail("");setInviteOrg("");setLoadingKeys({});setGanttVisible(false);setSaveMsg("");
    setSetup({role:"Program Manager",project:"pr1",activityType:"Legal Aid Camp",activityTitle:"",location:"",district:"Purnia",date:td(),endDate:"",coordinator:"Shashwat",budget:"",objectives:"",themes:[],orgsToLearnFrom:[],issues:"",acts:"",constitutional:"",targetAudience:"",expectedParticipants:"",specialGuests:""});
  }
  function setLoad(key,value){setLoadingKeys(function(prev){return Object.assign({},prev,{[key]:value});});}
  function isLoading(key){return !!loadingKeys[key];}
  function updSetup(key,value){setSetup(function(prev){return Object.assign({},prev,{[key]:value});});}
  function toggleTheme(theme){setSetup(function(prev){return Object.assign({},prev,{themes:prev.themes.includes(theme)?prev.themes.filter(function(item){return item!==theme;}):[...prev.themes,theme]});});}
  function toggleOrg(org){setSetup(function(prev){return Object.assign({},prev,{orgsToLearnFrom:prev.orgsToLearnFrom.includes(org)?prev.orgsToLearnFrom.filter(function(item){return item!==org;}):[...prev.orgsToLearnFrom,org]});});}
  function toggleAttendee(name){setMeetingAttendees(function(prev){return prev.includes(name)?prev.filter(function(item){return item!==name;}):[...prev,name];});}
  function toggleCheckDone(index){setChecklist(function(prev){return prev.map(function(item,i){return i===index?Object.assign({},item,{done:!item.done}):item;});});}
  function activityCtx(){
    return "ORGANISATION: Janman Peoples Foundation — Jan Nyaya Abhiyan (Access to Justice Programme), Bihar\n"
      +"FUNDER: Azim Premji Philanthropic Initiatives (Grant No. "+selProject.grant+")\n"
      +"PROJECT: "+selProject.name+"\n"
      +"ACTIVITY: "+setup.activityTitle+"\n"
      +"TYPE: "+setup.activityType+"\n"
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
    return (d.content||[]).filter(function(block){return block.type==="text";}).map(function(block){return block.text;}).join("")||"Error generating content.";
  }
  async function genConceptNote(){
    setLoad("cn",true);
    try{setConceptNote(await callAI("Generate a comprehensive concept note for this activity. Learn from: "+setup.orgsToLearnFrom.join(", ")+" and other access-to-justice organisations in India.\n\n"+activityCtx()+"\n\nStructure:\n1. TITLE AND DATE\n2. BACKGROUND AND CONTEXT (Bihar-specific, constitutional grounding)\n3. OBJECTIVES (3-5 specific)\n4. METHODOLOGY AND FORMAT (creative, participatory, inspired by peoples movements)\n5. PROGRAMME OUTLINE (time-by-time)\n6. EXPECTED OUTCOMES\n7. TARGET PARTICIPANTS AND OUTREACH PLAN\n8. LEGAL AND CONSTITUTIONAL GROUNDING\n9. CREATIVE ELEMENTS (art, theatre, storytelling if applicable)\n10. RESOURCE REQUIREMENTS\n11. ORGANISING COMMITTEE\n\nBe creative and movement-oriented."));}catch(e){setConceptNote("Error generating concept note.");}
    setLoad("cn",false);
  }
  async function genAgenda(){
    setLoad("agenda",true);
    try{setAgendaText(await callAI("Design a detailed, creative, time-by-time agenda for this activity. Include welcome, context-setting, interactive sessions, testimonies, legal knowledge sessions, participatory exercises, breaks, cultural moments, and valedictory.\n\n"+activityCtx()+"\n\nFormat each item as:\n[TIME] | [DURATION] | [SESSION TITLE] | [FACILITATOR] | [FORMAT/METHOD]"));}catch(e){setAgendaText("Error generating agenda.");}
    setLoad("agenda",false);
  }
  async function genSpeakers(){
    setLoad("speakers",true);
    try{setSpeakers(await callAI("Suggest resource persons, speakers, and guests for this activity. Include senior advocates, academics, activists, government officials, survivors, and community members.\n\n"+activityCtx()+"\n\nFor each person suggest: Name, Designation / Organisation, Why relevant, Area of expertise, Suggested role, How to approach them."));}catch(e){setSpeakers("Error generating speaker suggestions.");}
    setLoad("speakers",false);
  }
  async function genSocial(){
    setLoad("social",true);
    try{setSocialMedia(await callAI("Create a complete social media campaign kit for this activity. Organisation: Janman Peoples Foundation, Jan Nyaya Abhiyan, Bihar.\n\n"+activityCtx()+"\n\nGenerate:\n1. 3 WhatsApp broadcast messages\n2. 2 Facebook posts\n3. 2 Instagram captions\n4. 1 Twitter/X thread\n5. Invite graphic brief\n6. Recommended hashtags"));}catch(e){setSocialMedia("Error generating social media kit.");}
    setLoad("social",false);
  }
  async function genInvite(){
    setLoad("invite",true);
    try{setFormalInvite(await callAI("Draft a formal invitation letter from Janman Peoples Foundation / Jan Nyaya Abhiyan for this activity.\n\n"+activityCtx()+"\n\nRECIPIENT:\nName: "+(inviteName||"[Name]")+"\nDesignation: "+(inviteDesig||"[Designation]")+"\nOrganisation: "+(inviteOrg||"[Organisation]")+"\n\nWarm, formal, and specific about the recipient's role."));}catch(e){setFormalInvite("Error generating invite.");}
    setLoad("invite",false);
  }
  async function sendInviteEmail(){
    setEmailMsg("Sending...");
    try{
      await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:"Send an email using Gmail. To: "+inviteEmail+". Subject: Invitation to "+setup.activityTitle+" | Janman Peoples Foundation. Body:\n\n"+formalInvite}]})});
      setEmailMsg("Invitation sent via Gmail!");
    }catch(e){setEmailMsg("Email dispatch failed.");}
    setTimeout(function(){setEmailMsg("");},5000);
  }
  async function genChecklist(){
    setLoad("cl",true);
    try{
      const txt=await callAI("Create a comprehensive to-do checklist with timeline for this activity. Assign to team. Include every detail from 4 weeks before to post-activity follow-up.\n\n"+activityCtx()+"\nTEAM: "+teamNames.join(", ")+"\n\nReturn ONLY a JSON array with items: [{\"task\":\"...\",\"category\":\"...\",\"assignee\":\"...\",\"deadline\":\"YYYY-MM-DD\",\"priority\":\"high/medium/low\",\"notes\":\"...\"}]");
      try{setChecklist(JSON.parse(txt.replace(/```json|```/g,"").trim()));}
      catch(pe){setChecklist([{task:"Book venue and confirm logistics",category:"Venue and Setup",assignee:setup.coordinator,deadline:setup.date,priority:"high",notes:""},{task:"Send invitations to participants and speakers",category:"Invitations and Calling",assignee:setup.coordinator,deadline:setup.date,priority:"high",notes:""},{task:"Create social media posts for activity promotion",category:"Social Media Communications",assignee:"Roshin Jacob",deadline:setup.date,priority:"medium",notes:""},{task:"Prepare activity report format",category:"Documentation",assignee:setup.coordinator,deadline:setup.date,priority:"medium",notes:""}]);}
    }catch(e){setChecklist([]);}
    setLoad("cl",false);
  }
  async function genLogistics(){
    setLoad("log",true);
    try{
      const txt=await callAI("Create a detailed logistics checklist for this activity. Budget: Rs "+setup.budget+"\n\n"+activityCtx()+"\n\nReturn ONLY a JSON object: {\"Venue and Setup\":[{\"item\":\"name\",\"qty\":\"...\",\"person\":\"...\",\"cost\":\"...\",\"status\":\"pending\"}],...}");
      try{setLogistics(JSON.parse(txt.replace(/```json|```/g,"").trim()));}
      catch(pe){setLogistics({"Venue and Setup":[{item:"Venue booking",qty:"1",person:setup.coordinator,cost:"As per venue",status:"pending"}],"Stationery and Materials":[{item:"Registers and pens",qty:"50",person:"Sachina",cost:"Rs 500",status:"pending"}]});}
    }catch(e){setLogistics({});}
    setLoad("log",false);
  }
  async function sendReminders(){
    setEmailMsg("Sending reminders...");
    const pending=checklist.filter(function(item){return !item.done;});
    const lines=pending.map(function(item){return "Task: "+item.task+" | Assignee: "+item.assignee+" | Deadline: "+item.deadline+" | Priority: "+item.priority;}).join("\n");
    try{
      await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gmail.mcp.claude.com/mcp",name:"gmail"}],messages:[{role:"user",content:"Send an email using Gmail. To: sshashwat8@gmail.com. Subject: Reminder — Activity Preparation Tasks for "+setup.activityTitle+". Body:\n\nPending tasks for "+setup.activityTitle+" on "+fmt(setup.date)+" at "+setup.location+".\n\n"+lines}]})});
      setEmailMsg("Reminder emails sent via Gmail!");
    }catch(e){setEmailMsg("Email dispatch failed.");}
    setTimeout(function(){setEmailMsg("");},5000);
  }
  async function scheduleMeeting(){
    setCalMsg("Scheduling meeting...");
    const desc="Planning meeting for: "+setup.activityTitle+" ("+setup.activityType+")\nProject: "+selProject.name+"\nActivity Date: "+setup.date+"\nAgenda: "+meetingAgenda+"\nAttendees: "+meetingAttendees.join(", ")+"\nOrganiser: "+setup.coordinator;
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,mcp_servers:[{type:"url",url:"https://gcal.mcp.claude.com/mcp",name:"gcal"}],messages:[{role:"user",content:"Create a Google Calendar event on primary calendar. Title: Planning Meeting for "+setup.activityTitle+". Date: "+meetingDate+", time "+meetingTime+" IST, duration 1.5 hours. Description: "+desc}]})});
      const d=await r.json();
      const txt=(d.content||[]).filter(function(block){return block.type==="text";}).map(function(block){return block.text;}).join("");
      setCalMsg(txt.toLowerCase().indexOf("created")>=0||txt.toLowerCase().indexOf("event")>=0?"Meeting scheduled in Google Calendar!":"Meeting scheduling requested.");
    }catch(e){setCalMsg("Calendar sync failed.");}
    setTimeout(function(){setCalMsg("");},5000);
  }
  async function genReportFmt(){
    setLoad("report",true);
    try{setReportFmt(await callAI("Create a comprehensive activity report template AND verbatim transcription format for this activity.\n\n"+activityCtx()+"\n\nInclude summary table, executive summary, objectives vs outcomes, session summary, key discussions, resolutions, issues identified for follow-up, participant feedback, media coverage, financial summary, action points, annexures, and sign-off section."));}catch(e){setReportFmt("Error generating report format.");}
    setLoad("report",false);
  }
  async function genPostActivitySocial(){
    setLoad("pSocial",true);
    const ctx=activityCtx()+"\nATTENDANCE: "+attendance+"\nKEY HIGHLIGHTS: "+keyHighlights+"\nPOST-ACTIVITY NOTES: "+postNotes;
    try{setPostActivitySocial(await callAI("This activity has concluded. Generate post-activity social media communications and key takeaways.\n\n"+ctx+"\n\nInclude wrap-up posts, WhatsApp summary, newsletter paragraph, thank-you messages, and next-step communication."));}catch(e){setPostActivitySocial("Error generating post-activity social media.");}
    setLoad("pSocial",false);
  }
  async function genActionPoints(){
    setLoad("actions",true);
    const ctx=activityCtx()+"\nATTENDANCE: "+attendance+"\nKEY HIGHLIGHTS: "+keyHighlights+"\nPOST-ACTIVITY NOTES: "+postNotes;
    try{setActionPoints(await callAI("Based on this activity's outcomes, generate immediate action points, short-term follow-up, medium-term plan, and analysis / way forward.\n\n"+ctx));}catch(e){setActionPoints("Error generating action points.");}
    setLoad("actions",false);
  }
  function saveActivityPlan(){
    if(!setup.activityTitle.trim()||!setup.location.trim()){
      setSaveMsg("Add an activity title and location before saving.");
      setTimeout(function(){setSaveMsg("");},4000);
      return;
    }
    const record={id:uid(),setup:Object.assign({},setup),conceptNote:conceptNote,agendaText:agendaText,speakers:speakers,socialMedia:socialMedia,formalInvite:formalInvite,checklist:checklist.slice(),logistics:Object.assign({},logistics),reportFmt:reportFmt,postActivitySocial:postActivitySocial,actionPoints:actionPoints,postNotes:postNotes,attendance:attendance,keyHighlights:keyHighlights,meeting:{date:meetingDate,time:meetingTime,attendees:meetingAttendees.slice(),agenda:meetingAgenda},createdAt:td(),status:"planning"};
    setSavedActivities(function(prev){return [...prev,record];});
    setActivities(function(prev){
      const exists=prev.some(function(item){return item.title===setup.activityTitle&&item.date===setup.date;});
      if(exists)return prev;
      return [{id:uid(),type:setup.activityType,title:setup.activityTitle,location:setup.location,district:setup.district,date:setup.date,coordinator:setup.coordinator,conductedBy:[setup.coordinator],beneficiaries:0,casesIdentified:0,casesReferred:0,summary:postNotes||"Planned through Activity AI Pipeline.",status:"planned",followUp:"",participants:[],attachments:[],linkedCases:[]},...prev];
    });
    setSaveMsg("Activity saved to the pipeline archive and Activities tab.");
    setTimeout(function(){setSaveMsg("");},4000);
  }
  function Output(props){
    return <Card style={{marginBottom:13}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11,flexWrap:"wrap",gap:8}}>
        <Sec style={{marginBottom:0}}>{props.title}</Sec>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          {props.extra}
          {props.content&&<Btn size="sm" color="ghost" onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(props.content);}}>Copy</Btn>}
          <Btn size="sm" color="accent" onClick={props.onGen} disabled={isLoading(props.loadKey)}>{isLoading(props.loadKey)?"Generating...":"Generate with AI"}</Btn>
        </div>
      </div>
      {props.content?<pre style={{fontFamily:"Georgia,serif",fontSize:12.5,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.9,margin:0,maxHeight:420,overflowY:"auto"}}>{props.content}</pre>:<div style={{fontSize:12,color:C.dim,padding:"12px 0"}}>Click "Generate with AI" to create this document from your activity brief.</div>}
    </Card>;
  }
  return(
    <div>
      <Card style={{marginBottom:13,padding:"14px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>Activity Planning AI Pipeline</div><div style={{fontSize:11,color:C.dim,marginTop:2}}>Plan, communicate, schedule, document, and close community activities inside Jan Sahayak Pro.</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><Badge label={savedActivities.length+" saved"} color="purple"/><Btn size="sm" color="ghost" onClick={resetPipeline}>+ New Activity</Btn></div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:13,alignItems:"start"}}>
        <Card style={{padding:"16px 14px"}}>
          <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Pipeline Steps</div>
          {PIPELINE_STEPS.map(function(label,index){return <button key={label} onClick={function(){setStep(index);}} style={{width:"100%",textAlign:"left",padding:"7px 9px",borderRadius:7,border:"none",background:step===index?C.accentSoft:"transparent",color:step===index?C.accent:C.dim,fontSize:11,fontWeight:step===index?700:400,cursor:"pointer",marginBottom:4,display:"flex",alignItems:"center",gap:7}}><span style={{width:19,height:19,borderRadius:"50%",background:step===index?C.accent:index<step?C.green+"22":C.muted+"22",color:step===index?"#000":index<step?C.green:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{index<step?"✓":index+1}</span>{label}</button>;})}
          {setup.activityTitle&&<div style={{marginTop:16,padding:"11px 12px",background:C.surface,borderRadius:9,border:"1px solid "+C.border}}><div style={{fontSize:10,color:C.dim,marginBottom:5}}>Current Activity</div><div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.4,marginBottom:4}}>{setup.activityTitle}</div><div style={{fontSize:10,color:C.dim}}>{setup.activityType}</div><div style={{fontSize:10,color:C.dim}}>📅 {fmt(setup.date)}</div><div style={{fontSize:10,color:C.dim}}>📍 {setup.district}</div>{checklist.length>0&&<div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:pctDone+"%",background:C.green,borderRadius:2}}/></div>}</div>}
          {savedActivities.length>0&&<div style={{marginTop:14}}><div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Saved Activities</div>{savedActivities.slice().reverse().slice(0,6).map(function(item){return <div key={item.id} style={{padding:"7px 0",borderBottom:"1px solid "+C.border+"20"}}><div style={{fontSize:11,fontWeight:600,color:C.text,lineHeight:1.3}}>{item.setup.activityTitle}</div><div style={{fontSize:10,color:C.dim}}>{fmt(item.setup.date)}</div></div>;})}</div>}
        </Card>
        <div>
          {step===0&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Activity Setup</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:16}}>Define the activity, assign a role, connect it to a project, and set the foundation for AI-assisted planning.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <Sec>Role, Project & Activity</Sec>
                <Sel label="Your Role" value={setup.role} onChange={function(e){updSetup("role",e.target.value);}} options={PIPELINE_ROLES}/>
                <Sel label="Project" value={setup.project} onChange={function(e){updSetup("project",e.target.value);}} options={IPROJECTS.map(function(p){return {value:p.id,label:p.name};})}/>
                <div style={{background:C.surface,borderRadius:8,padding:"9px 11px",marginBottom:10,fontSize:11}}><div style={{fontWeight:600,color:C.text,marginBottom:2}}>{selProject.name}</div><div style={{color:C.dim}}>Grant: {selProject.grant}</div><div style={{color:C.dim}}>Budget: Rs {(selProject.budget/1e5).toFixed(0)}L · {selProject.startDate} to {selProject.endDate}</div></div>
                <Sel label="Activity Type" value={setup.activityType} onChange={function(e){updSetup("activityType",e.target.value);}} options={ACTIVITY_PIPELINE_TYPES}/>
                <Inp label="Activity Title" value={setup.activityTitle} onChange={function(e){updSetup("activityTitle",e.target.value);}} placeholder="e.g. State-level Consultation on GBV and Access to Justice in Bihar"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Activity Date" type="date" value={setup.date} onChange={function(e){updSetup("date",e.target.value);}}/><Inp label="End Date (optional)" type="date" value={setup.endDate} onChange={function(e){updSetup("endDate",e.target.value);}}/></div>
                <Inp label="Location / Venue" value={setup.location} onChange={function(e){updSetup("location",e.target.value);}} placeholder="e.g. Hotel Chanakya, Patna"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Sel label="District" value={setup.district} onChange={function(e){updSetup("district",e.target.value);}} options={BD}/><Inp label="Budget (Rs)" value={setup.budget} onChange={function(e){updSetup("budget",e.target.value);}} placeholder="e.g. 70000"/></div>
                <Sel label="Activity Coordinator" value={setup.coordinator} onChange={function(e){updSetup("coordinator",e.target.value);}} options={teamNames}/>
              </Card>
              <Card>
                <Sec>Brief & Context</Sec>
                <Inp label="Objectives" value={setup.objectives} onChange={function(e){updSetup("objectives",e.target.value);}} rows={2} placeholder="What do you want to achieve? What change will this catalyse?"/>
                <Inp label="Key Issues to Address" value={setup.issues} onChange={function(e){updSetup("issues",e.target.value);}} rows={2} placeholder="e.g. Police inaction in GBV cases, denial of MGNREGS wages, SC/ST atrocities in Seemanchal..."/>
                <Inp label="Relevant Acts and Laws" value={setup.acts} onChange={function(e){updSetup("acts",e.target.value);}} placeholder="e.g. PWDVA 2005, POCSO 2012, SC/ST Atrocities Act, NFSA, BNSS..."/>
                <Inp label="Constitutional Provisions" value={setup.constitutional} onChange={function(e){updSetup("constitutional",e.target.value);}} placeholder="e.g. Articles 14, 15, 17, 21, 21A, 32, 39A, 300A..."/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Target Audience" value={setup.targetAudience} onChange={function(e){updSetup("targetAudience",e.target.value);}} placeholder="e.g. Survivors, PLVs, lawyers, officials..."/><Inp label="Expected Participants" value={setup.expectedParticipants} onChange={function(e){updSetup("expectedParticipants",e.target.value);}} placeholder="e.g. 60-80"/></div>
                <Inp label="Special Guests / Chief Guest" value={setup.specialGuests} onChange={function(e){updSetup("specialGuests",e.target.value);}} placeholder="e.g. District Judge, SP, DLSA Secretary..."/>
                <div style={{marginBottom:10}}><label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Themes</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{PIPELINE_THEMES.map(function(theme){const selected=setup.themes.includes(theme);return <button key={theme} onClick={function(){toggleTheme(theme);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(selected?C.accent+"55":C.border),background:selected?C.accentSoft:"transparent",color:selected?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:selected?700:400}}>{theme}</button>;})}</div></div>
                <div style={{marginBottom:10}}><label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Learn From These Organisations</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{PIPELINE_ORGS.map(function(org){const selected=setup.orgsToLearnFrom.includes(org);return <button key={org} onClick={function(){toggleOrg(org);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(selected?C.purple+"55":C.border),background:selected?"rgba(155,114,207,0.1)":"transparent",color:selected?C.purple:C.dim,fontSize:10,cursor:"pointer",fontWeight:selected?700:400}}>{org}</button>;})}</div></div>
              </Card>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:13}}><Btn color="accent" size="lg" onClick={function(){setStep(1);}} disabled={!setup.activityTitle.trim()}>{setup.activityTitle.trim()?"Next: Brief and Design →":"Enter Activity Title to Continue"}</Btn></div>
          </div>}
          {step===1&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Activity Brief and AI Design</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate a concept note, agenda, and speaker suggestions grounded in your brief.</div><Output title="Concept Note" content={conceptNote} loadKey="cn" onGen={genConceptNote}/><Output title="Detailed Agenda (Time-by-Time)" content={agendaText} loadKey="agenda" onGen={genAgenda}/><Output title="Speaker and Resource Person Suggestions" content={speakers} loadKey="speakers" onGen={genSpeakers}/><div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={function(){setStep(0);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(2);}}>Next: Communications</Btn></div></div>}
          {step===2&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Communications and Invitations</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate social media kits and formal invitations for the activity.</div><div style={{display:"flex",gap:5,marginBottom:13}}>{["social","invite"].map(function(tab){return <button key={tab} onClick={function(){setRecipTab(tab);}} style={{padding:"6px 14px",borderRadius:7,border:"none",background:recipTab===tab?C.accentSoft:"transparent",color:recipTab===tab?C.accent:C.dim,fontSize:12,fontWeight:recipTab===tab?700:400,cursor:"pointer"}}>{tab==="social"?"Social Media Campaign Kit":"Formal Invite Generator"}</button>;})}</div>{recipTab==="social"&&<Output title="Social Media Campaign Kit" content={socialMedia} loadKey="social" onGen={genSocial}/>}{recipTab==="invite"&&<div><Card style={{marginBottom:13}}><Sec>Recipient Details</Sec><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Recipient Name" value={inviteName} onChange={function(e){setInviteName(e.target.value);}} placeholder="e.g. Justice Abhay S. Oka"/><Inp label="Designation" value={inviteDesig} onChange={function(e){setInviteDesig(e.target.value);}} placeholder="e.g. Judge, Supreme Court of India"/><Inp label="Organisation" value={inviteOrg} onChange={function(e){setInviteOrg(e.target.value);}} placeholder="e.g. Supreme Court of India"/><Inp label="Email Address" value={inviteEmail} onChange={function(e){setInviteEmail(e.target.value);}} placeholder="recipient@email.com"/></div></Card><Output title="Formal Invitation Letter" content={formalInvite} loadKey="invite" onGen={genInvite} extra={formalInvite&&inviteEmail?<Btn size="sm" color="blue" onClick={sendInviteEmail}>Send via Gmail</Btn>:null}/>{emailMsg&&<div style={{fontSize:12,color:C.accent,padding:"7px 11px",background:C.accentSoft,borderRadius:7,marginBottom:10}}>{emailMsg}</div>}</div>}<div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={function(){setStep(1);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(3);}}>Next: Logistics</Btn></div></div>}
          {step===3&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Logistics and Checklist</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>AI-generated to-do checklist with timeline and assignees, plus logistics breakdown.</div><div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:14}}><Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11,flexWrap:"wrap",gap:8}}><Sec style={{marginBottom:0}}>To-Do Checklist ({doneCount}/{checklist.length})</Sec><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>{emailMsg&&<div style={{fontSize:10,color:C.accent,padding:"3px 8px",background:C.accentSoft,borderRadius:5}}>{emailMsg}</div>}{checklist.length>0&&<Btn size="sm" color="blue" onClick={sendReminders}>Send Reminders</Btn>}<Btn size="sm" color="accent" onClick={genChecklist} disabled={isLoading("cl")}>{isLoading("cl")?"Generating...":"Generate with AI"}</Btn></div></div>{checklist.length>0&&<div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:pctDone+"%",background:C.green,borderRadius:2}}/></div>}{checklist.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate with AI" to create a comprehensive checklist from your activity brief.</div>}{checklist.map(function(item,index){return <div key={index} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid "+C.border+"20",alignItems:"flex-start"}}><input type="checkbox" checked={item.done||false} onChange={function(){toggleCheckDone(index);}} style={{marginTop:3,accentColor:C.accent,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600,color:item.done?C.dim:C.text,textDecoration:item.done?"line-through":"none"}}>{item.task}</div><div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}><Badge label={item.category} color="gray"/><Badge label={item.assignee} color="amber"/>{item.priority==="high"&&<Badge label="HIGH" color="red"/>}</div>{item.notes&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>{item.notes}</div>}</div><div style={{fontSize:10,color:C.dim,flexShrink:0}}>{item.deadline?fmt(item.deadline):"—"}</div></div>;})}</Card><Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><Sec style={{marginBottom:0}}>Logistics Breakdown</Sec><Btn size="sm" color="accent" onClick={genLogistics} disabled={isLoading("log")}>{isLoading("log")?"Generating...":"Generate"}</Btn></div>{Object.keys(logistics).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:16}}>Click "Generate" to create a logistics breakdown.</div>}{Object.keys(logistics).map(function(cat){return <div key={cat} style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.7}}>{cat}</div>{(logistics[cat]||[]).map(function(item,i){return <div key={i} style={{display:"flex",gap:7,padding:"5px 8px",background:C.surface,borderRadius:6,marginBottom:3}}><div style={{flex:1,fontSize:11,color:C.text}}>{item.item}</div><div style={{fontSize:10,color:C.dim}}>{item.qty}</div><div style={{fontSize:10,color:C.accent}}>{item.cost}</div></div>;})}</div>;})}</Card></div><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><Btn color="ghost" onClick={function(){setStep(2);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(4);}}>Next: Scheduling</Btn></div></div>}
          {step===4&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Meeting Scheduling and Gantt Chart</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>Schedule a planning meeting via Google Calendar and view the project Gantt timeline.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}><Card><Sec>Schedule Planning Meeting</Sec><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Meeting Date" type="date" value={meetingDate} onChange={function(e){setMeetingDate(e.target.value);}}/><Inp label="Time" type="time" value={meetingTime} onChange={function(e){setMeetingTime(e.target.value);}}/></div><div style={{marginBottom:10}}><label style={{fontSize:9,color:C.dim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Attendees</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{teamNames.map(function(name){const selected=meetingAttendees.includes(name);return <button key={name} onClick={function(){toggleAttendee(name);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(selected?C.accent+"55":C.border),background:selected?C.accentSoft:"transparent",color:selected?C.accent:C.dim,fontSize:10,cursor:"pointer",fontWeight:selected?700:400}}>{name}</button>;})}</div></div><Inp label="Meeting Agenda" value={meetingAgenda} onChange={function(e){setMeetingAgenda(e.target.value);}} rows={3} placeholder="e.g. Activity planning discussion, task assignment, timeline review, budget approval..."/>{calMsg&&<div style={{fontSize:11,color:C.accent,padding:"7px 10px",background:C.accentSoft,borderRadius:7,marginBottom:9}}>{calMsg}</div>}<Btn onClick={scheduleMeeting} color="green" disabled={!meetingDate||meetingAttendees.length===0}>Schedule via Google Calendar</Btn></Card><Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><Sec style={{marginBottom:0}}>Project Gantt Chart — {selProject.code}</Sec><Btn size="sm" color="purple" onClick={function(){setGanttVisible(!ganttVisible);}}>{ganttVisible?"Hide Gantt":"Show Gantt"}</Btn></div>{!ganttVisible&&<div style={{color:C.dim,fontSize:12,padding:8}}>Click "Show Gantt" to view the full project timeline for {selProject.name}.</div>}{ganttVisible&&<div>{[...new Set(PIPELINE_GANTT_ITEMS.map(function(item){return item.cat;}))].map(function(cat){const projStart=new Date(selProject.startDate);const projEnd=new Date(selProject.endDate);const total=projEnd-projStart;return <div key={cat} style={{marginBottom:11}}><div style={{fontSize:9,fontWeight:700,color:PIPELINE_CAT_COLORS[cat]||C.accent,marginBottom:5,textTransform:"uppercase",letterSpacing:.8}}>{cat}</div>{PIPELINE_GANTT_ITEMS.filter(function(item){return item.cat===cat;}).map(function(item,index){const startPct=Math.max(0,(new Date(item.start)-projStart)/total*100);const widthPct=Math.min(100-startPct,(new Date(item.end)-new Date(item.start))/total*100);return <div key={index} style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}><div style={{width:160,fontSize:10,color:C.text,flexShrink:0,lineHeight:1.3}}>{item.task}</div><div style={{flex:1,height:10,background:C.surface,borderRadius:3,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",left:startPct+"%",width:Math.max(widthPct,2)+"%",height:"100%",background:PIPELINE_CAT_COLORS[cat]||C.accent,borderRadius:3,opacity:.85}}/></div><div style={{width:60,fontSize:9,color:C.dim,flexShrink:0}}>{item.assignee.split(" ")[0]}</div></div>;})}</div>;})}<div style={{fontSize:9,color:C.dim,marginTop:6}}>{selProject.startDate} to {selProject.endDate}</div></div>}</Card></div><div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={function(){setStep(3);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(5);}}>Next: Reporting</Btn></div></div>}
          {step===5&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Reporting and Documentation Formats</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>Generate ready-to-fill activity report and transcription formats for post-activity documentation.</div><Output title="Activity Report Template and Transcription Format" content={reportFmt} loadKey="report" onGen={genReportFmt}/><div style={{display:"flex",justifyContent:"space-between"}}><Btn color="ghost" onClick={function(){setStep(4);}}>Back</Btn><Btn color="accent" onClick={function(){setStep(6);}}>Next: Post-Activity Analysis</Btn></div></div>}
          {step===6&&<div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:3}}>Post-Activity Analysis and Communications</div><div style={{fontSize:12,color:C.dim,marginBottom:14}}>Enter activity outcomes, then generate post-activity social media, action points, and way forward.</div><Card style={{marginBottom:13}}><Sec>Activity Outcomes (Fill After Activity)</Sec><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Inp label="Actual Attendance" value={attendance} onChange={function(e){setAttendance(e.target.value);}} placeholder="e.g. 78 participants — 34 women, 12 PLVs, 8 lawyers, 6 officials"/><Inp label="Key Highlights" value={keyHighlights} onChange={function(e){setKeyHighlights(e.target.value);}} placeholder="e.g. Survivors testified, 12 cases identified, resolution passed, DM committed to action"/></div><Inp label="Post-Activity Notes" value={postNotes} onChange={function(e){setPostNotes(e.target.value);}} rows={4} placeholder="What happened, key discussions, decisions made, outcomes achieved, challenges, commitments received."/></Card><Output title="Post-Activity Social Media Communications" content={postActivitySocial} loadKey="pSocial" onGen={genPostActivitySocial}/><Output title="Action Points, Way Forward and Funder Reporting" content={actionPoints} loadKey="actions" onGen={genActionPoints}/>{saveMsg&&<div style={{fontSize:11,color:saveMsg.indexOf("saved")>=0?C.green:C.red,padding:"8px 10px",background:saveMsg.indexOf("saved")>=0?C.green+"14":C.red+"14",borderRadius:7,marginBottom:10}}>{saveMsg}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Btn color="ghost" onClick={function(){setStep(5);}}>Back</Btn><Btn color="green" size="lg" onClick={saveActivityPlan}>Save and Archive This Activity</Btn></div></div>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const TABS=[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"cases",icon:"⚖",label:"Cases"},{id:"activities",icon:"🏕",label:"Activities"},{id:"activity-pipeline",icon:"🧠",label:"Activity AI Pipeline"},{id:"finance",icon:"💰",label:"Grants & Expenses"},{id:"expenses",icon:"🧾",label:"Expense Log"},{id:"projects",icon:"📁",label:"Projects"},{id:"monthly",icon:"📓",label:"Monthly Reports"},{id:"grants",icon:"🏦",label:"Grant Mgmt"},{id:"reports",icon:"📋",label:"Reports"},{id:"drafter",icon:"📝",label:"Drafter"},{id:"team",icon:"👥",label:"Team"}];

export default function Janman(){
  const [auth,setAuth]=useState(false);const [user,setUser]=useState(null);const [tab,setTab]=useState("dashboard");
  const [cases,setCases]=useState(IC);const [activities,setActivities]=useState(IA);const [finance,setFinance]=useState(IF);const [tasks,setTasks]=useState(IT);const [team,setTeam]=useState(STAFF);const [loaded,setLoaded]=useState(false);
  useEffect(function(){(async function(){try{const keys=["jnf_c","jnf_a","jnf_f","jnf_t","jnf_tm"];const results=await Promise.all(keys.map(function(k){return sg(k);}));if(results[0])setCases(results[0]);if(results[1])setActivities(results[1]);if(results[2])setFinance(results[2]);if(results[3])setTasks(results[3]);if(results[4])setTeam(results[4]);}catch(e){}setLoaded(true);})();},[]);
  useEffect(function(){if(loaded){ss("jnf_c",cases);ss("jnf_a",activities);ss("jnf_f",finance);ss("jnf_t",tasks);ss("jnf_tm",team);}},[cases,activities,finance,tasks,team,loaded]);
  if(!auth)return <Login onAuth={function(u){setAuth(true);setUser(u);}}/>;
  const isAdmin=user&&(user.access==="admin"||user.access==="coordinator");
  const ov=cases.filter(function(c){return dF(c.updatedAt)>7&&c.status==="active";}).length;
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}select,input,textarea{outline:none;color-scheme:dark;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#1C2B46;border-radius:3px;}"}</style>
      <div style={{borderBottom:"1px solid "+C.border,padding:"0 22px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:28,height:28,borderRadius:7,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚖</div><div><span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:C.text}}>Jan Sahayak Pro</span><span style={{fontSize:10,color:C.muted,marginLeft:7}}>Janman Peoples Foundation · Jan Nyaya Abhiyan</span></div></div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>{ov>0&&<Badge label={ov+" overdue"} color="red"/>}<div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:"0 0 6px "+C.green}}/><span style={{fontSize:11,color:C.muted}}>Purnia, Bihar</span>{user&&<span style={{fontSize:11,color:C.accent,fontWeight:600}}>{user.name}</span>}<Btn size="sm" color="ghost" onClick={function(){setAuth(false);setUser(null);}} style={{fontSize:10,padding:"3px 8px"}}>Lock</Btn></div>
      </div>
      <div style={{display:"flex",gap:2,padding:"8px 22px",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {TABS.map(function(t){return <button key={t.id} onClick={function(){setTab(t.id);}} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,border:"none",background:tab===t.id?C.accentSoft:"transparent",color:tab===t.id?C.accent:C.dim,fontSize:11,fontWeight:tab===t.id?700:400,cursor:"pointer",whiteSpace:"nowrap"}}><span>{t.icon}</span><span>{t.label}</span>{t.id==="cases"&&ov>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,fontSize:9,padding:"1px 5px",fontWeight:700}}>{ov}</span>}</button>;})}</div>
      <div style={{padding:"16px 22px",maxWidth:1300,margin:"0 auto"}}>
        {tab==="dashboard"&&<Dashboard cases={cases} activities={activities} finance={finance} tasks={tasks} team={team}/>}
        {tab==="cases"&&<Cases cases={cases} setCases={setCases} tasks={tasks} setTasks={setTasks} team={team}/>}
        {tab==="activities"&&<Activities activities={activities} setActivities={setActivities} team={team}/>}
        {tab==="activity-pipeline"&&<ActivityPipeline team={team} setActivities={setActivities}/>}
        {tab==="finance"&&<Finance finance={finance} setFinance={setFinance}/>}
        {tab==="expenses"&&<ExpenseLog team={team}/>}
        {tab==="projects"&&(isAdmin?<Projects team={team} tasks={tasks} setTasks={setTasks} cases={cases} finance={finance}/>:<Card style={{padding:40,textAlign:"center",color:C.dim}}>Project Management is restricted to Admin and Coordinator access.</Card>)}
        {tab==="monthly"&&<MonthlyReports team={team}/>}
        {tab==="grants"&&(isAdmin?<Grants/>:<Card style={{padding:40,textAlign:"center",color:C.dim}}>Grant Management is restricted to Admin access.</Card>)}
        {tab==="reports"&&<Reports cases={cases} activities={activities} finance={finance} tasks={tasks} team={team}/>}
        {tab==="drafter"&&<Drafter cases={cases}/>}
        {tab==="team"&&<Team team={team} setTeam={setTeam} tasks={tasks} setTasks={setTasks} cases={cases}/>}
      </div>
      <div style={{textAlign:"center",padding:"12px 22px",fontSize:10,color:C.muted,borderTop:"1px solid "+C.border}}>Jan Sahayak Pro · Janman Peoples Foundation · District Legal Fellowship · Access to Justice · Purnia, Bihar · Grant No. R 2409-19929</div>
    </div>
  );
}
