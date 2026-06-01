/**
 * Focused end-to-end demo seed — run with:
 *   node scripts/seed-demo.mjs
 *
 * Creates exactly ONE example of everything, fully worked through, so you can
 * log in and see every feature populated:
 *   • one user per role (community is VERIFIED; staff are active)
 *   • one criminal case, assigned + created, with intake facts, parties,
 *     court details, documents, diary, court appearances, stages advanced,
 *     a next hearing date, an audit trail, and an Individual Care Plan
 *   • case finances: one Requisition (org-paid) and one Reimbursement
 *     (self-paid) carried all the way to PAID, plus one reimbursement left
 *     pending so the approval queue has something actionable
 *
 * Idempotent: users are upserted by email; the demo case + its ICP/expenses
 * are wiped and recreated each run. Safe to run repeatedly.
 *
 * Login for every seeded account:  password = Dev@1234
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load MONGODB_URI from .env.local so we target the same DB as the app.
const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL)) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

// Never run the dev seed against production unless explicitly opted in.
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "yes") {
  console.error("Refusing to run demo seed in NODE_ENV=production. Set ALLOW_DEV_SEED=yes to override.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const DEV_PASSWORD = "Dev@1234";
const DEMO_CASE_NUMBER = "JMI-2026-09001";

// Simplest demo login — a superadmin so it can see every case + finance queue.
// Override via DEMO_EMAIL / DEMO_PASSWORD env (kept in .env.local + Vercel).
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@janmanindia.org";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";

// Schemas are intentionally loose (`strict: false`) so we can set any real
// model field without re-declaring the full schema here — the app reads with
// the strict models, and every field we set below is a genuine model field.
const oid = () => new mongoose.Types.ObjectId();
const looseModel = (name) =>
  mongoose.models[name] ?? mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true }));

const User    = looseModel("User");
const Case    = looseModel("Case");
const Expense = looseModel("Expense");
const Icp     = looseModel("Icp");

/** Build a case-document subdoc with a stable _id so edit/delete UIs work. */
const doc = (label, url, uploadedBy, ocrStatus = "processed", extra = {}) => ({
  _id: oid(), label, url, uploadedBy, uploadedAt: new Date(), ocrStatus, ...extra,
});

async function run() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^@]*@/, "//***@")} …`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("Connected.\n");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // ── 1. One user per role ──────────────────────────────────────────────
  const USERS = [
    { name: "Demo Community",     email: "demo.community@dev.janmanindia.in",  role: "community", phone: "9100000001",
      communityProfile: { govtIdType: "Aadhar", govtIdUrl: "https://example.com/demo-id.pdf", verificationStatus: "verified", district: "Patna" } },
    { name: "Demo Social Worker", email: "demo.sw@dev.janmanindia.in",         role: "socialworker", phone: "9100000002",
      employeeId: "JPF/DEMO/SW/01", joinedAt: new Date("2026-01-10"),
      socialWorkerProfile: { avgResolutionTimeDays: 3.5, openTickets: 1, resolvedTickets: 9, slaBreaches: 0, district: "Patna" } },
    { name: "Demo Litigation",    email: "demo.litigation@dev.janmanindia.in", role: "litigation", phone: "9100000003",
      employeeId: "JPF/DEMO/LIT/01", joinedAt: new Date("2026-01-12"),
      litigationProfile: { barCouncilId: "BAR/DEMO/001", activeCaseCount: 1, location: { district: "Patna", city: "Patna" }, specialisation: ["Criminal"] } },
    { name: "Demo HR",            email: "demo.hr@dev.janmanindia.in",         role: "hr",          phone: "9100000004", employeeId: "JPF/DEMO/HR/01",  joinedAt: new Date("2026-01-05") },
    { name: "Demo Finance",       email: "demo.finance@dev.janmanindia.in",    role: "finance",     phone: "9100000005", employeeId: "JPF/DEMO/FIN/01", joinedAt: new Date("2026-01-05") },
    { name: "Demo Director",      email: "demo.director@dev.janmanindia.in",   role: "director",    phone: "9100000006", employeeId: "JPF/DEMO/DIR/01", joinedAt: new Date("2026-01-02") },
    { name: "Demo Administrator", email: "demo.admin@dev.janmanindia.in",      role: "administrator", phone: "9100000007", employeeId: "JPF/DEMO/ADM/01", joinedAt: new Date("2026-01-02") },
    { name: "Demo Super Admin",   email: "demo.superadmin@dev.janmanindia.in", role: "superadmin",  phone: "9100000008", employeeId: "JPF/DEMO/SA/01",  joinedAt: new Date("2026-01-01") },
  ];

  for (const u of USERS) {
    await User.updateOne({ email: u.email }, { $set: { ...u, passwordHash, isActive: true } }, { upsert: true });
  }

  // The simplest demo login — its own (simpler) password, full visibility.
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await User.updateOne(
    { email: DEMO_EMAIL.toLowerCase() },
    { $set: { name: "Demo User", email: DEMO_EMAIL.toLowerCase(), role: "superadmin", phone: "9100000000", employeeId: "JPF/DEMO/LOGIN", isActive: true, passwordHash: demoHash } },
    { upsert: true }
  );
  console.log(`Demo login:   ${DEMO_EMAIL} / ${DEMO_PASSWORD}  (superadmin)`);
  const ids = Object.fromEntries(
    (await User.find({ email: { $in: USERS.map(u => u.email) } }).lean()).map(d => [d.email, d._id])
  );
  const communityId = ids["demo.community@dev.janmanindia.in"];
  const swId        = ids["demo.sw@dev.janmanindia.in"];
  const litId       = ids["demo.litigation@dev.janmanindia.in"];
  const hrId        = ids["demo.hr@dev.janmanindia.in"];
  const finId       = ids["demo.finance@dev.janmanindia.in"];
  const dirId       = ids["demo.director@dev.janmanindia.in"];
  console.log(`Users:        ${USERS.length} upserted (1 per role; community VERIFIED)`);

  // Stamp who verified the community member.
  await User.updateOne(
    { _id: communityId },
    { $set: { "communityProfile.verifiedBy": swId, "communityProfile.verifiedAt": new Date(), "communityProfile.assignedSocialWorker": swId } }
  );

  // ── 2. One fully-worked criminal case ─────────────────────────────────
  await Case.deleteOne({ caseNumber: DEMO_CASE_NUMBER });
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86_400_000);
  const daysOut = (n) => new Date(now.getTime() + n * 86_400_000);

  const firDoc = doc("FIR – Patna Bypass PS.pdf", "https://example.com/demo-fir.pdf", litId, "processed", {
    ocrText: "FIR No. 142/2026 u/s BNS 115/351 registered at Patna Bypass Police Station.",
    ocrProcessedAt: daysAgo(40),
  });

  const created = await Case.create({
    caseTitle: "State vs Ramesh Kumar — assault & criminal intimidation",
    caseNumber: DEMO_CASE_NUMBER,
    status: "Open",
    path: "criminal",
    caseType: "FIR",
    district: "Patna",
    causeTitle: "State vs Ramesh Kumar",
    courtCaseNumber: "GR 142/2026",
    courtName: "CJM Court, Patna",
    courtType: "district",
    state: "Bihar",
    relevantSections: "BNS §115, §351 r/w §3(2)(va) SC/ST Act",
    bailAndAppearanceStatus: "Accused on bail; appearing regularly",
    stage: "Evidence",
    compensationStatus: "₹50,000 interim relief sanctioned; disbursement pending",

    // Visibility: assigned to + created by the demo litigation member, so the
    // "assigned OR created" rule and the creator-can-delete path both apply.
    community: communityId,
    createdBy: litId,
    litigationMember: litId,
    litigationMembers: [litId],
    socialWorker: swId,

    parties: { petitioners: ["State of Bihar"], respondents: ["Ramesh Kumar"] },
    subject: {
      courtThey: "Accused claims the injury was accidental during a scuffle.",
      ourPoints: "Medical report + two eyewitnesses establish intent; caste slurs were used.",
      reason: "Strong documentary + eyewitness evidence; SC/ST Act adds protective teeth.",
    },
    filingStatus: "filed",
    eCourtLink: "https://services.ecourts.gov.in/",

    enquiry: {
      filerName: "Demo Community",
      filerPhone: "9100000001",
      relationshipWithVictim: "Self",
      victimName: "Demo Community",
      victimContact: "9100000001",
      victimAddress: "Kankarbagh, Patna, Bihar",
      issues: ["Physical assault", "Caste-based discrimination"],
      accusedNames: "Ramesh Kumar",
      accusedCount: 1,
      factsOfTheCase: "On 12 Apr 2026 the accused assaulted the complainant near the bypass and hurled caste slurs.",
      firNumber: "142/2026",
      policeStation: "Patna Bypass PS",
      placeOfOccurrence: "NH-30 Bypass, Kankarbagh",
      incidentDateTime: daysAgo(50),
    },

    nextHearingDate: daysOut(9),

    documents: [
      firDoc,
      doc("Medical report.pdf", "https://example.com/demo-medical.pdf", swId, "processed",
        { ocrText: "Grievous hurt noted on left forearm; consistent with blunt-force trauma." }),
    ],

    caseDiary: [
      { _id: oid(), date: daysAgo(35), findings: "Met complainant; collected medical records and recorded statement.", writtenBy: swId },
      { _id: oid(), date: daysAgo(10), findings: "Prosecution examined PW-1; cross-examination deferred.", writtenBy: litId },
    ],

    courtAppearances: [
      { _id: oid(), date: daysAgo(20), currentStatus: "Charges framed", dailyOrderBrief: "Charges framed u/s BNS 115/351. Matter listed for prosecution evidence.", lastHearingDate: daysAgo(45), nextHearingDate: daysAgo(10), loggedBy: litId, loggedAt: daysAgo(20) },
      { _id: oid(), date: daysAgo(10), currentStatus: "PE in progress", dailyOrderBrief: "PW-1 (complainant) examined-in-chief. Cross deferred at defence request.", lastHearingDate: daysAgo(20), nextHearingDate: daysOut(9), remarks: "Ensure PW-2 served.", loggedBy: litId, loggedAt: daysAgo(10) },
    ],

    criminalPath: {
      firFiled: true,
      firDoc,
      chargesheetDueDate: daysAgo(20),
      chargesheetFiled: true,
      chargesheetDate: daysAgo(28),
      chargesheetAlertSent: true,
      chargesFramed: true,
      chargeDocs: [doc("Charge sheet.pdf", "https://example.com/demo-chargesheet.pdf", litId)],
      trial: {
        prosecutionWitnesses: [
          { _id: oid(), name: "Demo Community (PW-1)", deposedAt: daysAgo(10) },
          { _id: oid(), name: "Sunil Verma (PW-2)" },
        ],
        defenseWitnesses: [],
        evidenceDocs: [doc("Site photographs.pdf", "https://example.com/demo-photos.pdf", swId, "pending")],
        forensicDocs: [],
      },
    },

    auditLog: [
      { _id: oid(), action: "case_created",   summary: "Case registered from community intake", by: litId, byRole: "litigation", at: daysAgo(48) },
      { _id: oid(), action: "stage_advance",  summary: "Marked FIR Filed done",        by: litId, byRole: "litigation", at: daysAgo(46) },
      { _id: oid(), action: "stage_advance",  summary: "Marked Chargesheet Filed done", by: litId, byRole: "litigation", at: daysAgo(28) },
      { _id: oid(), action: "stage_advance",  summary: "Marked Charges Framed done",    by: litId, byRole: "litigation", at: daysAgo(20) },
      { _id: oid(), action: "appearance_logged", summary: "Court appearance logged for prosecution evidence", by: litId, byRole: "litigation", at: daysAgo(10) },
    ],
  });
  const caseId = created._id;
  console.log(`Case:         ${DEMO_CASE_NUMBER} created (assigned + created by Demo Litigation)`);

  // ── 3. Individual Care Plan (one per case) ────────────────────────────
  await Icp.deleteOne({ case: caseId });
  await Icp.create({
    case: caseId,
    community: communityId,
    interviewer: swId,
    interviewDate: daysAgo(34),
    beneficiaryName: "Demo Community",
    address: "Kankarbagh, Patna, Bihar",
    phone: "9100000001",
    village: "Kankarbagh",
    blockTaluka: "Patna Sadar",
    gender: "male",
    ageYears: 34,
    casteCategory: "SC",
    currentLocation: "home",
    summary: "Daily-wage worker; sole earner. Needs interim relief + skilling support during trial.",
  });
  console.log(`ICP:          1 care plan created`);

  // ── 4. Case finances ──────────────────────────────────────────────────
  await Expense.deleteMany({ case: caseId });
  const stamp = (by, atDaysAgo, notes) => ({ by, at: daysAgo(atDaysAgo), notes });

  const FINANCES = [
    {
      // Requisition — organisation pays directly — taken all the way to PAID.
      case: caseId, paidByOrg: true, category: "legal", title: "Court filing fee — charge sheet stage",
      description: "Filing + process fee paid to the CJM Court registry.", amount: 2500, currency: "INR",
      vendor: "CJM Court Registry, Patna", incurredAt: daysAgo(27), status: "paid",
      submittedBy: litId, submittedRole: "litigation", submittedAt: daysAgo(27),
      hrVerification: stamp(hrId, 26, "Receipt verified."),
      directorApproval: stamp(dirId, 25, "Approved."),
      payment: stamp(finId, 24, "Paid via NEFT."),
    },
    {
      // Reimbursement — worker paid out of pocket — taken all the way to PAID.
      case: caseId, paidByOrg: false, category: "travel", title: "Travel for client meeting & site visit",
      description: "Auto + train fare, Patna ↔ Kankarbagh, two trips.", amount: 1800, currency: "INR",
      vendor: "Self", incurredAt: daysAgo(33), status: "paid",
      submittedBy: swId, submittedRole: "socialworker", submittedAt: daysAgo(32),
      hrVerification: stamp(hrId, 31, "Within policy."),
      directorApproval: stamp(dirId, 30, "Approved."),
      payment: stamp(finId, 29, "Reimbursed to social worker."),
    },
    {
      // Reimbursement still pending — gives the approval queues something to act on.
      case: caseId, paidByOrg: false, category: "other", title: "Photocopying of case documents",
      description: "Certified copies of FIR + medical report for the brief.", amount: 450, currency: "INR",
      vendor: "Self", incurredAt: daysAgo(3), status: "submitted",
      submittedBy: litId, submittedRole: "litigation", submittedAt: daysAgo(3),
    },
  ];
  await Expense.insertMany(FINANCES);
  console.log(`Finances:     3 expenses (1 requisition PAID, 1 reimbursement PAID, 1 reimbursement PENDING)`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n✅ Demo seed complete.\n");
  console.log("Login (password for all):  Dev@1234");
  for (const u of USERS) console.log(`  ${u.role.padEnd(13)} ${u.email}`);
  console.log(`\nOpen the case as Demo Litigation (creator+lead) or Demo Director:`);
  console.log(`  ${DEMO_CASE_NUMBER} — State vs Ramesh Kumar`);
  console.log(`  → Case Finance tab shows the Requisition + Reimbursement lanes.`);
  console.log(`  → Danger Zone (delete) is visible to the creator/director/superadmin.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Demo seed failed:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
