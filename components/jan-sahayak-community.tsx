// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

const W={bg:"#FFF8F0",accent:"#C84B31",accentSoft:"rgba(200,75,49,0.08)",green:"#2E7D32",blue:"#1565C0",purple:"#6A1B9A",text:"#1A1A1A",dim:"#555",border:"#E0D5CC",muted:"#888"};
const BD=["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran"];
const FELLOWS=[{name:"Nawaz Hassan",dist:"Araria"},{name:"Tausif Raza",dist:"Katihar"},{name:"Mithlesh Kumar",dist:"Bhagalpur"},{name:"Pintu Kumar Mehta",dist:"Kishanganj"},{name:"Nagmani",dist:"Purnia"},{name:"Sachina",dist:"Patna"}];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
async function sg(k: string){try{const r=await (window as any).storage.get(k);return r?JSON.parse(r.value):null;}catch{return null;}}
async function ss(k: string,v: unknown){try{await (window as any).storage.set(k,JSON.stringify(v));}catch{}}

const CENTRAL=[
  {id:"c1",cat:"Housing",name:"PM Awas Yojana (Gramin)",hi:"PM आवास योजना (ग्रामीण)",desc:"Free pucca house for rural BPL families without proper shelter",hi_desc:"ग्रामीण BPL परिवारों को मुफ्त पक्का मकान",elig:"BPL/AAY families in SECC list without pucca house",docs:["Aadhar","BPL/SECC card","Bank account","Land document"],apply:"Gram Panchayat / pmayg.nic.in",hotline:"1800-11-6446"},
  {id:"c2",cat:"Employment",name:"MGNREGS (Job Card)",hi:"मनरेगा (जॉब कार्ड)",desc:"100 days guaranteed wage employment per year",hi_desc:"साल में 100 दिन की रोजगार गारंटी",elig:"Any rural household adult",docs:["Aadhar","Bank account","Residence proof"],apply:"Gram Panchayat",hotline:"1800-111-555"},
  {id:"c3",cat:"Food",name:"National Food Security Act / PDS",hi:"राष्ट्रीय खाद्य सुरक्षा अधिनियम",desc:"5 kg subsidised food grains per person/month for PHH families",hi_desc:"प्राथमिकता परिवारों को 5 किग्रा/व्यक्ति/माह सब्सिडाइज्ड अनाज",elig:"Priority Household (PHH) and AAY (Antyodaya) card holders",docs:["Ration card application","Aadhar","Income proof"],apply:"Block Supply Office",hotline:"14445"},
  {id:"c4",cat:"Banking",name:"PM Jan Dhan Yojana",hi:"प्रधानमंत्री जन-धन योजना",desc:"Zero-balance bank account with Rs 2 lakh accident insurance and overdraft",hi_desc:"शून्य बैलेंस बैंक खाता, Rs 2 लाख दुर्घटना बीमा",elig:"Any Indian adult without bank account",docs:["Aadhar or any photo ID","Address proof"],apply:"Any nationalised bank branch",hotline:"1800-11-0001"},
  {id:"c5",cat:"Health",name:"Ayushman Bharat (PM-JAY)",hi:"आयुष्मान भारत (PM-JAY)",desc:"Rs 5 lakh/year health cover for poor families in government and empanelled private hospitals",hi_desc:"गरीब परिवारों को Rs 5 लाख/वर्ष स्वास्थ्य बीमा",elig:"SECC-listed families — check pmjay.gov.in",docs:["Aadhar","Ration card"],apply:"Nearest empanelled hospital / Common Service Centre",hotline:"14555"},
  {id:"c6",cat:"Disability",name:"Rights of Persons with Disabilities (RPWD 2016)",hi:"दिव्यांगजन अधिकार अधिनियम 2016",desc:"Rights, reservation, education, employment, social security for 21 categories of disability",hi_desc:"21 प्रकार की दिव्यांगता में अधिकार, आरक्षण, शिक्षा, रोजगार, सामाजिक सुरक्षा",elig:"Persons with 40%+ certified disability",docs:["Disability certificate from CMO","Aadhar"],apply:"District Social Welfare Officer",hotline:"1800-11-4515"},
  {id:"c7",cat:"Child",name:"Mission Vatsalya (Child Protection)",hi:"मिशन वात्सल्य (बाल संरक्षण)",desc:"Protection, care, rehabilitation for children in need of care and children in conflict with law",hi_desc:"जरूरतमंद और कानून से संघर्षरत बच्चों की सुरक्षा, देखभाल, पुनर्वास",elig:"Children 0-18 in difficult circumstances — abandoned, abused, orphaned, trafficking victims",docs:["Birth certificate if available","Aadhar"],apply:"Child Welfare Committee / Childline 1098",hotline:"1098"},
  {id:"c8",cat:"Women",name:"PM Matru Vandana Yojana",hi:"PM मातृ वंदना योजना",desc:"Rs 6,000 cash incentive for first live birth in instalments",hi_desc:"पहले जीवित बच्चे के जन्म पर Rs 6,000 की किश्तों में सहायता",elig:"Pregnant/lactating women for first live birth, age 18+",docs:["Aadhar","Bank account","LMP certificate","Anganwadi registration"],apply:"Anganwadi worker / ASHA",hotline:"7998799804"},
  {id:"c9",cat:"Forest",name:"Forest Rights Act 2006",hi:"वन अधिकार अधिनियम 2006",desc:"Individual and community forest land rights for Scheduled Tribes and traditional forest dwellers",hi_desc:"अनुसूचित जनजाति और पारंपरिक वन निवासियों को वन भूमि अधिकार",elig:"STs and OTFDs who occupied forest land before December 13, 2005",docs:["Evidence of occupation (photos/witnesses)","Caste certificate","Gram Sabha resolution"],apply:"Gram Sabha → Sub-divisional committee → District committee",hotline:"Contact Jan Nyaya Abhiyan"},
  {id:"c10",cat:"Labour",name:"Street Vendors (Protection) Act 2014",hi:"पथ विक्रेता (आजीविका संरक्षण) अधिनियम 2014",desc:"Legal protection for street vendors — right to vending certificate, no eviction without survey",hi_desc:"पथ विक्रेताओं को कानूनी सुरक्षा — वेंडिंग प्रमाण पत्र, सर्वे बिना बेदखली नहीं",elig:"All street vendors",docs:["Vendor ID if any","Aadhar","Photo"],apply:"Town Vending Committee / Municipal office",hotline:"Contact Jan Nyaya Abhiyan"},
  {id:"c11",cat:"Labour",name:"PEMSR Act 2013 (Manual Scavengers)",hi:"PEMSR अधिनियम 2013 (मैला ढोने वाले)",desc:"Prohibition and rehabilitation of manual scavengers — one-time cash assistance, scholarship, land, loan",hi_desc:"मैला ढोने की प्रथा का उन्मूलन — एकमुश्त नकद सहायता, छात्रवृत्ति, जमीन, ऋण",elig:"Manual scavengers identified in survey or self-identified",docs:["Identity proof","Survey certificate if available"],apply:"District Magistrate / NSKFDC",hotline:"1800-11-2345"},
  {id:"c12",cat:"Women",name:"Beti Bachao Beti Padhao",hi:"बेटी बचाओ बेटी पढ़ाओ",desc:"Girls' education, nutrition, and protection from sex-selective abortion and child marriage",hi_desc:"बेटियों की शिक्षा, पोषण, लिंग-चयनात्मक गर्भपात और बाल विवाह से सुरक्षा",elig:"All families with girl children",docs:["Birth certificate","School enrollment"],apply:"Anganwadi / ASHA / Block Women Development Office",hotline:"181"},
];

const BIHAR=[
  {id:"b1",cat:"Girl Child",name:"Mukhyamantri Kanya Utthan Yojana",hi:"मुख्यमंत्री कन्या उत्थान योजना",desc:"Rs 50,000 from birth to graduation in multiple instalments",hi_desc:"बेटी के जन्म से स्नातक तक Rs 50,000 की किश्तों में सहायता",elig:"Girl child born in Bihar, family income <Rs 2L, unmarried at graduation",docs:["Birth certificate","Aadhar","Bank account","Income certificate","Marksheets"],apply:"serviceonline.bihar.gov.in",hotline:"0612-2233333"},
  {id:"b2",cat:"SC/ST",name:"SC/ST Atrocity Relief & Compensation",hi:"SC/ST अत्याचार राहत और मुआवजा",desc:"Monetary compensation, legal aid, medical relief, rehabilitation for SC/ST atrocity victims under SC/ST Act 1989",hi_desc:"SC/ST अत्याचार पीड़ितों को मुआवजा, कानूनी सहायता, चिकित्सा राहत",elig:"SC/ST persons who experienced violence, discrimination, or atrocity",docs:["FIR copy","Caste certificate","Aadhar","Medical certificate if applicable","Bank account"],apply:"District Magistrate / Social Welfare Dept",hotline:"Contact Jan Nyaya Abhiyan immediately"},
  {id:"b3",cat:"SC/ST",name:"Maha Dalit Vikas Mission Schemes",hi:"महादलित विकास मिशन योजनाएं",desc:"Housing, education, livelihood, and empowerment schemes for 21 Maha Dalit communities in Bihar",hi_desc:"बिहार की 21 महादलित जातियों के लिए आवास, शिक्षा, आजीविका योजनाएं",elig:"Members of 21 notified Maha Dalit communities (Musahar, Dhobi, Nat, Dom, Turi, Bantar, etc.)",docs:["Caste certificate (Maha Dalit)","Aadhar","Income certificate"],apply:"Maha Dalit Vikas Mission District Office",hotline:"0612-2217870"},
  {id:"b4",cat:"Women",name:"One Stop Centre (OSC) / Sakhi",hi:"वन स्टॉप सेंटर (OSC) / सखी",desc:"24x7 immediate support for women victims — shelter, police, legal aid, counselling, medical",hi_desc:"हिंसा पीड़ित महिलाओं को 24x7 आश्रय, पुलिस, कानूनी, परामर्श, चिकित्सा सहायता",elig:"Any woman affected by any form of violence — NO DOCUMENTS REQUIRED for immediate help",docs:["No documents required for immediate help"],apply:"Call 181 (Women Helpline) — OSC in all 38 districts of Bihar",hotline:"181"},
  {id:"b5",cat:"Women",name:"Bihar Women Development Corporation Schemes",hi:"बिहार महिला विकास निगम",desc:"Mukhyamantri Nari Shakti Yojana, SHG support, violence rehabilitation, legal aid for women",hi_desc:"महिला सशक्तीकरण, हिंसा सहायता, स्वयं सहायता समूह",elig:"Women of Bihar, priority to BPL, widows, abandoned women",docs:["Aadhar","Bank account","Income certificate"],apply:"District Social Welfare Office / BWDC",hotline:"0612-2506068"},
  {id:"b6",cat:"Land",name:"Bihar Homestead & Dalit Land Schemes",hi:"बिहार होमस्टेड और दलित भूमि योजनाएं",desc:"Homestead land right (up to 3 decimals), Bhoodan land, Vasudha scheme, mutation rights for landless Dalit families",hi_desc:"भूमिहीन और दलितों को होमस्टेड भूमि, भूदान, नामांतरण अधिकार",elig:"Landless SC/ST/OBC agricultural labourer and artisan families",docs:["Aadhar","Caste certificate","Application form"],apply:"Circle Officer / Revenue Officer / DM office",hotline:"Contact Jan Nyaya Abhiyan"},
  {id:"b7",cat:"Child",name:"Juvenile Justice Rules Bihar",hi:"किशोर न्याय नियम — बिहार",desc:"Rights of children in conflict with law (Juvenile Justice Board) and in need of care (CWC) — shelter, bail, rehabilitation",hi_desc:"कानून से संघर्षरत (JJB) और जरूरतमंद बच्चों (CWC) के अधिकार — आश्रय, जमानत, पुनर्वास",elig:"Any child under 18 years — no documents required for immediate protection",docs:["Birth certificate if available — not mandatory for immediate help"],apply:"Child Welfare Committee (CWC) / Juvenile Justice Board (JJB) / Childline 1098",hotline:"1098"},
  {id:"b8",cat:"Disability",name:"Bihar Viklang Pension & Marriage Incentive",hi:"बिहार विकलांग पेंशन और विवाह योजना",desc:"Monthly pension Rs 300-500, Rs 1 lakh marriage incentive, educational scholarships for disabled persons",hi_desc:"Rs 300-500 मासिक पेंशन, Rs 1 लाख विवाह प्रोत्साहन, छात्रवृत्ति",elig:"Bihar resident with 40%+ certified disability",docs:["Disability certificate","Aadhar","Income certificate","Bank account"],apply:"District Social Welfare Officer",hotline:"0612-2217705"},
  {id:"b9",cat:"Education",name:"Bihar Student Credit Card (BSCC)",hi:"बिहार स्टूडेंट क्रेडिट कार्ड",desc:"Up to Rs 4 lakh education loan at 0% interest for higher education for Bihar students from BPL families",hi_desc:"उच्च शिक्षा के लिए Rs 4 लाख तक 0% ब्याज पर ऋण",elig:"Bihar 12th pass students, family income <Rs 4.5L",docs:["12th marksheet","Aadhar","Income certificate","Admission letter","Bank account"],apply:"7nishchay-yuvaupmission.bihar.gov.in",hotline:"1800-3456-444"},
  {id:"b10",cat:"SC/ST",name:"Dr. Ambedkar Aawas Yojana (Bihar)",hi:"डॉ. अंबेडकर आवास योजना (बिहार)",desc:"Housing scheme specifically for SC/ST families in Bihar — repair grant and new construction",hi_desc:"बिहार में SC/ST परिवारों के लिए विशेष आवास योजना — मरम्मत अनुदान और नया निर्माण",elig:"SC/ST families without pucca house not covered under PMAY",docs:["Caste certificate","Aadhar","Income certificate","Land document","Bank account"],apply:"Block Development Office / District Social Welfare",hotline:"Contact Jan Nyaya Abhiyan"},
];

const LAWS=[
  {id:"l1",cat:"Criminal Law",name:"Bharatiya Nyaya Sanhita (BNS) 2023",hi:"भारतीय न्याय संहिता (BNS) 2023",desc:"Replaced IPC. Covers all criminal offences. Organised crime (Sec 111), terrorism (Sec 113), hate speech (Sec 196), rape and sexual offences (Sec 63-70).",hi_desc:"IPC की जगह। सभी आपराधिक अपराध। बलात्कार (धारा 63-70), आतंकवाद (धारा 113)।",faqs:[{q:"What replaced IPC Section 302 (murder)?",a:"BNS Section 103 — Death or life imprisonment plus fine."},{q:"What is the new law on rape?",a:"BNS Sections 63-69. Gang rape: minimum 20 years to life. Child rape (under 12): death or life imprisonment."},{q:"What is Section 152 BNS about?",a:"Replaces old sedition (IPC 124A). Now called 'acts endangering sovereignty of India' — broader scope but different framing."}]},
  {id:"l2",cat:"Procedure",name:"Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023",hi:"भारतीय नागरिक सुरक्षा संहिता (BNSS) 2023",desc:"Replaced CrPC. Governs FIR, arrest, bail, trial. Zero FIR mandatory (Sec 173). Videography of crime scenes. Forensic evidence in serious cases.",hi_desc:"CrPC की जगह। FIR, गिरफ्तारी, जमानत, सुनवाई। Zero FIR अनिवार्य।",faqs:[{q:"What is a Zero FIR?",a:"BNSS Section 173 — any police station must register FIR for any cognisable offence regardless of jurisdiction, then transfer to correct station. Police cannot say it is not their area."},{q:"How long can police hold someone in custody?",a:"Initial: 15 days magistrate remand. For offences with 7+ year punishment: extended custody up to 90 days."},{q:"Can someone be arrested without a warrant?",a:"Yes for cognisable offences. Police must inform grounds of arrest and must inform a family member or friend immediately — D.K. Basu v. State of WB (1997)."}]},
  {id:"l3",cat:"SC/ST",name:"SC/ST Prevention of Atrocities Act 1989",hi:"SC/ST अत्याचार निवारण अधिनियम 1989",desc:"Protects SC/ST from violence, land seizure, insults, social exclusion. Special courts, no anticipatory bail, mandatory FIR, state compensation, witness protection.",hi_desc:"SC/ST को हिंसा, जमीन छीनने, अपमान से सुरक्षा। विशेष न्यायालय। प्रत्याशित जमानत नहीं।",faqs:[{q:"Can the accused get anticipatory bail?",a:"No — Supreme Court in Prithvi Raj Chauhan v. Union of India (2020) confirmed no anticipatory bail in SC/ST Act cases."},{q:"Is FIR registration mandatory?",a:"Yes. Police cannot refuse. Refusal itself is punishable under the Act. Complainant can go directly to DSP if refused."},{q:"What compensation is available?",a:"State must pay compensation to victims — minimum amounts prescribed in 1995 Rules as amended. Ranges from Rs 25,000 to Rs 8.25 lakh depending on the nature of atrocity."}]},
  {id:"l4",cat:"Child",name:"POCSO Act 2012",hi:"POCSO अधिनियम 2012",desc:"Protects all persons under 18 from sexual offences. Mandatory reporting (Sec 19), special courts, child-friendly procedure, 1-year trial limit, state compensation.",hi_desc:"18 वर्ष से कम को यौन अपराधों से सुरक्षा। अनिवार्य रिपोर्टिंग। विशेष न्यायालय।",faqs:[{q:"Who must report sexual abuse of a child?",a:"ANY person with knowledge must report — Section 19 is mandatory. Failure to report is punishable with imprisonment up to 6 months."},{q:"Can the child's identity be revealed?",a:"No. Section 23 strictly prohibits disclosure of child's identity in any media, document, or public communication. Violation is a separate criminal offence."},{q:"How is a child's statement recorded?",a:"Before Magistrate under Section 164 BNSS; social worker must be present; no direct cross-examination by accused's lawyer; child can give evidence via video link from a separate room."}]},
  {id:"l5",cat:"Women",name:"Protection of Women from DV Act 2005",hi:"घरेलू हिंसा से महिलाओं का संरक्षण अधिनियम 2005",desc:"Protects women from physical, emotional, sexual, verbal and economic domestic violence. Protection orders, residence orders, monetary relief, custody — available same day.",hi_desc:"घरेलू हिंसा से सुरक्षा। संरक्षण, निवास, मुआवजा, अभिरक्षा आदेश — उसी दिन मिल सकते हैं।",faqs:[{q:"Who is protected under PWDVA?",a:"Any woman in a domestic relationship — wife, live-in partner, daughter, mother, sister — against any member of the shared household, male or female."},{q:"How quickly can a protection order be given?",a:"A Magistrate can pass an ex parte interim protection order on the same day if there is immediate danger — without waiting to hear the other side."},{q:"What does the Protection Officer (PO) do?",a:"Helps file Domestic Incident Report (DIR), arranges medical aid, shelter (OSC), and legal aid, produces report before Magistrate. Free service in every district."}]},
  {id:"l6",cat:"Child",name:"Juvenile Justice Act 2015",hi:"किशोर न्याय अधिनियम 2015",desc:"Governs children in conflict with law (JJB) and in need of care (CWC). Under 18 cannot be sentenced as adult (except heinous offences for 16-18 assessed by JJB).",hi_desc:"कानून से संघर्षरत (JJB) और जरूरतमंद बच्चों (CWC) के अधिकार। 18 तक वयस्क की तरह दंड नहीं।",faqs:[{q:"What is the Child Welfare Committee (CWC)?",a:"A statutory body in each district handling children in need of care — abandoned, abused, orphaned, trafficking victims. Contact via Childline 1098. The CWC must meet the child within 24 hours."},{q:"What is the Juvenile Justice Board (JJB)?",a:"Handles children who commit crimes. Focus is rehabilitation, NOT punishment. A child cannot be sent to adult jail. JJB must include a social worker and a Magistrate."},{q:"Can a 16-year-old be tried as an adult?",a:"Only for heinous offences (punishable by 7+ years). The JJB must assess the child's mental and physical capacity. This requires legal representation — contact Jan Nyaya Abhiyan."}]},
  {id:"l7",cat:"Land",name:"Bihar Land Reforms & Tenancy Laws",hi:"बिहार भूमि सुधार और काश्तकारी कानून",desc:"Bihar Land Reforms Act 1950, Bihar Tenancy Act 1885, Bihar Homestead Privilege Persons Act, Bhoodan Yagna Act, Bihar Land Mutation Act — govern land ownership, tenancy, homestead, mutation.",hi_desc:"बिहार भूमि सुधार, काश्तकारी, होमस्टेड अधिकार, भूदान, नामांतरण — भूमि स्वामित्व और अधिकार।",faqs:[{q:"What is homestead right (vasiyat)?",a:"Every agricultural labourer and rural artisan family in Bihar has right to homestead land (up to 3 decimals) under Bihar Homestead Privilege Persons Act. Apply to Circle Officer."},{q:"How to get mutation (dakhil-kharij)?",a:"File mutation application before Circle Officer. Online at bhumijankari.bihar.gov.in. If refused, appeal to Revenue Officer then DM. Refusal without reason is illegal."},{q:"What if upper caste forcibly takes Dalit land?",a:"File FIR under SC/ST Atrocities Act — dispossession of land is a listed atrocity. File writ petition in Patna High Court for restoration of possession. Contact Jan Nyaya Abhiyan immediately."}]},
  {id:"l8",cat:"Constitution",name:"Constitution of India — Fundamental Rights",hi:"संविधान — मौलिक अधिकार",desc:"Articles 12-35. Right to Equality (14-18), Right to Life (21), Right to Education (21A), Right against Exploitation (23-24), Right to Constitutional Remedies (32).",hi_desc:"अनुच्छेद 12-35। समता, जीवन, शिक्षा, शोषण विरोध, संवैधानिक उपचार का अधिकार।",faqs:[{q:"What is Article 21?",a:"Right to Life and Personal Liberty — cannot be deprived except by procedure established by law. Supreme Court has expanded it to include right to livelihood, dignity, shelter, health, education, and clean environment."},{q:"Can we go directly to Supreme Court for rights violations?",a:"Yes — Article 32 gives direct right to Supreme Court for enforcement of fundamental rights. This itself is a fundamental right. Patna High Court under Article 226 for state-level violations."},{q:"What is the right against untouchability?",a:"Article 17 abolishes untouchability absolutely. Practising it in any form is an offence punishable under Protection of Civil Rights Act 1955 and SC/ST Atrocities Act 1989."}]},
  {id:"l9",cat:"Environment",name:"Environmental Laws & Climate Justice",hi:"पर्यावरण कानून और जलवायु न्याय",desc:"Environment Protection Act 1986, Forest Rights Act 2006, Biological Diversity Act 2002, Water Act, Air Act, National Green Tribunal Act — right to clean environment.",hi_desc:"EPA 1986, वन अधिकार, जैव विविधता, जल, वायु, NGT — स्वच्छ पर्यावरण का अधिकार।",faqs:[{q:"Can citizens file cases for environmental violations?",a:"Yes — PIL in Patna High Court (no fee) or National Green Tribunal (NGT). Environmental violations can also be reported to State Pollution Control Board."},{q:"Who protects forest communities from eviction?",a:"Forest Rights Act 2006 — Gram Sabha has authority to grant and protect rights. State CANNOT evict forest dwellers without Gram Sabha consent and proper procedure under Rules."},{q:"Is clean environment a fundamental right?",a:"Yes — Supreme Court in MC Mehta v. Union of India and multiple cases held that right to clean environment is part of Article 21 right to life."}]},
  {id:"l10",cat:"Identity",name:"Birth/Death Registration & Identity Rights",hi:"जन्म/मृत्यु पंजीकरण और पहचान अधिकार",desc:"Registration of Births and Deaths Act 1969. Every birth and death must be registered. Essential for school, government schemes, marriage, passport, land records.",hi_desc:"जन्म/मृत्यु पंजीकरण अनिवार्य। स्कूल, योजना, विवाह, पासपोर्ट, भूमि अभिलेख के लिए जरूरी।",faqs:[{q:"What if birth was not registered at time of birth?",a:"Apply for late registration at Gram Panchayat or birth certificate office. For adults without birth certificate: affidavit plus school records or medical records are accepted alternatives."},{q:"Can government schemes be denied without Aadhar?",a:"No — Supreme Court has held Aadhar cannot be the sole mandatory requirement for welfare benefits. Alternative documents (ration card, voter ID) must be accepted."},{q:"What documents are needed for marriage registration?",a:"Age proof (18 for bride, 21 for groom), address proof, 2 witnesses, photographs. Under Hindu Marriage Act or Special Marriage Act (for inter-faith marriages)."}]},
];

const PLV_MOD=[
  {id:"m1",icon:"📋",title:"FIR — Your Rights",hi:"FIR — आपके अधिकार",content:"RIGHT to file FIR at ANY police station for any cognisable offence. ZERO FIR (BNSS Sec 173): any station must register regardless of jurisdiction, then transfer. If refused: (1) Go to DSP/SP. (2) Post complaint to Magistrate. (3) File private complaint u/s 200 BNSS.",hi_content:"Zero FIR: किसी भी थाने में FIR दर्ज होगी — किसी भी जिले की। अगर पुलिस मना करे: DSP/SP के पास जाएं, मजिस्ट्रेट को डाक से शिकायत, या धारा 200 BNSS के तहत सीधे मजिस्ट्रेट के पास जाएं।",quiz:[{q:"Can police refuse to register a Zero FIR?",hi_q:"क्या पुलिस Zero FIR दर्ज करने से मना कर सकती है?",opts:["Yes if it's from another district","No — must register at any station","Only if SP permits"],ans:1}]},
  {id:"m2",icon:"⚖",title:"Rights of Arrested Person",hi:"गिरफ्तार व्यक्ति के अधिकार",content:"When arrested you have RIGHT to: (1) Know the reason for arrest. (2) Inform a family member or friend immediately. (3) Meet a lawyer of your choice. (4) Be produced before Magistrate within 24 hours. (5) Not be tortured or forced to confess. (6) Free legal aid if you cannot afford a lawyer (BNSS Sec 304). D.K. Basu v. State of WB (1997) — mandatory arrest guidelines.",hi_content:"गिरफ्तारी पर अधिकार: (1) गिरफ्तारी का कारण जानना। (2) परिवार को तुरंत सूचित करना। (3) अपने वकील से मिलना। (4) 24 घंटे में मजिस्ट्रेट के सामने पेश होना। (5) यातना नहीं। (6) मुफ्त कानूनी सहायता।",quiz:[{q:"Within how many hours must an arrested person be produced before a Magistrate?",hi_q:"गिरफ्तार व्यक्ति को कितने घंटे में मजिस्ट्रेट के सामने पेश करना होता है?",opts:["48 hours","12 hours","24 hours"],ans:2}]},
  {id:"m3",icon:"🛡",title:"POCSO — Protecting Children",hi:"POCSO — बच्चों की सुरक्षा",content:"POCSO Act 2012 protects ALL under 18 from sexual abuse. (1) Section 19 — ANY person MUST report. Failure to report is punishable. (2) Child identity — NEVER disclose. (3) Trial within 1 year. (4) Special POCSO courts. (5) State compensation to victim. (6) Call Childline 1098 immediately.",hi_content:"POCSO 2012: 18 साल से कम सभी बच्चों की सुरक्षा। धारा 19 — कोई भी व्यक्ति रिपोर्ट कर सकता है, अनिवार्य है, नहीं करने पर दंड। बच्चे की पहचान कभी न बताएं। Childline: 1098।",quiz:[{q:"If a school teacher witnesses sexual abuse of a student, must they report it?",hi_q:"अगर एक शिक्षक छात्र के यौन शोषण को देखे, क्या उसे रिपोर्ट करना अनिवार्य है?",opts:["Only if parents request","No — it is optional","Yes — Section 19 makes it mandatory"],ans:2}]},
  {id:"m4",icon:"🏠",title:"Domestic Violence — Protection",hi:"घरेलू हिंसा — संरक्षण",content:"PWDVA 2005 protects women from physical, emotional, sexual, verbal and economic violence by ANY family member. Get: (1) Protection Order — stops abuser. (2) Residence Order — right to stay in shared home. (3) Monetary relief. (4) Custody of children. Call 181 (Women Helpline) or go to One Stop Centre (OSC) in your district — free 24x7.",hi_content:"PWDVA 2005: परिवार के किसी भी सदस्य की हिंसा से सुरक्षा। संरक्षण आदेश, निवास अधिकार, मुआवजा, बच्चों की अभिरक्षा। Women Helpline: 181। जिले में One Stop Centre — 24x7 मुफ्त।",quiz:[{q:"Does PWDVA protect women in live-in relationships?",hi_q:"क्या PWDVA लिव-इन संबंध में महिलाओं को सुरक्षा देता है?",opts:["No, only married women","Yes — married and live-in partners both","Only if they have children"],ans:1}]},
  {id:"m5",icon:"✊",title:"SC/ST Atrocities Act",hi:"SC/ST अत्याचार निवारण अधिनियम",content:"SC/ST Prevention of Atrocities Act 1989. Key points: (1) No anticipatory bail — Supreme Court confirmed in Prithvi Raj Chauhan (2020). (2) Mandatory FIR — police cannot refuse. (3) Special fast-track courts. (4) State compensation to victim. (5) Witness protection. (6) Dispossession of land is a listed atrocity.",hi_content:"SC/ST अत्याचार निवारण अधिनियम 1989। प्रत्याशित जमानत नहीं (सुप्रीम कोर्ट 2020)। FIR अनिवार्य। विशेष न्यायालय। राज्य मुआवजा। जमीन छीनना भी अत्याचार है।",quiz:[{q:"Can a person accused under SC/ST Atrocities Act get anticipatory bail?",hi_q:"SC/ST Act के आरोपी को अग्रिम जमानत मिल सकती है?",opts:["Yes from High Court","No — Supreme Court confirmed no anticipatory bail","Only if victim gives consent"],ans:1}]},
  {id:"m6",icon:"🌾",title:"Land Rights in Bihar",hi:"बिहार में भूमि अधिकार",content:"Rights of landless families in Bihar: (1) Homestead land right (up to 3 decimals) under Bihar Homestead Privilege Persons Act — apply to Circle Officer. (2) Mutation (dakhil-kharij) cannot be unreasonably refused. (3) If land forcibly taken by upper caste — SC/ST Atrocities Act FIR AND writ petition in Patna HC. (4) Forest rights under FRA 2006 for Adivasi communities.",hi_content:"बिहार में भूमिहीन परिवारों के अधिकार: होमस्टेड भूमि (3 डिसमिल), नामांतरण का अधिकार, वन अधिकार। जमीन जबरन छीनने पर SC/ST Act में FIR और पटना HC में रिट याचिका।",quiz:[{q:"Under Bihar Homestead Privilege Act, how much land is a landless family entitled to?",hi_q:"बिहार होमस्टेड अधिकार अधिनियम के तहत भूमिहीन परिवार को कितनी जमीन का अधिकार है?",opts:["10 decimals","Up to 3 decimals","1 bigha"],ans:1}]},
];

const MOVEMENTS=[
  {name:"Right to Food Campaign",theme:"Food Justice",tools:["Jan Sunwais (public hearings)","Hunger marches","Community kitchen sit-ins","Wall paintings of Article 21"]},
  {name:"Narmada Bachao Andolan",theme:"Land & Displacement",tools:["Satyagraha","Padyatras (walking marches)","Survivor testimonies","Kala jatha — art on displacement"]},
  {name:"Dalit Rights / Ambedkarite Movement",theme:"Caste Justice",tools:["Blue flag marches","Constitution reading circles","Street theatre on untouchability","Demands charter to Gram Sabha"]},
  {name:"AIDWA / Women's Rights Movements",theme:"Gender Justice",tools:["Nukkad Natak (street plays)","Survivor story circles","Wall art — break the silence","Candle marches for GBV victims"]},
  {name:"NAPM — People's Movements",theme:"Multi-issue",tools:["Jan Adalat (people's court)","Community fact-finding","Signature campaigns","Public oath-taking ceremonies"]},
  {name:"Forest Rights / Adivasi Movements",theme:"Forest & Land",tools:["Gram Sabha resolutions","Jangal bachao marches","Warli/Gond wall art on rights","Community forest patrolling demonstration"]},
  {name:"Right to Information Movement",theme:"Transparency",tools:["Public noticeboards with RTI info","RTI filing camps","Reading government orders aloud","Shame boards outside offices"]},
  {name:"Anti-Manual Scavenging Campaign",theme:"Dignity",tools:["Community oath-taking ceremonies","School awareness visits","Drama — refuse to clean others' filth","Government scheme access camps"]},
];

const ART_FORMATS=[
  {icon:"🎭",name:"Nukkad Natak",hi:"नुक्कड़ नाटक",desc:"10-15 min street play at chowk, market, or school. Maximum impact with minimum resources. Can be repeated across villages."},
  {icon:"🎨",name:"Wall Art / Mural",hi:"दीवार चित्र / भित्तिचित्र",desc:"Painting constitutional rights, scheme entitlements, or survivor stories on panchayat, school or ration shop walls."},
  {icon:"🥁",name:"Kala Jatha",hi:"कला जत्था",desc:"Moving cultural procession with songs, drums and chants from village to panchayat or block office."},
  {icon:"📖",name:"Jan Sunwai",hi:"जन सुनवाई",desc:"Public hearing where affected persons testify before a citizen panel — powerful, legally documented, media-attracting."},
  {icon:"✍️",name:"Signature / Thumb Campaign",hi:"हस्ताक्षर / अंगूठा अभियान",desc:"Petition drive with thousands of signatures or thumbprints on a demand letter to DM or SP."},
  {icon:"🕯️",name:"Candle March",hi:"मोमबत्ती मार्च",desc:"Evening march with candles — powerful for GBV, custodial deaths, POCSO cases."},
  {icon:"📢",name:"Prabhat Pheri",hi:"प्रभात फेरी",desc:"Early morning procession with songs and slogans. Awakens community, low cost, high visibility."},
  {icon:"📸",name:"Photo Exhibition",hi:"फोटो प्रदर्शनी",desc:"Exhibition of field photographs showing rights violations at panchayat bhawan, block office, or school."},
];

const PSTAKE=[{k:"mukhiya",en:"Mukhiya / Sarpanch",hi:"मुखिया / सरपंच"},{k:"ward",en:"Ward Member",hi:"वार्ड सदस्य"},{k:"secretary",en:"Panchayat Secretary",hi:"पंचायत सचिव"},{k:"asha",en:"ASHA Worker",hi:"आशा कार्यकर्ता"},{k:"anganwadi",en:"Anganwadi Worker",hi:"आंगनवाड़ी कार्यकर्ता"},{k:"principal",en:"School Principal",hi:"प्रधानाध्यापक"},{k:"bdo",en:"Block Development Officer",hi:"BDO प्रखंड विकास पदाधिकारी"}];

export default function JanSahayakCommunity(){
  const [lang,setLang]=useState("hi");
  const [screen,setScreen]=useState("home");
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:"",phone:"",location:"",district:"Purnia",issue:"",issueType:"legal"});
  const [triage,setTriage]=useState(null);
  const [loading,setLoading]=useState(false);
  const [schTab,setSchTab]=useState("central");
  const [schQ,setSchQ]=useState("");
  const [lawQ,setLawQ]=useState("");
  const [activeLaw,setActiveLaw]=useState(null);
  const [activeMod,setActiveMod]=useState(null);
  const [quizAns,setQuizAns]=useState(null);
  const [plvForm,setPlvForm]=useState({name:"",phone:"",location:"",district:"Purnia",age:"",education:"",motivation:"",referredBy:""});
  const [refCode]=useState("JNY-"+Math.random().toString(36).slice(2,7).toUpperCase());
  const [subs,setSubs]=useState([]);
  const [plvSubs,setPlvSubs]=useState([]);
  const [campStep,setCampStep]=useState(1);
  const [campForm,setCampForm]=useState({issue:"",theme:"",location:"",district:"Purnia",artFormat:"Nukkad Natak",movement:"",targetDate:"",contactName:"",contactPhone:"",stakeholders:{}});
  const [campOut,setCampOut]=useState("");
  const [campLoad,setCampLoad]=useState(false);

  useEffect(function(){sg("jsc_s").then(function(d){if(d)setSubs(d);});sg("jsc_p").then(function(d){if(d)setPlvSubs(d);});},[]);

  const hi=lang==="hi";
  function tx(e,h){return hi?h:e;}

  function Btn({children,onClick,disabled,col}){const bg=col==="green"?W.green:col==="purple"?W.purple:col==="blue"?W.blue:W.accent;return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:disabled?"#ccc":bg,color:disabled?"#999":"#fff",fontSize:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",marginTop:10}}>{children}</button>;}
  function Fi({label,value,onChange,type,placeholder,rows}){return <div style={{marginBottom:12}}>{label&&<label style={{fontSize:12,color:W.dim,display:"block",marginBottom:4,fontWeight:600}}>{label}</label>}{rows?<textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder||""} style={{width:"100%",border:"2px solid "+W.border,borderRadius:10,padding:"11px",fontSize:14,color:W.text,lineHeight:1.6,boxSizing:"border-box",resize:"vertical"}}/>:<input type={type||"text"} value={value} onChange={onChange} placeholder={placeholder||""} style={{width:"100%",border:"2px solid "+W.border,borderRadius:10,padding:"11px",fontSize:14,color:W.text,boxSizing:"border-box"}}/>}</div>;}
  function Fs({label,value,onChange,options}){return <div style={{marginBottom:12}}>{label&&<label style={{fontSize:12,color:W.dim,display:"block",marginBottom:4,fontWeight:600}}>{label}</label>}<select value={value} onChange={onChange} style={{width:"100%",border:"2px solid "+W.border,borderRadius:10,padding:"11px",fontSize:14,color:W.text,background:"#fff"}}>{options.map(function(o){const v=o.value!==undefined?o.value:o;const l=o.label!==undefined?o.label:o;return <option key={v} value={v}>{l}</option>;})}</select></div>;}
  function Hdr(title,back){return <div style={{background:W.accent,padding:"13px 18px",display:"flex",alignItems:"center",gap:10}}>{back&&<button onClick={back} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"7px 11px",fontSize:14,cursor:"pointer"}}>←</button>}<div style={{flex:1,fontSize:15,fontWeight:700,color:"#fff"}}>{title}</div><button onClick={function(){setLang(hi?"en":"hi");}} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"5px 9px",fontSize:11,cursor:"pointer"}}>{hi?"EN":"HI"}</button></div>;}
  const S={maxWidth:480,margin:"0 auto",padding:"14px 18px 80px",fontFamily:"'Noto Sans',sans-serif"};

  async function doSubmit(){
    setLoading(true);
    const p="A person from "+form.district+", Bihar described: \""+form.issue+"\"\nRespond ONLY with JSON: {\"type\":\"legal or welfare\",\"urgency\":\"high or normal\",\"summary\":\"one sentence\",\"hi_summary\":\"Hindi\",\"issues\":[],\"next_steps\":[],\"hi_next_steps\":[]}";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:p}]})});const d=await r.json();const raw=(d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");let parsed={type:"legal",urgency:"normal",summary:"Received",hi_summary:"प्राप्त",issues:[],next_steps:["Team will call within 24 hours"],hi_next_steps:["टीम 24 घंटे में कॉल करेगी"]};try{parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());}catch(e){}setTriage(parsed);const sub={id:uid(),name:form.name,phone:form.phone,location:form.location,district:form.district,issue:form.issue,type:parsed.type,urgency:parsed.urgency,date:new Date().toISOString().slice(0,10),status:"pending"};const upd=[...subs,sub];setSubs(upd);await ss("jsc_s",upd);setStep(3);}catch(e){setTriage({type:"legal",urgency:"normal",summary:"Received",hi_summary:"प्राप्त",issues:[],next_steps:["Team will call within 24 hours"],hi_next_steps:["टीम 24 घंटे में कॉल करेगी"]});setStep(3);}
    setLoading(false);
  }

  async function doCampaign(){
    setCampLoad(true);setCampOut("");
    const ins=MOVEMENTS.find(function(m){return m.name===campForm.movement;});
    const sk=Object.entries(campForm.stakeholders).filter(function(e){return e[1];}).map(function(e){return e[0]+": "+e[1];}).join(", ");
    const p="You are a creative social justice campaign designer for Jan Nyaya Abhiyan, Janman People's Foundation, Bihar.\n\nCAMPAIGN BRIEF:\nIssue: "+campForm.issue+"\nTheme: "+campForm.theme+"\nLocation: "+campForm.location+", "+campForm.district+", Bihar\nArt Format: "+campForm.artFormat+"\nInspired by: "+(ins?ins.name+" — tools: "+ins.tools.join("; "):"Indian peoples' movements")+"\nTarget Date: "+campForm.targetDate+"\nContact: "+campForm.contactName+(campForm.contactPhone?" ("+campForm.contactPhone+")":"")+"\nStakeholders: "+(sk||"To be identified")+"\n\nGenerate a full campaign plan:\n\n1. CAMPAIGN NAME (Hindi + English — catchy, movement-inspired, constitutional)\n\n2. CAMPAIGN OBJECTIVES (3-4 specific)\n\n3. KEY MESSAGES (3 messages in Hindi + English — simple, powerful, quotable)\n\n4. ART & CREATIVE PLAN\n - Detailed script/plan for "+campForm.artFormat+"\n - Characters, dialogue cues, visual elements\n - How to involve survivors as creators, not just audience\n - Materials required (cost-conscious)\n\n5. PANCHAYAT & INSTITUTIONAL ENGAGEMENT\n - How to approach Mukhiya/Sarpanch\n - Gram Sabha resolution strategy\n - Collaboration with ASHA, Anganwadi, OSC, DLSA, schools\n - Letters/representations to officials\n\n6. SOCIAL MEDIA CAMPAIGN KIT\n - 3 WhatsApp message drafts (Hindi, brief, shareable)\n - 2 Facebook/Instagram captions (Hindi + English)\n - 3 hashtag suggestions\n - 1 short video concept (30 seconds, smartphone-filmed)\n\n7. 4-WEEK MOBILISATION PLAYBOOK (who does what: PLV, lawyer, social worker, community leader)\n\n8. LEGAL BACKING (constitutional provisions, relevant acts, key case laws)\n\n9. INSPIRATION from 2-3 similar Indian movement campaigns — what worked\n\nMake it deeply practical, culturally rooted in Bihar and Seemanchal, and inspired by the art and tactics of Indian peoples' movements.";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:p}]})});const d=await r.json();setCampOut((d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("")||"Error.");}catch(e){setCampOut("Error generating campaign. Please try again.");}
    setCampLoad(false);setCampStep(3);
  }

  async function doPlv(){
    if(!plvForm.name.trim()||!plvForm.phone.trim())return;
    const sub=Object.assign({id:uid(),date:new Date().toISOString().slice(0,10),status:"applied"},plvForm);
    const upd=[...plvSubs,sub];setPlvSubs(upd);await ss("jsc_p",upd);setScreen("plvOk");
  }

  const fellow=FELLOWS.find(function(f){return f.dist===form.district;});
  const schemes=(schTab==="central"?CENTRAL:BIHAR).filter(function(s){if(!schQ)return true;const q=schQ.toLowerCase();return s.name.toLowerCase().includes(q)||s.hi.includes(q)||s.cat.toLowerCase().includes(q);});
  const laws=LAWS.filter(function(l){if(!lawQ)return true;const q=lawQ.toLowerCase();return l.name.toLowerCase().includes(q)||l.hi.includes(q)||l.cat.toLowerCase().includes(q);});

  // ── HOME ────────────────────────────────────────────────────────────────────
  if(screen==="home")return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#8B1A0A 0%,#C84B31 50%,#E8835C 100%)",fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      <div style={{maxWidth:480,margin:"0 auto",padding:"36px 20px 60px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:65,height:65,borderRadius:17,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 12px"}}>⚖</div>
          <h1 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:27,fontWeight:700,color:"#fff",marginBottom:3}}>{tx("Jan Sahayak","जन सहायक")}</h1>
          <p style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>Janman People's Foundation · Jan Nyaya Abhiyan</p>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>{tx("Free Legal Help · Bihar","मुफ्त कानूनी मदद · बिहार")}</p>
        </div>
        <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"11px",marginBottom:14,display:"flex",justifyContent:"center",gap:8}}>
          {["hi","en"].map(function(l){return <button key={l} onClick={function(){setLang(l);}} style={{padding:"7px 20px",borderRadius:9,border:"none",background:lang===l?"#fff":"transparent",color:lang===l?"#C84B31":"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{l==="hi"?"हिंदी":"English"}</button>;})}
        </div>
        {[
          {icon:"🆘",label:tx("Get Help Now","अभी मदद लें"),sub:tx("Legal issue, FIR, rights violation","कानूनी समस्या, FIR, अधिकार उल्लंघन"),fn:function(){setScreen("intake");setStep(1);},primary:true},
          {icon:"📢",label:tx("Design a Campaign","अभियान बनाएं"),sub:tx("AI-powered awareness & advocacy campaign","AI की मदद से जागरूकता अभियान"),fn:function(){setScreen("campaign");setCampStep(1);setCampOut("");},highlight:true},
          {icon:"📋",label:tx("Government Schemes","सरकारी योजनाएं"),sub:tx("Central + Bihar — eligibility, how to apply","केंद्र + बिहार की योजनाएं"),fn:function(){setScreen("schemes");}},
          {icon:"⚖",label:tx("Know Your Rights","अपने अधिकार जानें"),sub:tx("Acts, laws, landmark cases, FAQs","कानून, अधिनियम, महत्वपूर्ण मामले"),fn:function(){setScreen("laws");}},
          {icon:"📚",label:tx("PLV Training","PLV प्रशिक्षण"),sub:tx("Learn and teach rights in your community","समुदाय में अधिकार सीखें और सिखाएं"),fn:function(){setScreen("plvTrain");}},
          {icon:"🤝",label:tx("Join as PLV Volunteer","PLV बनें"),sub:tx("Register for paralegal training — free","पैरालीगल प्रशिक्षण के लिए पंजीकरण — मुफ्त"),fn:function(){setScreen("plvJoin");}},
          {icon:"📨",label:tx("Refer Someone as PLV","किसी को PLV रेफर करें"),sub:tx("Your referral code: "+refCode,"आपका कोड: "+refCode),fn:function(){setScreen("plvRefer");}},
        ].map(function(item,i){return(
          <button key={i} onClick={item.fn} style={{width:"100%",textAlign:"left",padding:"13px 16px",borderRadius:13,border:item.primary?"none":item.highlight?"2px solid rgba(255,255,180,0.7)":"2px solid rgba(255,255,255,0.42)",background:item.primary?"#fff":item.highlight?"rgba(255,255,150,0.1)":"transparent",color:item.primary?"#C84B31":"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
            <div style={{flex:1}}><div>{item.label}</div><div style={{fontSize:11,opacity:.83,fontWeight:400,marginTop:2}}>{item.sub}</div></div>
            <span style={{marginLeft:"auto",fontSize:16,opacity:.7}}>→</span>
          </button>
        );})}
        <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"rgba(255,255,255,0.68)"}}>🚨 Emergency: 112 · Women: 181 · Children: 1098 · Legal Aid: 15100</div>
      </div>
    </div>
  );

  // ── CAMPAIGN ────────────────────────────────────────────────────────────────
  if(screen==="campaign")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Design a Campaign","अभियान बनाएं"),function(){setScreen("home");})}
      <div style={{display:"flex",margin:"12px 18px 0"}}>{[1,2,3].map(function(i){return <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=campStep?W.purple:W.border,marginRight:i<3?4:0}}/>;})}</div>
      <div style={S}>
        {campStep===1&&<div>
          <div style={{background:"rgba(106,27,154,0.07)",borderRadius:12,padding:"13px 15px",marginBottom:14,border:"1px solid rgba(106,27,154,0.2)"}}>
            <div style={{fontWeight:700,fontSize:13,color:W.purple,marginBottom:4}}>{tx("Plan a campaign with AI","AI के साथ अभियान बनाएं")}</div>
            <div style={{fontSize:12,color:W.dim,lineHeight:1.7}}>{tx("Inspired by India's great peoples' movements — Right to Food, Narmada, Dalit rights, women's movements. A Janman lawyer or social worker can help implement it.","भारत के महान जन आंदोलनों से प्रेरित — अधिकार, न्याय, और कला के माध्यम से।")}</div>
          </div>
          <Fi label={tx("What issue do you want to campaign on?","आप किस मुद्दे पर अभियान चलाना चाहते हैं?")} value={campForm.issue} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{issue:e.target.value});});}} rows={3} placeholder={tx("e.g. Women denied MGNREGA wages / Police not filing FIR in GBV cases / Musahar community being evicted...","e.g. महिलाओं को मनरेगा मजदूरी नहीं मिल रही / GBV में FIR नहीं होती...")}/>
          <Fs label={tx("Theme","विषय")} value={campForm.theme} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{theme:e.target.value});});}} options={["","Gender Justice / महिला न्याय","Caste Justice / जाति न्याय","Land & Forest Rights / भूमि और वन अधिकार","Child Rights / बाल अधिकार","Food & Livelihood / भोजन और आजीविका","Disability Rights / दिव्यांग अधिकार","Right to Information / सूचना का अधिकार","Environment / पर्यावरण","Anti-Corruption / भ्रष्टाचार विरोध"]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fi label={tx("Village / Location","गाँव / स्थान")} value={campForm.location} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="e.g. Ramchak Bariya"/>
            <Fs label={tx("District","जिला")} value={campForm.district} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{district:e.target.value});});}} options={BD}/>
          </div>
          <Fi label={tx("Target date","लक्षित तिथि")} type="date" value={campForm.targetDate} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{targetDate:e.target.value});});}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fi label={tx("Your name","आपका नाम")} value={campForm.contactName} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{contactName:e.target.value});});}}/>
            <Fi label={tx("Your phone","आपका फोन")} type="tel" value={campForm.contactPhone} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{contactPhone:e.target.value});});}}/>
          </div>
          <Btn onClick={function(){setCampStep(2);}} disabled={!campForm.issue.trim()||!campForm.location.trim()}>{tx("Next →","अगला →")}</Btn>
        </div>}
        {campStep===2&&<div>
          <h3 style={{fontSize:15,fontWeight:700,color:W.text,marginBottom:10}}>{tx("Choose campaign art format","अभियान का कला प्रारूप चुनें")}</h3>
          {ART_FORMATS.map(function(af){return(
            <button key={af.name} onClick={function(){setCampForm(function(p){return Object.assign({},p,{artFormat:af.name});});}} style={{width:"100%",textAlign:"left",padding:"11px 13px",borderRadius:11,border:"2px solid "+(campForm.artFormat===af.name?W.purple:W.border),background:campForm.artFormat===af.name?"rgba(106,27,154,0.07)":"#fff",marginBottom:8,cursor:"pointer",display:"flex",gap:12}}>
              <span style={{fontSize:21,flexShrink:0,marginTop:2}}>{af.icon}</span>
              <div><div style={{fontWeight:700,fontSize:13,color:W.text}}>{hi?af.hi:af.name}</div><div style={{fontSize:11,color:W.dim,marginTop:2,lineHeight:1.5}}>{af.desc}</div></div>
            </button>
          );})}
          <h3 style={{fontSize:14,fontWeight:700,color:W.text,marginBottom:7,marginTop:8}}>{tx("Inspired by which movement?","किस आंदोलन से प्रेरित?")}</h3>
          <Fs label="" value={campForm.movement} onChange={function(e){setCampForm(function(p){return Object.assign({},p,{movement:e.target.value});});}} options={[{value:"",label:tx("— Choose a movement —","— आंदोलन चुनें —")},...MOVEMENTS.map(function(m){return {value:m.name,label:m.name+" ("+m.theme+")"};})]}/>
          {campForm.movement&&(function(){const m=MOVEMENTS.find(function(x){return x.name===campForm.movement;});return m?<div style={{background:"rgba(106,27,154,0.07)",borderRadius:9,padding:"9px 12px",marginBottom:10,fontSize:12,color:W.dim}}>{m.tools.map(function(t,i){return <div key={i}>• {t}</div>;})}</div>:null;})()}
          <h3 style={{fontSize:14,fontWeight:700,color:W.text,marginBottom:7}}>{tx("Panchayat stakeholders (optional)","पंचायत हितधारक (वैकल्पिक)")}</h3>
          {PSTAKE.map(function(r){return(
            <div key={r.k} style={{display:"flex",gap:8,alignItems:"center",marginBottom:7}}>
              <div style={{width:130,fontSize:11,color:W.dim,flexShrink:0}}>{hi?r.hi:r.en}</div>
              <input value={campForm.stakeholders[r.k]||""} onChange={function(e){const v=e.target.value;setCampForm(function(p){const sk=Object.assign({},p.stakeholders);sk[r.k]=v;return Object.assign({},p,{stakeholders:sk});});}} placeholder={tx("Name","नाम")} style={{flex:1,border:"1px solid "+W.border,borderRadius:8,padding:"7px 10px",fontSize:12,color:W.text}}/>
            </div>
          );})}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={function(){setCampStep(1);}} style={{flex:1,padding:"12px",borderRadius:10,border:"2px solid "+W.border,background:"transparent",color:W.dim,fontSize:13,fontWeight:600,cursor:"pointer"}}>← {tx("Back","वापस")}</button>
            <button onClick={doCampaign} disabled={campLoad} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:W.purple,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{campLoad?tx("🎨 Designing...","🎨 बना रहे हैं..."):tx("🎨 Design My Campaign →","🎨 मेरा अभियान बनाएं →")}</button>
          </div>
        </div>}
        {campStep===3&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:15,color:W.purple}}>{tx("Your Campaign Plan","आपका अभियान प्लान")}</div>
            <div style={{display:"flex",gap:6}}>
              {campOut&&<button onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(campOut);}} style={{padding:"6px 11px",borderRadius:7,border:"none",background:W.purple,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{tx("Copy","कॉपी")}</button>}
              <button onClick={function(){setCampStep(1);setCampOut("");}} style={{padding:"6px 11px",borderRadius:7,border:"1px solid "+W.border,background:"transparent",color:W.dim,fontSize:11,cursor:"pointer"}}>{tx("New","नया")}</button>
            </div>
          </div>
          {campLoad&&<div style={{padding:"30px",textAlign:"center",color:W.purple,fontSize:13}}>🎨 {tx("Designing your campaign...","आपका अभियान बना रहे हैं...")}</div>}
          {campOut&&<div style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid "+W.border,marginBottom:12}}>
            <pre style={{fontFamily:"'Noto Sans',sans-serif",fontSize:13,color:W.text,whiteSpace:"pre-wrap",lineHeight:1.85,margin:0,maxHeight:550,overflowY:"auto"}}>{campOut}</pre>
          </div>}
          {campOut&&<div style={{background:"rgba(106,27,154,0.07)",borderRadius:12,padding:"13px 15px",border:"1px solid rgba(106,27,154,0.2)"}}>
            <div style={{fontSize:12,fontWeight:700,color:W.purple,marginBottom:5}}>{tx("Need help implementing?","लागू करने में मदद चाहिए?")}</div>
            <div style={{fontSize:12,color:W.dim,marginBottom:8}}>{tx("Connect with your Janman lawyer or social worker to develop and implement this campaign.","इस अभियान को लागू करने के लिए जनमन वकील या सामाजिक कार्यकर्ता से जुड़ें।")}</div>
            <button onClick={function(){setForm(function(p){return Object.assign({},p,{issue:tx("Campaign support needed: ","अभियान में मदद चाहिए: ")+campForm.issue});});setScreen("intake");setStep(1);}} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:W.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{tx("Connect with Janman Team →","जनमन टीम से जुड़ें →")}</button>
          </div>}
        </div>}
      </div>
    </div>
  );

  // ── INTAKE ──────────────────────────────────────────────────────────────────
  if(screen==="intake")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Get Help","मदद लें"),function(){if(step===1)setScreen("home");else setStep(step-1);})}
      <div style={{display:"flex",margin:"12px 18px 0"}}>{[1,2].map(function(i){return <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?W.accent:W.border,marginRight:i<2?4:0}}/>;})}</div>
      <div style={S}>
        {step===1&&<div>
          <h2 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:20,fontWeight:700,color:W.text,marginBottom:3}}>{tx("Your Information","आपकी जानकारी")}</h2>
          <p style={{fontSize:12,color:W.dim,marginBottom:16}}>{tx("All information is confidential.","आपकी जानकारी सुरक्षित और गोपनीय है।")}</p>
          <Fi label={tx("Your Name","आपका नाम")} value={form.name} onChange={function(e){setForm(function(p){return Object.assign({},p,{name:e.target.value});});}} placeholder="e.g. Sunita Devi"/>
          <Fi label={tx("Phone Number","मोबाइल नंबर")} type="tel" value={form.phone} onChange={function(e){setForm(function(p){return Object.assign({},p,{phone:e.target.value});});}} placeholder="9876543210"/>
          <Fi label={tx("Village / Area","गाँव / मोहल्ला")} value={form.location} onChange={function(e){setForm(function(p){return Object.assign({},p,{location:e.target.value});});}}/>
          <Fs label={tx("District","जिला")} value={form.district} onChange={function(e){setForm(function(p){return Object.assign({},p,{district:e.target.value});});}} options={BD}/>
          <Btn onClick={function(){setStep(2);}} disabled={!form.name.trim()||!form.phone.trim()}>{tx("Next →","अगला →")}</Btn>
          <div style={{padding:"9px 12px",background:W.accentSoft,borderRadius:9,marginTop:9,fontSize:11,color:W.dim}}>🔒 {tx("Only shared with your assigned lawyer or social worker.","केवल आपके वकील या सामाजिक कार्यकर्ता के साथ साझा की जाएगी।")}</div>
        </div>}
        {step===2&&<div>
          <h2 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:20,fontWeight:700,color:W.text,marginBottom:3}}>{tx("Your Problem","आपकी समस्या")}</h2>
          <p style={{fontSize:12,color:W.dim,marginBottom:14}}>{tx("Tell us in your own words. No right or wrong way.","अपने शब्दों में बताएं। कोई सही या गलत नहीं।")}</p>
          <Fi label={tx("Describe your situation","अपनी स्थिति बताएं")} value={form.issue} onChange={function(e){setForm(function(p){return Object.assign({},p,{issue:e.target.value});});}} rows={5} placeholder={tx("e.g. My husband beats me and threw me out of the house...","e.g. मेरे पति मुझे मारते हैं और घर से निकाल दिया है...")}/>
          <Fs label={tx("Type of help needed","किस प्रकार की मदद चाहिए")} value={form.issueType} onChange={function(e){setForm(function(p){return Object.assign({},p,{issueType:e.target.value});});}} options={[{value:"legal",label:tx("Legal — FIR, court, rights","कानूनी — FIR, अदालत, अधिकार")},{value:"welfare",label:tx("Government scheme / service","सरकारी योजना / सेवा")},{value:"both",label:tx("Both","दोनों")}]}/>
          <div style={{padding:"10px 12px",background:W.accentSoft,borderRadius:9,marginBottom:9,fontSize:12}}><div style={{fontWeight:700,color:W.accent,marginBottom:2}}>🚨 {tx("Emergency:","आपातकाल:")}</div><div style={{color:W.dim}}>Police: 112 · Women: 181 · Children: 1098</div></div>
          <Btn onClick={doSubmit} disabled={loading||!form.issue.trim()}>{loading?tx("Connecting...","जोड़ रहे हैं..."):tx("Submit for Help","मदद के लिए भेजें")}</Btn>
        </div>}
        {step===3&&triage&&<div>
          <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:50,marginBottom:9}}>{triage.urgency==="high"?"🚨":"✅"}</div><h2 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:21,fontWeight:700,color:W.text,marginBottom:3}}>{tx("Thank You","धन्यवाद")}</h2><p style={{fontSize:12,color:W.dim}}>{tx("Your request has been received.","आपका अनुरोध प्राप्त हो गया।")}</p></div>
          <div style={{background:triage.type==="legal"?W.accentSoft:"rgba(46,125,50,0.08)",borderRadius:12,padding:"14px 16px",marginBottom:10,border:"2px solid "+(triage.type==="legal"?W.accent:W.green)}}>
            <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:7}}><span style={{fontSize:19}}>{triage.type==="legal"?"⚖":"📋"}</span><div style={{fontWeight:700,fontSize:14,color:triage.type==="legal"?W.accent:W.green}}>{hi?(triage.type==="legal"?"कानूनी मामला — वकील को सौंपा":"योजना मामला — सामाजिक कार्यकर्ता को सौंपा"):(triage.type==="legal"?"Legal Issue — Assigned to Lawyer":"Welfare Issue — Assigned to Social Worker")}</div></div>
            <div style={{fontSize:13,color:W.text,lineHeight:1.7}}>{hi?triage.hi_summary:triage.summary}</div>
            {triage.issues&&triage.issues.map(function(x,i){return <div key={i} style={{fontSize:11,color:W.dim,paddingTop:3}}>• {x}</div>;})}
          </div>
          {fellow&&<div style={{background:"#fff",borderRadius:12,padding:"12px 15px",marginBottom:10,border:"1px solid "+W.border}}>
            <div style={{fontSize:11,fontWeight:700,color:W.dim,marginBottom:5}}>{tx("ASSIGNED LAWYER:","आपके वकील:")}</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:36,height:36,borderRadius:9,background:W.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:W.accent}}>{fellow.name[0]}</div><div><div style={{fontWeight:700,fontSize:13,color:W.text}}>{fellow.name}</div><div style={{fontSize:11,color:W.dim}}>District Legal Fellow — {fellow.dist}</div></div></div>
          </div>}
          <div style={{background:"#fff",borderRadius:12,padding:"12px 15px",marginBottom:12,border:"1px solid "+W.border}}>
            <div style={{fontSize:11,fontWeight:700,color:W.dim,marginBottom:6}}>{tx("NEXT STEPS:","अगले कदम:")}</div>
            {(hi?triage.hi_next_steps:triage.next_steps).map(function(s,i){return <div key={i} style={{fontSize:13,color:W.text,padding:"3px 0",display:"flex",gap:7}}><span style={{color:W.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span>{s}</div>;})}
          </div>
          <Btn onClick={function(){setScreen("home");setStep(1);setForm({name:"",phone:"",location:"",district:"Purnia",issue:"",issueType:"legal"});setTriage(null);}}>← {tx("Back to Home","होम पर वापस")}</Btn>
        </div>}
      </div>
    </div>
  );

  // ── SCHEMES ──────────────────────────────────────────────────────────────────
  if(screen==="schemes")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Government Schemes","सरकारी योजनाएं"),function(){setScreen("home");})}
      <div style={S}>
        <input value={schQ} onChange={function(e){setSchQ(e.target.value);}} placeholder={tx("Search schemes...","योजनाएं खोजें...")} style={{width:"100%",border:"2px solid "+W.border,borderRadius:10,padding:"10px 13px",fontSize:14,color:W.text,marginBottom:10,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {["central","bihar"].map(function(tab){return <button key={tab} onClick={function(){setSchTab(tab);setSchQ("");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:schTab===tab?W.accent:"#fff",color:schTab===tab?"#fff":W.dim,fontSize:13,fontWeight:700,cursor:"pointer"}}>{tab==="central"?tx("Central Govt","केंद्र सरकार"):tx("Bihar Govt","बिहार सरकार")}</button>;})}
        </div>
        {schemes.length===0&&<div style={{textAlign:"center",color:W.dim,padding:20}}>No schemes found.</div>}
        {schemes.map(function(s){return(
          <details key={s.id} style={{background:"#fff",borderRadius:12,marginBottom:9,border:"1px solid "+W.border,overflow:"hidden"}}>
            <summary style={{padding:"13px 15px",cursor:"pointer",listStyle:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}><div style={{display:"inline-block",fontSize:10,background:W.accentSoft,color:W.accent,borderRadius:5,padding:"2px 7px",fontWeight:700,marginBottom:4}}>{s.cat}</div><div style={{fontWeight:700,fontSize:13,color:W.text}}>{hi?s.hi:s.name}</div><div style={{fontSize:11,color:W.dim,marginTop:2}}>{hi?s.hi_desc:s.desc}</div></div>
                <span style={{fontSize:17,color:W.accent,flexShrink:0}}>+</span>
              </div>
            </summary>
            <div style={{padding:"0 15px 13px",borderTop:"1px solid "+W.border}}>
              <div style={{fontSize:11,fontWeight:700,color:W.dim,marginTop:10,marginBottom:4}}>{tx("ELIGIBILITY:","पात्रता:")}</div>
              <div style={{fontSize:13,color:W.text,marginBottom:8}}>{s.elig}</div>
              <div style={{fontSize:11,fontWeight:700,color:W.dim,marginBottom:4}}>{tx("DOCUMENTS:","दस्तावेज:")}</div>
              {s.docs.map(function(d,i){return <div key={i} style={{fontSize:12,color:W.text,padding:"2px 0",display:"flex",gap:5}}><span style={{color:W.green}}>✓</span>{d}</div>;})}
              <div style={{marginTop:8,padding:"8px 11px",background:W.accentSoft,borderRadius:7,fontSize:12,color:W.accent}}>📍 {s.apply}</div>
              {s.hotline&&<div style={{marginTop:5,padding:"7px 11px",background:"rgba(46,125,50,0.08)",borderRadius:7,fontSize:12,color:W.green}}>📞 {s.hotline}</div>}
              <button onClick={function(){setForm(function(p){return Object.assign({},p,{issue:tx("I need help with scheme: ","इस योजना में मदद चाहिए: ")+(hi?s.hi:s.name)});});setScreen("intake");setStep(2);}} style={{width:"100%",marginTop:9,padding:"9px",borderRadius:9,border:"none",background:W.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{tx("Get Help →","मदद लें →")}</button>
            </div>
          </details>
        );})}
      </div>
    </div>
  );

  // ── LAWS ────────────────────────────────────────────────────────────────────
  if(screen==="laws")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Know Your Rights","अपने अधिकार जानें"),function(){if(activeLaw){setActiveLaw(null);}else{setScreen("home");}})}
      <div style={S}>
        {!activeLaw&&<div>
          <input value={lawQ} onChange={function(e){setLawQ(e.target.value);}} placeholder={tx("Search laws...","कानून खोजें...")} style={{width:"100%",border:"2px solid "+W.border,borderRadius:10,padding:"10px 13px",fontSize:14,color:W.text,marginBottom:12,boxSizing:"border-box"}}/>
          {laws.map(function(l){return(
            <button key={l.id} onClick={function(){setActiveLaw(l);}} style={{width:"100%",textAlign:"left",padding:"12px 14px",borderRadius:12,border:"1px solid "+W.border,background:"#fff",marginBottom:8,cursor:"pointer",display:"flex",gap:10}}>
              <div style={{flex:1}}><div style={{display:"inline-block",fontSize:10,background:W.accentSoft,color:W.accent,borderRadius:5,padding:"2px 7px",fontWeight:700,marginBottom:3}}>{l.cat}</div><div style={{fontWeight:700,fontSize:13,color:W.text,lineHeight:1.4}}>{hi?l.hi:l.name}</div><div style={{fontSize:11,color:W.dim,marginTop:3}}>{hi?l.hi_desc:l.desc}</div></div>
              <span style={{fontSize:15,color:W.accent,flexShrink:0,marginTop:4}}>→</span>
            </button>
          );})}
        </div>}
        {activeLaw&&<div>
          <button onClick={function(){setActiveLaw(null);}} style={{background:"none",border:"none",color:W.accent,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:11,padding:"3px 0"}}>← {tx("Back","वापस")}</button>
          <div style={{background:"#fff",borderRadius:12,padding:"15px 17px",marginBottom:10,border:"1px solid "+W.border}}>
            <div style={{display:"inline-block",fontSize:10,background:W.accentSoft,color:W.accent,borderRadius:5,padding:"2px 7px",fontWeight:700,marginBottom:7}}>{activeLaw.cat}</div>
            <h2 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:17,fontWeight:700,color:W.text,marginBottom:7,lineHeight:1.4}}>{hi?activeLaw.hi:activeLaw.name}</h2>
            <p style={{fontSize:13,color:W.dim,lineHeight:1.75}}>{hi?activeLaw.hi_desc:activeLaw.desc}</p>
          </div>
          <div style={{background:"#fff",borderRadius:12,padding:"15px 17px",border:"1px solid "+W.border}}>
            <div style={{fontSize:12,fontWeight:700,color:W.dim,marginBottom:12}}>❓ {tx("Frequently Asked Questions","अक्सर पूछे जाने वाले प्रश्न")}</div>
            {activeLaw.faqs.map(function(faq,i){return(
              <details key={i} style={{marginBottom:9,padding:"11px 13px",background:W.accentSoft,borderRadius:9}}>
                <summary style={{cursor:"pointer",fontWeight:700,fontSize:13,color:W.text,listStyle:"none"}}>{faq.q}</summary>
                <div style={{fontSize:12,color:W.dim,lineHeight:1.7,marginTop:9,paddingTop:9,borderTop:"1px solid #E0D5CC80"}}>{faq.a}</div>
              </details>
            );})}
            <button onClick={function(){setForm(function(p){return Object.assign({},p,{issue:tx("I need help with: ","इस बारे में मदद चाहिए: ")+(hi?activeLaw.hi:activeLaw.name)});});setScreen("intake");setStep(2);}} style={{width:"100%",marginTop:6,padding:"10px",borderRadius:9,border:"none",background:W.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{tx("Get Legal Help →","कानूनी मदद लें →")}</button>
          </div>
        </div>}
      </div>
    </div>
  );

  // ── PLV TRAINING ────────────────────────────────────────────────────────────
  if(screen==="plvTrain"){
    if(activeMod)return(
      <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
        <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
        {Hdr(hi?activeMod.hi:activeMod.title,function(){setActiveMod(null);setQuizAns(null);})}
        <div style={S}>
          <div style={{background:"#fff",borderRadius:12,padding:"16px 18px",marginBottom:11,border:"1px solid "+W.border}}><p style={{fontSize:14,color:W.text,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{hi?activeMod.hi_content:activeMod.content}</p></div>
          <div style={{background:W.accentSoft,borderRadius:12,padding:"15px 17px",border:"1px solid "+W.accent+"30"}}>
            <div style={{fontSize:12,fontWeight:700,color:W.accent,marginBottom:10}}>📝 {tx("Quiz — Check what you learned","प्रश्न — क्या सीखा?")}</div>
            {activeMod.quiz.map(function(q,qi){return(
              <div key={qi}>
                <div style={{fontSize:14,fontWeight:600,color:W.text,marginBottom:10}}>{hi?q.hi_q:q.q}</div>
                {q.opts.map(function(opt,oi){const correct=oi===q.ans;const sel=quizAns===oi;const show=quizAns!==null;let bg="#fff";let brd="1px solid "+W.border;let col=W.text;if(show&&correct){bg="rgba(46,125,50,0.1)";brd="2px solid "+W.green;col=W.green;}else if(show&&sel&&!correct){bg="rgba(200,75,49,0.1)";brd="2px solid "+W.accent;col=W.accent;}return <button key={oi} onClick={function(){if(quizAns===null)setQuizAns(oi);}} style={{width:"100%",textAlign:"left",padding:"10px 13px",borderRadius:9,border:brd,background:bg,color:col,fontSize:13,cursor:quizAns===null?"pointer":"default",marginBottom:6,fontWeight:correct&&show?700:400}}>{show&&correct?"✓ ":show&&sel&&!correct?"✗ ":""}{opt}</button>;})}
                {quizAns!==null&&<div style={{padding:"9px 12px",background:"rgba(46,125,50,0.1)",borderRadius:9,fontSize:13,color:W.green,marginTop:3}}>{quizAns===q.ans?tx("Correct! Well done!","सही जवाब! शाबाश!"):tx("Correct answer: ","सही उत्तर: ")+q.opts[q.ans]}</div>}
              </div>
            );})}
          </div>
          <Btn onClick={function(){setActiveMod(null);setQuizAns(null);}}>{tx("← Back to Modules","← मॉड्यूल पर वापस")}</Btn>
        </div>
      </div>
    );
    return(
      <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
        <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
        {Hdr(tx("PLV Training","PLV प्रशिक्षण"),function(){setScreen("home");})}
        <div style={S}>
          <div style={{fontSize:13,color:W.dim,marginBottom:13,lineHeight:1.6}}>{tx("Learn legal rights and teach them in your community. Complete each module and take the quiz.","कानूनी अधिकार सीखें और समुदाय में सिखाएं। प्रत्येक मॉड्यूल पूरा करें और प्रश्न दें।")}</div>
          {PLV_MOD.map(function(m){return(
            <button key={m.id} onClick={function(){setActiveMod(m);setQuizAns(null);}} style={{width:"100%",textAlign:"left",padding:"13px 15px",borderRadius:12,border:"1px solid "+W.border,background:"#fff",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:23,flexShrink:0}}>{m.icon}</span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:W.text}}>{hi?m.hi:m.title}</div><div style={{fontSize:11,color:W.dim,marginTop:2}}>{tx("Tap to learn · Quiz included","सीखने के लिए दबाएं · प्रश्न भी है")}</div></div>
              <span style={{fontSize:15,color:W.accent}}>→</span>
            </button>
          );})}
        </div>
      </div>
    );
  }

  // ── PLV JOIN ────────────────────────────────────────────────────────────────
  if(screen==="plvJoin")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Join as PLV Volunteer","PLV बनें"),function(){setScreen("home");})}
      <div style={S}>
        <div style={{background:W.accentSoft,borderRadius:12,padding:"13px 15px",marginBottom:13,border:"1px solid "+W.accent+"33"}}>
          <div style={{fontWeight:700,fontSize:13,color:W.accent,marginBottom:4}}>{tx("What is a PLV?","PLV क्या है?")}</div>
          <div style={{fontSize:12,color:W.text,lineHeight:1.7}}>{tx("A Para Legal Volunteer trained by Janman to help communities know their rights, file FIRs, access government schemes, and connect to lawyers. Training is free.","जनमन द्वारा प्रशिक्षित स्वयंसेवक जो समुदाय को अधिकार, FIR, योजनाएं और वकीलों से जोड़ता है। प्रशिक्षण मुफ्त है।")}</div>
        </div>
        <Fi label={tx("Full Name","पूरा नाम")} value={plvForm.name} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{name:e.target.value});});}}/>
        <Fi label={tx("Phone Number","मोबाइल नंबर")} type="tel" value={plvForm.phone} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{phone:e.target.value});});}} placeholder="9876543210"/>
        <Fi label={tx("Village / Area","गाँव / मोहल्ला")} value={plvForm.location} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{location:e.target.value});});}}/>
        <Fs label={tx("District","जिला")} value={plvForm.district} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{district:e.target.value});});}} options={BD}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fi label={tx("Age","उम्र")} type="number" value={plvForm.age} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{age:e.target.value});});}}/>
          <Fi label={tx("Education","शिक्षा")} value={plvForm.education} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{education:e.target.value});});}} placeholder={tx("e.g. 10th pass","10वीं पास")}/>
        </div>
        <Fi label={tx("Why do you want to become a PLV?","PLV क्यों बनना चाहते हैं?")} value={plvForm.motivation} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{motivation:e.target.value});});}} rows={2}/>
        <Fi label={tx("Referred by (name or code — optional)","रेफर किया — वैकल्पिक")} value={plvForm.referredBy} onChange={function(e){setPlvForm(function(p){return Object.assign({},p,{referredBy:e.target.value});});}}/>
        <Btn onClick={doPlv} disabled={!plvForm.name.trim()||!plvForm.phone.trim()}>{tx("Submit Application","आवेदन जमा करें")}</Btn>
      </div>
    </div>
  );

  // ── PLV SUCCESS ─────────────────────────────────────────────────────────────
  if(screen==="plvOk")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      <div style={{textAlign:"center",maxWidth:360}}>
        <div style={{fontSize:56,marginBottom:12}}>🎉</div>
        <h2 style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:22,fontWeight:700,color:W.text,marginBottom:6}}>{tx("Application Received!","आवेदन प्राप्त हुआ!")}</h2>
        <p style={{fontSize:13,color:W.dim,lineHeight:1.7,marginBottom:16}}>{tx("Janman team in your district will contact you within 7 days for training.","आपके जिले की जनमन टीम 7 दिनों में प्रशिक्षण के लिए संपर्क करेगी।")}</p>
        <div style={{background:W.accentSoft,borderRadius:12,padding:"14px",marginBottom:16,border:"1px solid "+W.accent+"33"}}>
          <div style={{fontSize:11,color:W.dim,marginBottom:4}}>{tx("Your Referral Code:","आपका रेफरल कोड:")}</div>
          <div style={{fontSize:22,fontWeight:700,color:W.accent,letterSpacing:2}}>{refCode}</div>
          <div style={{fontSize:11,color:W.dim,marginTop:3}}>{tx("Share with others who want to join as PLV!","दूसरों को PLV बनने के लिए शेयर करें!")}</div>
        </div>
        <Btn onClick={function(){setScreen("home");}}>← {tx("Back to Home","होम पर वापस")}</Btn>
      </div>
    </div>
  );

  // ── PLV REFER ────────────────────────────────────────────────────────────────
  if(screen==="plvRefer")return(
    <div style={{minHeight:"100vh",background:W.bg,fontFamily:"'Noto Sans',sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;}"}</style>
      {Hdr(tx("Refer Someone as PLV","PLV के लिए रेफर करें"),function(){setScreen("home");})}
      <div style={S}>
        <div style={{background:W.accentSoft,borderRadius:12,padding:"16px",marginBottom:13,textAlign:"center",border:"1px solid "+W.accent+"33"}}>
          <div style={{fontSize:12,color:W.dim,marginBottom:5}}>{tx("Your Referral Code:","आपका रेफरल कोड:")}</div>
          <div style={{fontSize:25,fontWeight:700,color:W.accent,letterSpacing:3,marginBottom:9}}>{refCode}</div>
          <button onClick={function(){navigator.clipboard&&navigator.clipboard.writeText("Join Jan Sahayak PLV Programme — code: "+refCode+" | Janman Peoples Foundation");}} style={{padding:"8px 16px",borderRadius:8,border:"none",background:W.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{tx("Copy & Share","कॉपी और शेयर करें")}</button>
        </div>
        <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:11,border:"1px solid "+W.border}}>
          <div style={{fontSize:14,fontWeight:700,color:W.text,marginBottom:10}}>{tx("Steps to Refer:","रेफर करने के कदम:")}</div>
          {[tx("Share your referral code with a community member","अपना रेफरल कोड किसी समुदाय सदस्य को शेयर करें"),tx("Ask them to open Jan Sahayak → 'Join as PLV'","उन्हें Jan Sahayak → 'PLV बनें' पर जाने को कहें"),tx("They enter your code in the 'Referred by' field","वे 'रेफर किया' में आपका कोड डालें"),tx("Janman team contacts them for training within 7 days","जनमन टीम 7 दिनों में संपर्क करेगी")].map(function(s,i){return <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:i<3?"1px solid "+W.border:"none",fontSize:13,color:W.text}}><span style={{color:W.accent,fontWeight:700,minWidth:17}}>{i+1}.</span>{s}</div>;})}
        </div>
        <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid "+W.border}}>
          <div style={{fontSize:13,fontWeight:700,color:W.text,marginBottom:9}}>{tx("Who makes a good PLV?","अच्छा PLV कौन बनता है?")}</div>
          {[tx("Youth from the community (18-35 years)","समुदाय का युवा (18-35 वर्ष)"),tx("Women — especially survivors of rights violations","महिला — विशेषकर जो अत्याचार से गुजरी हों"),tx("Can read and write (any education level)","पढ़-लिख सकने वाला (कोई भी शिक्षा)"),tx("Trusted by their community","जिस पर समुदाय भरोसा करे")].map(function(q,i){return <div key={i} style={{fontSize:13,color:W.text,padding:"3px 0",display:"flex",gap:8}}><span style={{color:W.green}}>✓</span>{q}</div>;})}
        </div>
        <Btn col="green" onClick={function(){setScreen("plvJoin");}}>{tx("Register Yourself as PLV →","खुद PLV बनें →")}</Btn>
      </div>
    </div>
  );

  return null;
}
