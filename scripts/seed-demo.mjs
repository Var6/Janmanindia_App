/**
 * Focused end-to-end demo seed — run with:
 *   node scripts/seed-demo.mjs
 *
 * Works OFFLINE against a local MongoDB (default mongodb://localhost:27017)
 * or any MONGODB_URI in .env.local. Creates a complete, demo-ready dataset:
 *   • one user per role (2 verified community members, 2 fully-profiled lawyers)
 *   • TWO fully-worked cases — one criminal, one High Court — each assigned to
 *     + created by a lawyer and shared with the other, with intake facts,
 *     parties, court details, documents, diary, court appearances, stages
 *     advanced, a next hearing date, an audit trail, and an ICP
 *   • case finances on both: Requisition (org-paid) + Reimbursement (self-paid),
 *     some carried all the way to PAID and one left pending for the queue
 *   • a simple superadmin demo login (DEMO_EMAIL / DEMO_PASSWORD)
 *
 * Idempotent + non-destructive: users are upserted; only the demo cases and
 * their ICPs/expenses are wiped and recreated. Safe to run repeatedly.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load env from .env.local so we target the same DB as the app.
const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL)) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "yes") {
  console.error("Refusing to run demo seed in NODE_ENV=production. Set ALLOW_DEV_SEED=yes to override.");
  process.exit(1);
}

// Offline-friendly default: a local mongod. Override via MONGODB_URI.
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const DEV_PASSWORD = "Dev@1234";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@janmanindia.org";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";

const oid = () => new mongoose.Types.ObjectId();
const looseModel = (name) =>
  mongoose.models[name] ?? mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true }));

const User    = looseModel("User");
const Case    = looseModel("Case");
const Expense = looseModel("Expense");
const Icp     = looseModel("Icp");

const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 86_400_000);
const daysOut = (n) => new Date(now.getTime() + n * 86_400_000);
/** Build a case-document subdoc with a stable _id so edit/delete UIs work. */
const doc = (label, url, uploadedBy, ocrStatus = "processed", extra = {}) => ({
  _id: oid(), label, url, uploadedBy, uploadedAt: daysAgo(20), ocrStatus, ...extra,
});

async function run() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^@]*@/, "//***@")} …`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 12000 });
  console.log("Connected.\n");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // ── 1. One user per role (2 community, 2 lawyers) ─────────────────────
  const USERS = [
    { name: "Demo Community",     email: "demo.community@dev.janmanindia.in",  role: "community", phone: "9100000001",
      communityProfile: { govtIdType: "Aadhar",  govtIdUrl: "https://example.com/demo-id.pdf",  verificationStatus: "verified", district: "Patna" } },
    { name: "Sunita Devi",        email: "demo.community2@dev.janmanindia.in", role: "community", phone: "9100000011",
      communityProfile: { govtIdType: "VoterId", govtIdUrl: "https://example.com/sunita-id.pdf", verificationStatus: "verified", district: "Patna" } },

    { name: "Demo Social Worker", email: "demo.sw@dev.janmanindia.in",         role: "socialworker", phone: "9100000002",
      employeeId: "JPF/DEMO/SW/01", joinedAt: new Date("2026-01-10"),
      socialWorkerProfile: { avgResolutionTimeDays: 3.5, openTickets: 2, resolvedTickets: 14, slaBreaches: 0, district: "Patna" } },

    { name: "Adv. Meera Krishnan", email: "demo.litigation@dev.janmanindia.in", role: "litigation", phone: "9100000003",
      employeeId: "JPF/DEMO/LIT/01", joinedAt: new Date("2026-01-12"),
      litigationProfile: { barCouncilId: "BAR/BR/2019/0451", activeCaseCount: 2, location: { district: "Patna", city: "Patna" }, specialisation: ["Criminal", "POCSO", "SC/ST Act"] } },
    { name: "Adv. Imran Sheikh",   email: "demo.litigation2@dev.janmanindia.in", role: "litigation", phone: "9100000013",
      employeeId: "JPF/DEMO/LIT/02", joinedAt: new Date("2026-01-18"),
      litigationProfile: { barCouncilId: "BAR/BR/2017/0188", activeCaseCount: 2, location: { district: "Patna", city: "Patna" }, specialisation: ["Constitutional", "High Court", "Habeas Corpus"] } },

    { name: "Demo HR",            email: "demo.hr@dev.janmanindia.in",         role: "hr",            phone: "9100000004", employeeId: "JPF/DEMO/HR/01",  joinedAt: new Date("2026-01-05") },
    { name: "Demo Finance",       email: "demo.finance@dev.janmanindia.in",    role: "finance",       phone: "9100000005", employeeId: "JPF/DEMO/FIN/01", joinedAt: new Date("2026-01-05") },
    { name: "Demo Director",      email: "demo.director@dev.janmanindia.in",   role: "director",      phone: "9100000006", employeeId: "JPF/DEMO/DIR/01", joinedAt: new Date("2026-01-02") },
    { name: "Demo Administrator", email: "demo.admin@dev.janmanindia.in",      role: "administrator", phone: "9100000007", employeeId: "JPF/DEMO/ADM/01", joinedAt: new Date("2026-01-02") },
    { name: "Demo Super Admin",   email: "demo.superadmin@dev.janmanindia.in", role: "superadmin",    phone: "9100000008", employeeId: "JPF/DEMO/SA/01",  joinedAt: new Date("2026-01-01") },
  ];

  for (const u of USERS) {
    await User.updateOne({ email: u.email }, { $set: { ...u, passwordHash, isActive: true } }, { upsert: true });
  }
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await User.updateOne(
    { email: DEMO_EMAIL.toLowerCase() },
    { $set: { name: "Demo User", email: DEMO_EMAIL.toLowerCase(), role: "superadmin", phone: "9100000000", employeeId: "JPF/DEMO/LOGIN", isActive: true, passwordHash: demoHash } },
    { upsert: true }
  );

  const ids = Object.fromEntries(
    (await User.find({ email: { $in: USERS.map(u => u.email) } }).lean()).map(d => [d.email, d._id])
  );
  const community1 = ids["demo.community@dev.janmanindia.in"];
  const community2 = ids["demo.community2@dev.janmanindia.in"];
  const swId  = ids["demo.sw@dev.janmanindia.in"];
  const lit1  = ids["demo.litigation@dev.janmanindia.in"];   // Meera (criminal)
  const lit2  = ids["demo.litigation2@dev.janmanindia.in"];  // Imran (high court)
  const hrId  = ids["demo.hr@dev.janmanindia.in"];
  const finId = ids["demo.finance@dev.janmanindia.in"];
  const dirId = ids["demo.director@dev.janmanindia.in"];

  // Stamp verification on both community members.
  await User.updateOne({ _id: community1 }, { $set: { "communityProfile.verifiedBy": swId, "communityProfile.verifiedAt": daysAgo(40), "communityProfile.assignedSocialWorker": swId } });
  await User.updateOne({ _id: community2 }, { $set: { "communityProfile.verifiedBy": swId, "communityProfile.verifiedAt": daysAgo(38), "communityProfile.assignedSocialWorker": swId } });
  console.log(`Users:        ${USERS.length + 1} upserted (2 lawyers, 2 verified community, 1 simple demo login)`);

  // ── 2. Two fully-worked cases ─────────────────────────────────────────
  await Case.deleteMany({ caseNumber: { $in: ["JMI-2026-09001", "JMI-2026-09002"] } });

  // CASE A — criminal — led by Meera (lit1), created by Meera, shared with Imran.
  const firDoc = doc("FIR – Patna Bypass PS.pdf", "https://example.com/demo-fir.pdf", lit1, "processed", {
    ocrText: "FIR No. 142/2026 u/s BNS 115/351 registered at Patna Bypass Police Station.", ocrProcessedAt: daysAgo(40),
  });
  const caseA = await Case.create({
    caseTitle: "State vs Ramesh Kumar — assault & criminal intimidation",
    caseNumber: "JMI-2026-09001", status: "Open", path: "criminal", caseType: "FIR",
    district: "Patna", causeTitle: "State vs Ramesh Kumar", courtCaseNumber: "GR 142/2026",
    courtName: "CJM Court, Patna", courtType: "district", state: "Bihar",
    relevantSections: "BNS §115, §351 r/w §3(2)(va) SC/ST Act",
    bailAndAppearanceStatus: "Accused on bail; appearing regularly", stage: "Evidence",
    compensationStatus: "₹50,000 interim relief sanctioned; disbursement pending",
    community: community1, createdBy: lit1, litigationMember: lit1, litigationMembers: [lit1, lit2], socialWorker: swId,
    parties: { petitioners: ["State of Bihar"], respondents: ["Ramesh Kumar"] },
    subject: {
      courtThey: "Accused claims the injury was accidental during a scuffle.",
      ourPoints: "Medical report + two eyewitnesses establish intent; caste slurs were used.",
      reason: "Strong documentary + eyewitness evidence; SC/ST Act adds protective teeth.",
    },
    filingStatus: "filed", eCourtLink: "https://services.ecourts.gov.in/",
    enquiry: {
      filerName: "Demo Community", filerPhone: "9100000001", relationshipWithVictim: "Self",
      victimName: "Demo Community", victimContact: "9100000001", victimAddress: "Kankarbagh, Patna, Bihar",
      issues: ["Physical assault", "Caste-based discrimination"], accusedNames: "Ramesh Kumar", accusedCount: 1,
      factsOfTheCase: "On 12 Apr 2026 the accused assaulted the complainant near the bypass and hurled caste slurs.",
      firNumber: "142/2026", policeStation: "Patna Bypass PS", placeOfOccurrence: "NH-30 Bypass, Kankarbagh", incidentDateTime: daysAgo(50),
    },
    nextHearingDate: daysOut(9),
    documents: [firDoc, doc("Medical report.pdf", "https://example.com/demo-medical.pdf", swId, "processed", { ocrText: "Grievous hurt on left forearm; consistent with blunt-force trauma." })],
    caseDiary: [
      { _id: oid(), date: daysAgo(35), findings: "Met complainant; collected medical records and recorded statement.", writtenBy: swId },
      { _id: oid(), date: daysAgo(10), findings: "Prosecution examined PW-1; cross-examination deferred.", writtenBy: lit1 },
    ],
    courtAppearances: [
      { _id: oid(), date: daysAgo(20), currentStatus: "Charges framed", dailyOrderBrief: "Charges framed u/s BNS 115/351. Listed for prosecution evidence.", lastHearingDate: daysAgo(45), nextHearingDate: daysAgo(10), loggedBy: lit1, loggedAt: daysAgo(20) },
      { _id: oid(), date: daysAgo(10), currentStatus: "PE in progress", dailyOrderBrief: "PW-1 (complainant) examined-in-chief. Cross deferred.", lastHearingDate: daysAgo(20), nextHearingDate: daysOut(9), remarks: "Ensure PW-2 served.", loggedBy: lit1, loggedAt: daysAgo(10) },
    ],
    criminalPath: {
      firFiled: true, firDoc, chargesheetDueDate: daysAgo(20), chargesheetFiled: true, chargesheetDate: daysAgo(28), chargesheetAlertSent: true,
      chargesFramed: true, chargeDocs: [doc("Charge sheet.pdf", "https://example.com/demo-chargesheet.pdf", lit1)],
      trial: {
        prosecutionWitnesses: [{ _id: oid(), name: "Demo Community (PW-1)", deposedAt: daysAgo(10) }, { _id: oid(), name: "Sunil Verma (PW-2)" }],
        defenseWitnesses: [], evidenceDocs: [doc("Site photographs.pdf", "https://example.com/demo-photos.pdf", swId, "pending")], forensicDocs: [],
      },
    },
    auditLog: [
      { _id: oid(), action: "case_created",      summary: "Case registered from community intake", by: lit1, byRole: "litigation", at: daysAgo(48) },
      { _id: oid(), action: "stage_advance",     summary: "Marked FIR Filed done",        by: lit1, byRole: "litigation", at: daysAgo(46) },
      { _id: oid(), action: "stage_advance",     summary: "Marked Chargesheet Filed done", by: lit1, byRole: "litigation", at: daysAgo(28) },
      { _id: oid(), action: "stage_advance",     summary: "Marked Charges Framed done",    by: lit1, byRole: "litigation", at: daysAgo(20) },
      { _id: oid(), action: "case_shared",       summary: "Shared with Adv. Imran Sheikh", by: lit1, byRole: "litigation", at: daysAgo(18) },
      { _id: oid(), action: "appearance_logged", summary: "Court appearance logged for prosecution evidence", by: lit1, byRole: "litigation", at: daysAgo(10) },
    ],
  });

  // CASE B — high court — led by Imran (lit2), created by Imran, shared with Meera.
  const petitionDoc = doc("Writ petition (Crl).pdf", "https://example.com/demo-writ.pdf", lit2, "processed");
  const caseB = await Case.create({
    caseTitle: "Sunita Devi vs State of Bihar — habeas corpus (illegal detention)",
    caseNumber: "JMI-2026-09002", status: "Open", path: "highcourt", caseType: "WP(Crl)",
    district: "Patna", causeTitle: "Sunita Devi vs State of Bihar", courtCaseNumber: "CWJC 8841/2026",
    courtName: "Patna High Court", courtType: "highcourt", state: "Bihar",
    relevantSections: "Art. 226 r/w Art. 21 of the Constitution",
    bailAndAppearanceStatus: "Detenu produced before court; counter awaited", stage: "Arguments",
    compensationStatus: "Compensation prayer pending final orders",
    community: community2, createdBy: lit2, litigationMember: lit2, litigationMembers: [lit2, lit1], socialWorker: swId,
    parties: { petitioners: ["Sunita Devi"], respondents: ["State of Bihar", "SHO, Kotwali PS"] },
    subject: {
      courtThey: "State asserts the detention was lawful under preventive provisions.",
      ourPoints: "No grounds of detention served within statutory time; Art. 22 safeguards breached.",
      reason: "Procedural lapses are on record; habeas corpus is maintainable.",
    },
    filingStatus: "filed", eCourtLink: "https://patnahighcourt.gov.in/",
    enquiry: {
      filerName: "Sunita Devi", filerPhone: "9100000011", relationshipWithVictim: "Wife",
      victimName: "Mohan Paswan", victimContact: "9100000011", victimAddress: "Bakarganj, Patna, Bihar",
      issues: ["Illegal detention", "Police misconduct"], accusedNames: "State / detaining authority", accusedCount: 1,
      factsOfTheCase: "Detenu picked up on 2 May 2026; grounds of detention never furnished to the family.",
      policeStation: "Kotwali PS", placeOfOccurrence: "Bakarganj, Patna", incidentDateTime: daysAgo(30),
    },
    nextHearingDate: daysOut(4),
    documents: [petitionDoc, doc("Grounds of detention (RTI reply).pdf", "https://example.com/demo-rti.pdf", lit2, "processed")],
    caseDiary: [
      { _id: oid(), date: daysAgo(26), findings: "Drafted writ; annexed RTI reply showing no grounds served.", writtenBy: lit2 },
      { _id: oid(), date: daysAgo(6),  findings: "Admission hearing — notice issued to State; counter sought.", writtenBy: lit2 },
    ],
    courtAppearances: [
      { _id: oid(), date: daysAgo(6), currentStatus: "Admitted", dailyOrderBrief: "Petition admitted. Notice to respondents; counter-affidavit in 2 weeks.", lastHearingDate: daysAgo(20), nextHearingDate: daysOut(4), loggedBy: lit2, loggedAt: daysAgo(6) },
    ],
    highCourtPath: {
      petitionFiled:       { filed: true,  filedAt: daysAgo(25), doc: petitionDoc },
      supportingAffidavit: { filed: true,  filedAt: daysAgo(25) },
      admission:           { filed: true,  filedAt: daysAgo(6) },
      counterAffidavit:    { filed: false },
      rejoinder:           { filed: false },
      pleaClose:           { filed: false },
      inducement:          { filed: false },
      officeNotes:         { filed: true,  filedAt: daysAgo(25) },
      argumentsStage:      { filed: false },
      judgements:          { filed: false },
      mainPetitionDoc:     petitionDoc,
      counterAffidavitDocs: [], rejoinderDocs: [], orderDocs: [doc("Admission order.pdf", "https://example.com/demo-order.pdf", lit2)],
      listOfDates: [
        { _id: oid(), date: daysAgo(28), label: "Detenu taken into custody",                 addedBy: lit2, addedAt: daysAgo(26) },
        { _id: oid(), date: daysAgo(25), label: "Writ petition filed before Patna High Court", addedBy: lit2, addedAt: daysAgo(25) },
        { _id: oid(), date: daysAgo(6),  label: "Petition admitted; notice issued",            addedBy: lit2, addedAt: daysAgo(6) },
      ],
    },
    auditLog: [
      { _id: oid(), action: "case_created",  summary: "Habeas corpus writ registered", by: lit2, byRole: "litigation", at: daysAgo(27) },
      { _id: oid(), action: "stage_advance", summary: "Marked Petition Filed done",     by: lit2, byRole: "litigation", at: daysAgo(25) },
      { _id: oid(), action: "stage_advance", summary: "Marked Admission done",          by: lit2, byRole: "litigation", at: daysAgo(6) },
      { _id: oid(), action: "case_shared",   summary: "Shared with Adv. Meera Krishnan", by: lit2, byRole: "litigation", at: daysAgo(5) },
    ],
  });
  console.log(`Cases:        2 created — JMI-2026-09001 (criminal, Meera) + JMI-2026-09002 (high court, Imran)`);

  // ── 3. Individual Care Plans (one per case) ───────────────────────────
  await Icp.deleteMany({ case: { $in: [caseA._id, caseB._id] } });
  await Icp.insertMany([
    { case: caseA._id, community: community1, interviewer: swId, interviewDate: daysAgo(34),
      beneficiaryName: "Demo Community", address: "Kankarbagh, Patna, Bihar", phone: "9100000001", village: "Kankarbagh",
      blockTaluka: "Patna Sadar", gender: "male", ageYears: 34, casteCategory: "SC", currentLocation: "home",
      summary: "Daily-wage worker; sole earner. Needs interim relief + skilling support during trial." },
    { case: caseB._id, community: community2, interviewer: swId, interviewDate: daysAgo(24),
      beneficiaryName: "Sunita Devi", address: "Bakarganj, Patna, Bihar", phone: "9100000011", village: "Bakarganj",
      blockTaluka: "Patna Sadar", gender: "female", ageYears: 41, casteCategory: "OBC", currentLocation: "home",
      summary: "Husband detained; family lost its only income. Needs legal aid + rations support." },
  ]);
  console.log(`ICP:          2 care plans created`);

  // ── 4. Case finances (requisition + reimbursement) ────────────────────
  await Expense.deleteMany({ case: { $in: [caseA._id, caseB._id] } });
  const stamp = (by, atDaysAgo, notes) => ({ by, at: daysAgo(atDaysAgo), notes });
  await Expense.insertMany([
    // Case A
    { case: caseA._id, paidByOrg: true,  category: "legal",  title: "Court filing fee — charge sheet stage", description: "Filing + process fee to the CJM Court registry.", amount: 2500, currency: "INR", vendor: "CJM Court Registry, Patna", incurredAt: daysAgo(27), status: "paid", submittedBy: lit1, submittedRole: "litigation", submittedAt: daysAgo(27), hrVerification: stamp(hrId, 26, "Receipt verified."), directorApproval: stamp(dirId, 25, "Approved."), payment: stamp(finId, 24, "Paid via NEFT.") },
    { case: caseA._id, paidByOrg: false, category: "travel", title: "Travel for client meeting & site visit", description: "Auto + train fare, Patna ↔ Kankarbagh, two trips.", amount: 1800, currency: "INR", vendor: "Self", incurredAt: daysAgo(33), status: "paid", submittedBy: swId, submittedRole: "socialworker", submittedAt: daysAgo(32), hrVerification: stamp(hrId, 31, "Within policy."), directorApproval: stamp(dirId, 30, "Approved."), payment: stamp(finId, 29, "Reimbursed.") },
    { case: caseA._id, paidByOrg: false, category: "other",  title: "Photocopying of case documents", description: "Certified copies of FIR + medical report.", amount: 450, currency: "INR", vendor: "Self", incurredAt: daysAgo(3), status: "submitted", submittedBy: lit1, submittedRole: "litigation", submittedAt: daysAgo(3) },
    // Case B
    { case: caseB._id, paidByOrg: true,  category: "legal",  title: "High Court filing + vakalatnama fee", description: "Court fee for the writ petition + process.", amount: 3200, currency: "INR", vendor: "Patna High Court Registry", incurredAt: daysAgo(25), status: "paid", submittedBy: lit2, submittedRole: "litigation", submittedAt: daysAgo(25), hrVerification: stamp(hrId, 24, "Verified."), directorApproval: stamp(dirId, 23, "Approved."), payment: stamp(finId, 22, "Paid.") },
    { case: caseB._id, paidByOrg: false, category: "travel", title: "Counsel travel to High Court", description: "Two appearances at Patna High Court.", amount: 1200, currency: "INR", vendor: "Self", incurredAt: daysAgo(6), status: "director_approved", submittedBy: lit2, submittedRole: "litigation", submittedAt: daysAgo(6), hrVerification: stamp(hrId, 5, "OK."), directorApproval: stamp(dirId, 4, "Approved — pay.") },
  ]);
  console.log(`Finances:     5 expenses across both cases (requisition + reimbursement; mix of PAID / approved / pending)`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n✅ Demo seed complete.\n");
  console.log("┌─ SIMPLE DEMO LOGIN (superadmin — sees everything) ─────────────");
  console.log(`│  email:     ${DEMO_EMAIL}`);
  console.log(`│  password:  ${DEMO_PASSWORD}`);
  console.log("└────────────────────────────────────────────────────────────────");
  console.log("\nLawyer logins (password Dev@1234):");
  console.log("  Adv. Meera Krishnan  demo.litigation@dev.janmanindia.in   → leads JMI-2026-09001 (criminal)");
  console.log("  Adv. Imran Sheikh    demo.litigation2@dev.janmanindia.in  → leads JMI-2026-09002 (high court)");
  console.log("\nOther roles (password Dev@1234): demo.sw@, demo.hr@, demo.finance@, demo.director@,");
  console.log("  demo.admin@, demo.superadmin@, demo.community@, demo.community2@  (all @dev.janmanindia.in)");
  console.log("\nEach case has the Case Finance tab (Requisition + Reimbursement) + Danger Zone delete.\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Demo seed failed:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
