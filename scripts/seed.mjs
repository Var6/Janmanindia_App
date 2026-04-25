/**
 * Standalone seed script — run with:
 *   node scripts/seed.mjs
 *
 * Seeds users (community, socialworker, litigation, hr, finance, superadmin)
 * + cases, appointments, EOD reports, SOS alerts, assets, grievances,
 * training materials, activities, logistics tickets, district helplines,
 * and a handful of chat conversations + messages.
 *
 * Director + Administrator users are seeded by `seed-privileged.mjs` (gitignored).
 * If that file exists alongside this one, it is auto-chained at the end.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// Load MONGODB_URI from .env.local so the seed always targets the same DB the
// Next.js app is reading from. Without this, the seed silently writes to its
// own default database and the app never sees the data.
const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = join(HERE, "..", ".env.local");
if (existsSync(ENV_LOCAL) && !process.env.MONGODB_URI) {
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const DEV_PASSWORD = "Dev@1234";

// ── Schemas (kept in sync with /models/*.ts) ────────────────────────────────

const documentSchema = new mongoose.Schema(
  {
    label: String,
    url: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: { type: Date, default: Date.now },
    ocrStatus: { type: String, default: "pending" },
    ocrText: String,
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    role: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    employeeId: { type: String, unique: true, sparse: true },
    joinedAt: Date,
    communityProfile: {
      govtIdUrl: String,
      govtIdType: String,
      verificationStatus: { type: String, default: "pending" },
      district: String,
      plvStatus: { type: String, default: "none" },
      plvMotivation: String,
      plvRequestedAt: Date,
      plvDecidedBy: mongoose.Schema.Types.ObjectId,
      plvDecidedAt: Date,
      plvRejectionReason: String,
    },
    socialWorkerProfile: {
      avgResolutionTimeDays: Number,
      openTickets: Number,
      resolvedTickets: Number,
      slaBreaches: Number,
      district: String,
    },
    litigationProfile: {
      barCouncilId: String,
      activeCaseCount: Number,
      location: { district: String, city: String },
      specialisation: [String],
    },
  },
  { timestamps: true }
);

const caseSchema = new mongoose.Schema(
  {
    caseTitle: String,
    caseNumber: { type: String, unique: true },
    status: String,
    path: String,
    caseType: String,
    community: mongoose.Schema.Types.ObjectId,
    litigationMember: mongoose.Schema.Types.ObjectId,
    socialWorker: mongoose.Schema.Types.ObjectId,
    nextHearingDate: Date,
    documents: [documentSchema],
    caseDiary: [
      { date: Date, findings: String, writtenBy: mongoose.Schema.Types.ObjectId },
    ],
    criminalPath: {
      firFiled: Boolean,
      firDoc: documentSchema,
      chargesheetDueDate: Date,
      chargesheetFiled: Boolean,
      chargesheetDate: Date,
      chargesheetAlertSent: Boolean,
      chargesFramed: Boolean,
      chargeDocs: [documentSchema],
      trial: {
        prosecutionWitnesses: [{ name: String }],
        defenseWitnesses: [{ name: String }],
        evidenceDocs: [documentSchema],
        forensicDocs: [documentSchema],
      },
      verdict: String,
      verdictDate: Date,
    },
    highCourtPath: {
      petitionFiled: { filed: Boolean, filedAt: Date, notes: String },
      supportingAffidavit: { filed: Boolean, filedAt: Date },
      admission: { filed: Boolean },
      counterAffidavit: { filed: Boolean },
      rejoinder: { filed: Boolean },
      pleaClose: { filed: Boolean },
      inducement: { filed: Boolean },
    },
  },
  { timestamps: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    community: mongoose.Schema.Types.ObjectId,
    socialWorker: mongoose.Schema.Types.ObjectId,
    litigationMember: mongoose.Schema.Types.ObjectId,
    requestedAt: { type: Date, default: Date.now },
    proposedDate: Date,
    status: { type: String, default: "pending_sw" },
    reason: String,
    swNotes: String,
    litigationNotes: String,
  },
  { timestamps: true }
);

const eodReportSchema = new mongoose.Schema(
  {
    submittedBy: mongoose.Schema.Types.ObjectId,
    date: Date,
    summary: String,
    hoursWorked: Number,
    ticketsWorkedOn: [mongoose.Schema.Types.ObjectId],
    expenses: [{ description: String, amount: Number, receiptUrl: String }],
    invoiceUrl: String,
    invoiceStatus: { type: String, default: "pending" },
    reviewedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const sosAlertSchema = new mongoose.Schema(
  {
    raisedBy: mongoose.Schema.Types.ObjectId,
    location: String,
    description: String,
    mediaUrls: [String],
    status: { type: String, default: "open" },
    escalatedBy: mongoose.Schema.Types.ObjectId,
    escalatedAt: Date,
    assignedTo: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const assetSchema = new mongoose.Schema(
  {
    employee: mongoose.Schema.Types.ObjectId,
    type: String,
    name: String,
    identifier: String,
    notes: String,
    status: { type: String, default: "assigned" },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: mongoose.Schema.Types.ObjectId,
    returnedAt: Date,
    returnedBy: mongoose.Schema.Types.ObjectId,
    returnNotes: String,
  },
  { timestamps: true }
);

const grievanceSchema = new mongoose.Schema(
  {
    submittedBy: mongoose.Schema.Types.ObjectId,
    anonymous: { type: Boolean, default: false },
    category: String,
    subject: String,
    description: String,
    incidentDate: Date,
    incidentLocation: String,
    involvedPersons: String,
    status: { type: String, default: "open" },
    hrResponse: String,
    respondedBy: mongoose.Schema.Types.ObjectId,
    respondedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

const trainingMaterialSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    category: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: "pending" },
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    category: { type: String, default: "other" },
    priority: { type: String, default: "medium" },
    status: { type: String, default: "planned" },
    assignee: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    dueDate: Date,
    startedAt: Date,
    completedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

const logisticsTicketSchema = new mongoose.Schema(
  {
    raisedBy: mongoose.Schema.Types.ObjectId,
    assignedTo: mongoose.Schema.Types.ObjectId,
    category: String,
    urgency: { type: String, default: "normal" },
    title: String,
    description: String,
    beneficiary: String,
    district: String,
    location: String,
    status: { type: String, default: "open" },
    response: String,
    fulfilledAt: Date,
    rejectedReason: String,
    closedAt: Date,
  },
  { timestamps: true }
);

const districtHelplineSchema = new mongoose.Schema(
  {
    district: { type: String, unique: true },
    primaryName: String,
    primaryPhone: String,
    secondaryName: String,
    secondaryPhone: String,
    notes: String,
    setBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "dm" },
    participants: [mongoose.Schema.Types.ObjectId],
    title: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    lastMessageAt: Date,
    lastMessagePreview: String,
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: mongoose.Schema.Types.ObjectId,
    sender: mongoose.Schema.Types.ObjectId,
    text: String,
    readBy: [mongoose.Schema.Types.ObjectId],
    editedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Note: subdoc arrays use explicit `{ type: ... }` because field names like
// `type` would otherwise collide with Mongoose's type-discriminator keyword.
const careGoalSeedSchema = new mongoose.Schema({
  description: String,
  targetDate: Date,
  completed: { type: Boolean, default: false },
  completedAt: Date,
});
const careSessionSeedSchema = new mongoose.Schema({
  date: Date,
  type: { type: String },
  notes: String,
  conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const carePlanSchema = new mongoose.Schema(
  {
    community: mongoose.Schema.Types.ObjectId,
    case: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    title: String,
    category: String,
    priority: { type: String, default: "medium" },
    status: { type: String, default: "active" },
    summary: String,
    goals: [careGoalSeedSchema],
    sessions: [careSessionSeedSchema],
    referredTo: String,
    confidentialNotes: String,
    closedAt: Date,
  },
  { timestamps: true }
);

const enrollmentSeedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  enrolledAt: { type: Date, default: Date.now },
  attended: Boolean,
});
const trainingSessionSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    topics: [String],
    venue: String,
    district: String,
    date: Date,
    endDate: Date,
    capacity: { type: Number, default: 30 },
    conductedBy: mongoose.Schema.Types.ObjectId,
    facilitators: String,
    targetAudience: String,
    language: String,
    enrollments: [enrollmentSeedSchema],
    status: { type: String, default: "scheduled" },
    highlights: String,
  },
  { timestamps: true }
);

// ── Models ──────────────────────────────────────────────────────────────────
const User             = mongoose.models.User             ?? mongoose.model("User", userSchema);
const Case             = mongoose.models.Case             ?? mongoose.model("Case", caseSchema);
const Appointment      = mongoose.models.Appointment      ?? mongoose.model("Appointment", appointmentSchema);
const EodReport        = mongoose.models.EodReport        ?? mongoose.model("EodReport", eodReportSchema);
const SosAlert         = mongoose.models.SosAlert         ?? mongoose.model("SosAlert", sosAlertSchema);
const Asset            = mongoose.models.Asset            ?? mongoose.model("Asset", assetSchema);
const Grievance        = mongoose.models.Grievance        ?? mongoose.model("Grievance", grievanceSchema);
const TrainingMaterial = mongoose.models.TrainingMaterial ?? mongoose.model("TrainingMaterial", trainingMaterialSchema);
const Activity         = mongoose.models.Activity         ?? mongoose.model("Activity", activitySchema);
const LogisticsTicket  = mongoose.models.LogisticsTicket  ?? mongoose.model("LogisticsTicket", logisticsTicketSchema);
const DistrictHelpline = mongoose.models.DistrictHelpline ?? mongoose.model("DistrictHelpline", districtHelplineSchema);
const Conversation     = mongoose.models.Conversation     ?? mongoose.model("Conversation", conversationSchema);
const Message          = mongoose.models.Message          ?? mongoose.model("Message", messageSchema);
const CarePlan         = mongoose.models.CarePlan         ?? mongoose.model("CarePlan", carePlanSchema);
const TrainingSession  = mongoose.models.TrainingSession  ?? mongoose.model("TrainingSession", trainingSessionSchema);

// ── Run ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`Connecting to ${MONGODB_URI} …`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("Connected.\n");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // Users — community / socialworker / litigation / hr / finance / superadmin
  const TEST_USERS = [
    { name: "Dev Community",       email: "community@dev.janmanindia.in", role: "community",   phone: "9000000001",
      communityProfile: { govtIdType: "Aadhar",   govtIdUrl: "https://example.com/dev-id.pdf",   verificationStatus: "verified", district: "Delhi"   } },
    { name: "Priya Sharma",        email: "priya@dev.janmanindia.in",     role: "community",   phone: "9000000011",
      communityProfile: { govtIdType: "VoterId",  govtIdUrl: "https://example.com/priya-id.pdf", verificationStatus: "pending",  district: "Mumbai Suburban" } },
    { name: "Rajan Mehra",         email: "rajan@dev.janmanindia.in",     role: "community",   phone: "9000000012",
      communityProfile: { govtIdType: "Passport", govtIdUrl: "https://example.com/rajan-id.pdf", verificationStatus: "verified", district: "Patna"   } },

    { name: "Dev Social Worker",   email: "sw@dev.janmanindia.in",        role: "socialworker", phone: "9000000002",
      employeeId: "JPF/JNA/26/01", joinedAt: new Date("2026-01-15"),
      socialWorkerProfile: { avgResolutionTimeDays: 4.2, openTickets: 3, resolvedTickets: 12, slaBreaches: 1, district: "Delhi" } },
    { name: "Anita Desai",         email: "anita@dev.janmanindia.in",     role: "socialworker", phone: "9000000013",
      employeeId: "JPF/JNA/26/02", joinedAt: new Date("2026-02-01"),
      socialWorkerProfile: { avgResolutionTimeDays: 6.8, openTickets: 5, resolvedTickets: 28, slaBreaches: 3, district: "Mumbai Suburban" } },

    { name: "Dev Litigation",      email: "litigation@dev.janmanindia.in", role: "litigation",  phone: "9000000003",
      employeeId: "JPF/LIT/26/01", joinedAt: new Date("2026-01-20"),
      litigationProfile: { barCouncilId: "BAR/DEV/001", activeCaseCount: 5, location: { district: "Delhi", city: "New Delhi" }, specialisation: ["Criminal", "Constitutional"] } },
    { name: "Vikram Nair",         email: "vikram@dev.janmanindia.in",    role: "litigation",  phone: "9000000014",
      employeeId: "JPF/LIT/26/02", joinedAt: new Date("2026-02-10"),
      litigationProfile: { barCouncilId: "BAR/DEV/002", activeCaseCount: 8, location: { district: "Mumbai Suburban", city: "Mumbai" }, specialisation: ["Civil", "Family"] } },

    { name: "Dev HR Manager",      email: "hr@dev.janmanindia.in",        role: "hr",          phone: "9000000004",
      employeeId: "JPF/COR/26/01", joinedAt: new Date("2026-01-05") },
    { name: "Dev Finance Officer", email: "finance@dev.janmanindia.in",   role: "finance",     phone: "9000000005",
      employeeId: "JPF/COR/26/02", joinedAt: new Date("2026-01-08") },
    { name: "Dev Super Admin",     email: "superadmin@dev.janmanindia.in", role: "superadmin", phone: "9000000007",
      employeeId: "JPF/COR/26/03", joinedAt: new Date("2026-01-01") },
  ];

  let usersCreated = 0, usersUpdated = 0;
  for (const u of TEST_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      await User.updateOne({ email: u.email }, { ...u, passwordHash, isActive: true });
      usersUpdated++;
    } else {
      await User.create({ ...u, passwordHash, isActive: true });
      usersCreated++;
    }
  }
  console.log(`Users:        ${usersCreated} created, ${usersUpdated} updated`);

  const docs = await User.find({ email: { $in: TEST_USERS.map((u) => u.email) } }).lean();
  const byEmail = Object.fromEntries(docs.map((d) => [d.email, d._id]));

  const communityId = byEmail["community@dev.janmanindia.in"];
  const priyaId   = byEmail["priya@dev.janmanindia.in"];
  const rajanId   = byEmail["rajan@dev.janmanindia.in"];
  const swId      = byEmail["sw@dev.janmanindia.in"];
  const anitaId   = byEmail["anita@dev.janmanindia.in"];
  const litigId   = byEmail["litigation@dev.janmanindia.in"];
  const vikramId  = byEmail["vikram@dev.janmanindia.in"];
  const hrId      = byEmail["hr@dev.janmanindia.in"];
  const financeId = byEmail["finance@dev.janmanindia.in"];
  const superId   = byEmail["superadmin@dev.janmanindia.in"];

  // Cases
  await Case.deleteMany({ caseNumber: /^DEV-/ });
  const cases = await Case.insertMany([
    {
      caseTitle: "State v. Unknown — Theft at Karol Bagh Market",
      caseNumber: "DEV-CRM-001", status: "Open", path: "criminal", caseType: "FIR",
      community: communityId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-10"),
      caseDiary: [
        { date: new Date("2026-04-01"), findings: "FIR registered at Karol Bagh PS. Client cooperative.", writtenBy: litigId },
        { date: new Date("2026-04-15"), findings: "Chargesheet review in progress. Awaiting forensic report.", writtenBy: litigId },
      ],
      criminalPath: {
        firFiled: true,
        firDoc: { label: "FIR Copy", url: "https://example.com/fir-001.pdf", uploadedBy: litigId, uploadedAt: new Date("2026-04-01"), ocrStatus: "processed", ocrText: "FIR No. 45/2026 Karol Bagh Police Station..." },
        chargesheetDueDate: new Date("2026-06-01"), chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "Ramesh Kumar" }, { name: "Shop owner Gupta" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
    },
    {
      caseTitle: "Priya Sharma v. Landlord — Unlawful Eviction",
      caseNumber: "DEV-HC-001", status: "Pending", path: "highcourt", caseType: "WP(C)",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-22"),
      caseDiary: [{ date: new Date("2026-03-20"), findings: "Petition drafted. Client evicted without notice.", writtenBy: vikramId }],
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-03-25"), notes: "Writ petition filed under Article 226." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-03-25") },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
    {
      caseTitle: "Rajan Mehra — Custodial Violence Complaint",
      caseNumber: "DEV-CRM-002", status: "Escalated", path: "criminal", caseType: "ST",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-04-30"),
      caseDiary: [{ date: new Date("2026-04-10"), findings: "Medical examination report obtained. Serious injuries documented.", writtenBy: litigId }],
      criminalPath: {
        firFiled: true, chargesheetFiled: false, chargesheetDueDate: new Date("2026-05-15"), chargesheetAlertSent: true, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "Dr. Sunita Rao (Medical Officer)" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
    },
    {
      caseTitle: "Consumer Dispute — Defective Appliance (Closed)",
      caseNumber: "DEV-CRM-003", status: "Closed", path: "criminal", caseType: "MS",
      community: communityId, litigationMember: litigId, socialWorker: swId,
      caseDiary: [{ date: new Date("2026-02-01"), findings: "Settlement reached. Refund issued to client.", writtenBy: litigId }],
      criminalPath: {
        firFiled: true, chargesheetFiled: true, chargesheetDate: new Date("2026-02-10"), chargesheetAlertSent: true, chargesFramed: true, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
        verdict: "Settled — full refund awarded", verdictDate: new Date("2026-03-01"),
      },
    },

    // ── Criminal — bail, DV, maintenance ─────────────────────────────────
    {
      caseTitle: "Bail Application — Rajan Mehra (custodial violence FIR)",
      caseNumber: "DEV-BA-004", status: "Pending", path: "criminal", caseType: "BA",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-04-29"),
      criminalPath: { firFiled: true, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },
    {
      caseTitle: "Anticipatory Bail — Priya Sharma (false 354 complaint)",
      caseNumber: "DEV-ABA-005", status: "Open", path: "criminal", caseType: "ABA",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-04"),
      criminalPath: { firFiled: true, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },
    {
      caseTitle: "Domestic Violence Complaint — Smt. Kavita Devi v. spouse",
      caseNumber: "DEV-DV-006", status: "Open", path: "criminal", caseType: "DV",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-12"),
      caseDiary: [{ date: new Date("2026-04-18"), findings: "Protection order interim relief sought. Counsellor referral made.", writtenBy: anitaId }],
      criminalPath: { firFiled: false, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "Counsellor — Mahila Helpline" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },
    {
      caseTitle: "Maintenance §125 BNSS — Petitioner v. estranged husband",
      caseNumber: "DEV-MAINT-007", status: "Open", path: "criminal", caseType: "MAINT",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-20"),
      criminalPath: { firFiled: false, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },

    // ── Special Acts ─────────────────────────────────────────────────────
    {
      caseTitle: "POCSO — Minor abuse complaint (school staff)",
      caseNumber: "DEV-POCSO-008", status: "Escalated", path: "criminal", caseType: "POCSO",
      community: communityId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-08"),
      caseDiary: [{ date: new Date("2026-04-22"), findings: "Child statement recorded under §164. SJPU informed.", writtenBy: litigId }],
      criminalPath: {
        firFiled: true, chargesheetFiled: false, chargesheetDueDate: new Date("2026-06-22"), chargesheetAlertSent: true, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "School counsellor" }, { name: "Medical officer" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
    },
    {
      caseTitle: "SC/ST Atrocities — Caste-based assault at Purnia village",
      caseNumber: "DEV-SCST-009", status: "Open", path: "criminal", caseType: "SCST",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-15"),
      criminalPath: {
        firFiled: true, chargesheetFiled: false, chargesheetDueDate: new Date("2026-06-30"), chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "Sarpanch — eyewitness" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
    },
    {
      caseTitle: "Cheque Bounce — NI Act §138 (Rs. 2,40,000)",
      caseNumber: "DEV-NI138-010", status: "Open", path: "criminal", caseType: "NI.138",
      community: communityId, litigationMember: vikramId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-18"),
      criminalPath: { firFiled: false, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },
    {
      caseTitle: "JJ Act — Apprehended juvenile (theft, age 16)",
      caseNumber: "DEV-JJ-011", status: "Open", path: "criminal", caseType: "JJ",
      community: rajanId, litigationMember: litigId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-02"),
      criminalPath: { firFiled: true, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },

    // ── Civil — Subordinate ──────────────────────────────────────────────
    {
      caseTitle: "Original Suit — Recovery of possession (ancestral plot)",
      caseNumber: "DEV-OS-012", status: "Pending", path: "highcourt", caseType: "OS",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-06-01"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-05"), notes: "Plaint filed at Andheri Civil Court." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-04-05") },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
    {
      caseTitle: "Rent Control / Eviction — Tenant illegal occupation",
      caseNumber: "DEV-RCP-013", status: "Open", path: "highcourt", caseType: "RCP",
      community: communityId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-25"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-15") },
        supportingAffidavit: { filed: false },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },

    // ── Family Court ─────────────────────────────────────────────────────
    {
      caseTitle: "HMA Divorce Petition — irretrievable breakdown",
      caseNumber: "DEV-HMA-014", status: "Pending", path: "highcourt", caseType: "HMA",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-06-08"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-03-30") },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-03-30") },
        admission:           { filed: true,  filedAt: new Date("2026-04-15") },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
    {
      caseTitle: "Guardianship / Custody — minor child (post-divorce)",
      caseNumber: "DEV-GUARD-015", status: "Open", path: "highcourt", caseType: "GUARD",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-30"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-12") },
        supportingAffidavit: { filed: false },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },

    // ── Motor Accident ───────────────────────────────────────────────────
    {
      caseTitle: "MACT Claim — Pillion rider grievous injury (NH-31)",
      caseNumber: "DEV-MACT-016", status: "Pending", path: "highcourt", caseType: "MACT",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-06-05"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-03-12"), notes: "Claim of Rs. 12 lakh against insurer + driver." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-03-12") },
        admission:           { filed: true,  filedAt: new Date("2026-04-02") },
        counterAffidavit:    { filed: true,  filedAt: new Date("2026-04-20") },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },

    // ── Labour ───────────────────────────────────────────────────────────
    {
      caseTitle: "Industrial Dispute — Wrongful termination (factory worker)",
      caseNumber: "DEV-ID-017", status: "Open", path: "highcourt", caseType: "ID",
      community: rajanId, litigationMember: vikramId, socialWorker: swId,
      nextHearingDate: new Date("2026-05-28"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-08") },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-04-08") },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },

    // ── Revenue ──────────────────────────────────────────────────────────
    {
      caseTitle: "Mutation Petition — Inherited land record correction",
      caseNumber: "DEV-MUT-018", status: "Open", path: "highcourt", caseType: "MUT",
      community: rajanId, litigationMember: vikramId, socialWorker: swId,
      nextHearingDate: new Date("2026-06-12"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-18") },
        supportingAffidavit: { filed: false },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },

    // ── High Court — Writ & Appeals ──────────────────────────────────────
    {
      caseTitle: "WP(Crl) — Habeas Corpus for missing daughter",
      caseNumber: "DEV-WPCrl-019", status: "Escalated", path: "highcourt", caseType: "WP(Crl)",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-04-30"),
      caseDiary: [{ date: new Date("2026-04-21"), findings: "Notice issued to SHO. Production directed at next date.", writtenBy: vikramId }],
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-19"), notes: "Habeas corpus filed; daughter missing 11 days." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-04-19") },
        admission:           { filed: true,  filedAt: new Date("2026-04-20") },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
    {
      caseTitle: "PIL — Sanitation conditions in district shelter homes",
      caseNumber: "DEV-PIL-020", status: "Pending", path: "highcourt", caseType: "PIL",
      community: communityId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-06-15"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-03-10"), notes: "PIL admitted. State respondents directed to file response." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-03-10") },
        admission:           { filed: true,  filedAt: new Date("2026-03-25") },
        counterAffidavit:    { filed: true,  filedAt: new Date("2026-04-22"), notes: "State response filed; deficiencies remain." },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
    {
      caseTitle: "Criminal Appeal — Acquittal challenge (theft conviction)",
      caseNumber: "DEV-CrlA-021", status: "Pending", path: "criminal", caseType: "Crl.A",
      community: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-06-20"),
      criminalPath: { firFiled: true, chargesheetFiled: true, chargesheetDate: new Date("2025-09-15"), chargesheetAlertSent: true, chargesFramed: true, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "PW1 — complainant" }], defenseWitnesses: [{ name: "DW1 — accused" }], evidenceDocs: [], forensicDocs: [] },
        verdict: "Convicted — appeal pending", verdictDate: new Date("2026-02-28") },
    },
    {
      caseTitle: "Quashing Petition — §482 BNSS (false §354 FIR)",
      caseNumber: "DEV-QUASH-022", status: "Open", path: "criminal", caseType: "Quash",
      community: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-26"),
      criminalPath: { firFiled: true, chargesheetFiled: false, chargesheetAlertSent: false, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] } },
    },

    // ── Supreme Court ────────────────────────────────────────────────────
    {
      caseTitle: "SLP(C) — Challenge to High Court land-acquisition order",
      caseNumber: "DEV-SLPC-023", status: "Pending", path: "highcourt", caseType: "SLP(C)",
      community: rajanId, litigationMember: vikramId, socialWorker: swId,
      nextHearingDate: new Date("2026-07-02"),
      highCourtPath: {
        petitionFiled:       { filed: true,  filedAt: new Date("2026-04-01"), notes: "SLP filed; notice issued. Tagged with batch matters." },
        supportingAffidavit: { filed: true,  filedAt: new Date("2026-04-01") },
        admission:           { filed: false },
        counterAffidavit:    { filed: false },
        rejoinder:           { filed: false },
        pleaClose:           { filed: false },
        inducement:          { filed: false },
      },
    },
  ]);

  // For dev visibility: every DEV-* case is reassigned to the dev trio so that
  // logging in as Dev Community / Dev Social Worker / Dev Litigation shows
  // ALL seeded cases — not just the ones with their email on the document.
  await Case.updateMany(
    { caseNumber: /^DEV-/ },
    { community: communityId, socialWorker: swId, litigationMember: litigId }
  );
  console.log(`Cases:        ${cases.length} inserted (all reassigned to dev trio for visibility)`);

  const case1Id = cases[0]._id;
  const case2Id = cases[1]._id;

  // Appointments
  await Appointment.deleteMany({ reason: /dev seed/i });
  const appts = await Appointment.insertMany([
    { community: communityId, socialWorker: swId,    litigationMember: litigId, requestedAt: new Date("2026-04-18"), proposedDate: new Date("2026-04-28T10:00:00"), status: "confirmed_litigation", reason: "Initial case consultation — dev seed", swNotes: "Client is cooperative. Documents in order.", litigationNotes: "Schedule confirmed for Monday 10 AM." },
    { community: priyaId,   socialWorker: anitaId,                            requestedAt: new Date("2026-04-20"), proposedDate: new Date("2026-05-02T14:00:00"), status: "approved_sw",          reason: "Follow-up on eviction case documentation — dev seed", swNotes: "Approved. Awaiting litigation confirmation." },
    { community: rajanId,   socialWorker: swId,                               requestedAt: new Date("2026-04-21"), proposedDate: new Date("2026-05-05T11:00:00"), status: "pending_sw",           reason: "Urgent review of custodial violence evidence — dev seed" },
  ]);
  console.log(`Appointments: ${appts.length} inserted`);

  // EOD Reports — invoice review by superadmin in committed seed
  await EodReport.deleteMany({ summary: /dev seed/i });
  const eods = await EodReport.insertMany([
    { submittedBy: swId,    date: new Date("2026-04-21"), summary: "Visited 3 clients in Karol Bagh area. Filed FIR paperwork for DEV-CRM-001. Dev seed.", hoursWorked: 8, ticketsWorkedOn: [case1Id], expenses: [{ description: "Auto fare to Karol Bagh PS", amount: 120 }, { description: "Document photocopies", amount: 45 }], invoiceStatus: "pending" },
    { submittedBy: swId,    date: new Date("2026-04-20"), summary: "Coordination meeting with litigation team. Client follow-up calls. Dev seed.", hoursWorked: 7, ticketsWorkedOn: [case1Id, case2Id], expenses: [{ description: "Metro travel", amount: 60 }], invoiceUrl: "https://example.com/invoice-sw-apr20.pdf", invoiceStatus: "approved", reviewedBy: superId },
    { submittedBy: anitaId, date: new Date("2026-04-21"), summary: "Home visit to Priya Sharma. Collected eviction notice and rent receipts. Dev seed.", hoursWorked: 6, ticketsWorkedOn: [case2Id], expenses: [{ description: "Cab to client location", amount: 180 }, { description: "Notarisation fee", amount: 200 }], invoiceStatus: "pending" },
    { submittedBy: anitaId, date: new Date("2026-04-19"), summary: "Community outreach camp at Dharavi. 12 new community members registered. Dev seed.", hoursWorked: 9, ticketsWorkedOn: [], expenses: [{ description: "Pamphlet printing", amount: 350 }, { description: "Travel", amount: 90 }], invoiceStatus: "rejected", reviewedBy: superId },
  ]);
  console.log(`EOD Reports:  ${eods.length} inserted`);

  // SOS Alerts
  await SosAlert.deleteMany({ description: /dev seed/i });
  const alerts = await SosAlert.insertMany([
    { raisedBy: communityId, location: "Karol Bagh, New Delhi — near Metro Gate 4", description: "Threatening behaviour by landlord's men outside residence. Dev seed.", mediaUrls: ["https://example.com/sos-001.jpg"], status: "escalated", escalatedBy: swId, escalatedAt: new Date("2026-04-20T09:30:00"), assignedTo: litigId },
    { raisedBy: rajanId,   location: "Tihar Road, New Delhi", description: "Police harassment after bail. Being followed. Dev seed.", mediaUrls: [], status: "open" },
    { raisedBy: priyaId,   location: "Kurla West, Mumbai",   description: "Forcible entry by landlord while family at home. Dev seed.", mediaUrls: ["https://example.com/sos-003a.jpg", "https://example.com/sos-003b.jpg"], status: "resolved", escalatedBy: anitaId, escalatedAt: new Date("2026-04-15T16:00:00"), assignedTo: vikramId },
  ]);
  console.log(`SOS Alerts:   ${alerts.length} inserted`);

  // Assets — issued by HR
  await Asset.deleteMany({ notes: /dev seed/i });
  const assets = await Asset.insertMany([
    { employee: swId,      type: "laptop",        name: "Dell Latitude 5430",      identifier: "SN-DL5430-001", status: "assigned", assignedAt: new Date("2026-01-15"), assignedBy: hrId, notes: "Dev seed" },
    { employee: swId,      type: "phone",         name: "Redmi Note 12",           identifier: "IMEI-86012345", status: "assigned", assignedAt: new Date("2026-01-15"), assignedBy: hrId, notes: "Dev seed" },
    { employee: swId,      type: "sim",           name: "Airtel Postpaid",         identifier: "+91 9000000002", status: "assigned", assignedAt: new Date("2026-01-15"), assignedBy: hrId, notes: "Dev seed" },
    { employee: anitaId,   type: "laptop",        name: "Lenovo ThinkPad E14",     identifier: "SN-LE14-002",   status: "assigned", assignedAt: new Date("2026-02-01"), assignedBy: hrId, notes: "Dev seed" },
    { employee: anitaId,   type: "id_card",       name: "Field ID Card",           identifier: "ID-2026-002",   status: "assigned", assignedAt: new Date("2026-02-01"), assignedBy: hrId, notes: "Dev seed" },
    { employee: litigId,   type: "laptop",        name: "MacBook Air M2",          identifier: "SN-MBA-003",    status: "assigned", assignedAt: new Date("2026-01-20"), assignedBy: hrId, notes: "Dev seed" },
    { employee: litigId,   type: "email_account", name: "Org Email",               identifier: "litigation@dev.janmanindia.in", status: "assigned", assignedAt: new Date("2026-01-20"), assignedBy: hrId, notes: "Dev seed" },
    { employee: vikramId,  type: "laptop",        name: "HP EliteBook 840",        identifier: "SN-HP840-004",  status: "returned", assignedAt: new Date("2026-02-10"), returnedAt: new Date("2026-04-10"), returnedBy: hrId, returnNotes: "Replaced unit", assignedBy: hrId, notes: "Dev seed" },
    { employee: hrId,      type: "laptop",        name: "Dell Latitude 5430",      identifier: "SN-DL5430-005", status: "assigned", assignedAt: new Date("2026-01-05"), assignedBy: hrId, notes: "Dev seed" },
    { employee: financeId, type: "laptop",        name: "Dell Latitude 5430",      identifier: "SN-DL5430-006", status: "assigned", assignedAt: new Date("2026-01-08"), assignedBy: hrId, notes: "Dev seed" },
  ]);
  console.log(`Assets:       ${assets.length} inserted`);

  // Grievances — staff-submitted, mix of statuses, one anonymous
  await Grievance.deleteMany({ subject: /dev seed/i });
  const grievances = await Grievance.insertMany([
    { submittedBy: swId,    anonymous: false, category: "workload",    subject: "Caseload above SLA — dev seed", description: "Carrying 18 active cases this month. Two missed home-visit deadlines.", status: "in_review" },
    { submittedBy: anitaId, anonymous: true,  category: "facilities",  subject: "Mumbai office WiFi unstable — dev seed", description: "Disconnects every 30 minutes during video hearings.", status: "open" },
    { submittedBy: vikramId,anonymous: false, category: "compensation",subject: "Travel reimbursement delays — dev seed", description: "April invoices still pending after 3 weeks.", status: "responded", hrResponse: "Acknowledged. Finance has cleared the queue this week.", respondedBy: hrId, respondedAt: new Date("2026-04-22") },
    { submittedBy: litigId, anonymous: false, category: "policy",      subject: "Clarify court-attire allowance — dev seed", description: "Need a clear policy on per-hearing attire stipend for junior counsel.", status: "closed", hrResponse: "Policy update issued; see HR memo dated 12 April.", respondedBy: hrId, respondedAt: new Date("2026-04-12"), closedAt: new Date("2026-04-15") },
  ]);
  console.log(`Grievances:   ${grievances.length} inserted`);

  // Training Materials — uploaded by various roles, mix approved/pending
  await TrainingMaterial.deleteMany({ description: /dev seed/i });
  const trainings = await TrainingMaterial.insertMany([
    { title: "POCSO Act — Field Handbook", description: "Reference handbook for first-responder social workers. Dev seed.", category: "Legal", fileUrl: "https://example.com/pocso-handbook.pdf", fileType: "pdf", uploadedBy: litigId, status: "approved", approvedBy: hrId, approvedAt: new Date("2026-03-20") },
    { title: "Filing an FIR — Step by Step", description: "Quick visual guide. Dev seed.", category: "Procedure", fileUrl: "https://example.com/fir-guide.pdf", fileType: "pdf", uploadedBy: swId, status: "approved", approvedBy: hrId, approvedAt: new Date("2026-03-25") },
    { title: "Trauma-Informed Interviewing", description: "Best practices for interviewing survivors. Dev seed.", category: "Soft skills", fileUrl: "https://example.com/trauma-deck.pptx", fileType: "ppt", uploadedBy: anitaId, status: "pending" },
    { title: "Mock Cross-Examination", description: "Recorded session from April training week. Dev seed.", category: "Litigation", fileUrl: "https://example.com/mock-cross.mp4", fileType: "video", uploadedBy: vikramId, status: "approved", approvedBy: hrId, approvedAt: new Date("2026-04-05") },
    { title: "Outdated Internal Memo", description: "Superseded by April policy update. Dev seed.", category: "Internal", fileUrl: "https://example.com/old-memo.doc", fileType: "doc", uploadedBy: financeId, status: "rejected", rejectionReason: "Superseded by newer document." },
  ]);
  console.log(`Training:     ${trainings.length} inserted`);

  // Activities — Kanban mix
  await Activity.deleteMany({ description: /dev seed/i });
  const activities = await Activity.insertMany([
    { title: "Visit Karol Bagh PS for FIR copy", description: "Pickup certified FIR copy for DEV-CRM-001. Dev seed.", category: "fieldwork",     priority: "high",   status: "in_progress", assignee: swId,     createdBy: hrId, dueDate: new Date("2026-04-28"), startedAt: new Date("2026-04-25") },
    { title: "Draft writ rejoinder",            description: "Rejoinder for DEV-HC-001. Dev seed.",                  category: "documentation", priority: "high",   status: "planned",     assignee: vikramId, createdBy: hrId, dueDate: new Date("2026-05-05") },
    { title: "Outreach camp — Dharavi",         description: "Saturday legal aid camp. Dev seed.",                   category: "outreach",      priority: "medium", status: "planned",     assignee: anitaId,  createdBy: hrId, dueDate: new Date("2026-05-03") },
    { title: "Forensic report follow-up",       description: "Chase forensic lab for DEV-CRM-002. Dev seed.",        category: "research",      priority: "high",   status: "in_progress", assignee: litigId,  createdBy: hrId, dueDate: new Date("2026-04-30"), startedAt: new Date("2026-04-22") },
    { title: "Quarterly EOD audit",             description: "Audit Q1 EODs. Dev seed.",                             category: "admin",         priority: "low",    status: "done",        assignee: financeId,createdBy: hrId, completedAt: new Date("2026-04-10") },
    { title: "Onboard 2 new field staff",       description: "Issue assets, employee codes. Dev seed.",              category: "admin",         priority: "medium", status: "done",        assignee: hrId,     createdBy: hrId, completedAt: new Date("2026-04-15") },
    { title: "Review POCSO handbook draft",     description: "Final read-through. Dev seed.",                        category: "training",      priority: "low",    status: "planned",     assignee: anitaId,  createdBy: hrId, dueDate: new Date("2026-05-10") },
  ]);
  console.log(`Activities:   ${activities.length} inserted`);

  // Logistics tickets
  await LogisticsTicket.deleteMany({ description: /dev seed/i });
  const tickets = await LogisticsTicket.insertMany([
    { raisedBy: swId,     category: "transport",   urgency: "high",     title: "Cab for survivor relocation",   description: "Need a same-day cab from Karol Bagh to safe shelter. Dev seed.", beneficiary: "Survivor (DEV-CRM-002)", district: "Delhi",            status: "fulfilled", assignedTo: hrId, response: "Booked Ola at 10:30; receipt attached.", fulfilledAt: new Date("2026-04-20") },
    { raisedBy: anitaId,  category: "supplies",    urgency: "normal",   title: "Stationery refill — Mumbai office", description: "Pens, registers, printer paper. Dev seed.",                  district: "Mumbai Suburban",  status: "in_progress", assignedTo: hrId },
    { raisedBy: vikramId, category: "equipment",   urgency: "high",     title: "Replacement laptop charger",    description: "Charger died mid-hearing. Dev seed.",                            district: "Mumbai Suburban", status: "open" },
    { raisedBy: litigId,  category: "maintenance", urgency: "critical", title: "Office AC not working",         description: "Server room overheating. Dev seed.",                              district: "Delhi",           status: "open" },
    { raisedBy: swId,     category: "office",      urgency: "normal",   title: "Book meeting room for Saturday camp", description: "Need 6-seater conference room. Dev seed.",                  district: "Delhi",           status: "fulfilled", assignedTo: hrId, response: "Reserved Conf Room A.", fulfilledAt: new Date("2026-04-18") },
  ]);
  console.log(`Logistics:    ${tickets.length} inserted`);

  // District helplines — set by HR
  await DistrictHelpline.deleteMany({ notes: /dev seed/i });
  const helplines = await DistrictHelpline.insertMany([
    { district: "Delhi",            primaryName: "Dev Social Worker", primaryPhone: "9000000002", secondaryName: "Dev Litigation", secondaryPhone: "9000000003", notes: "Dev seed", setBy: hrId },
    { district: "Mumbai Suburban",  primaryName: "Anita Desai",       primaryPhone: "9000000013", secondaryName: "Vikram Nair",    secondaryPhone: "9000000014", notes: "Dev seed", setBy: hrId },
    { district: "Patna",            primaryName: "Dev Social Worker", primaryPhone: "9000000002", notes: "Dev seed (fallback to Delhi team)",                 setBy: hrId },
  ]);
  console.log(`Helplines:    ${helplines.length} inserted`);

  // Conversations + Messages
  await Conversation.deleteMany({ lastMessagePreview: /dev seed/i });

  async function seedDM(a, b, messages) {
    const sorted = [a, b].map(String).sort();
    const convo = await Conversation.create({
      type: "dm",
      participants: sorted,
      createdBy: sorted[0],
      lastMessageAt: new Date(),
      lastMessagePreview: messages[messages.length - 1].text + " · dev seed",
    });
    let when = Date.now() - messages.length * 60_000;
    for (const m of messages) {
      await Message.create({
        conversation: convo._id,
        sender: m.from,
        text: m.text,
        readBy: [m.from],
        createdAt: new Date(when),
      });
      when += 60_000;
    }
    return convo;
  }

  const c1 = await seedDM(communityId, swId, [
    { from: communityId, text: "Namaste, my FIR has not been filed since 3 days." },
    { from: swId,      text: "Don't worry — I'll visit Karol Bagh PS tomorrow morning." },
    { from: communityId, text: "Thank you so much." },
  ]);
  const c2 = await seedDM(swId, litigId, [
    { from: swId,    text: "DEV-CRM-001 chargesheet due 1 June. Can you draft notes?" },
    { from: litigId, text: "Yes, will share by Monday." },
  ]);
  const c3 = await seedDM(priyaId, anitaId, [
    { from: priyaId, text: "Eviction notice attached. Please review." },
    { from: anitaId, text: "Got it. Vikram will file the writ rejoinder this week." },
  ]);
  console.log(`Conversations: 3 inserted (${[c1, c2, c3].length} threads with messages)`);

  // Care Plans — individual support trackers for community members
  const firstCriminalCase = await Case.findOne({ caseNumber: "DEV-POCSO-008" }).lean();
  const dvCase            = await Case.findOne({ caseNumber: "DEV-DV-006" }).lean();
  const evictionCase      = await Case.findOne({ caseNumber: "DEV-HC-001" }).lean();

  await CarePlan.deleteMany({ summary: /dev seed/i });
  const carePlans = await CarePlan.insertMany([
    {
      community: communityId, case: firstCriminalCase?._id, createdBy: swId,
      title: "Trauma counselling — POCSO survivor (minor)",
      category: "counselling", priority: "critical", status: "active",
      summary: "Minor child involved in DEV-POCSO-008. Plan covers weekly trauma-informed counselling, medical follow-up, and school re-integration. Dev seed.",
      goals: [
        { description: "Weekly counselling session for 12 weeks", completed: false },
        { description: "Medical examination and follow-up at District Hospital", completed: true, completedAt: new Date("2026-04-22") },
        { description: "Re-enroll in school by start of next term", completed: false, targetDate: new Date("2026-06-15") },
      ],
      sessions: [
        { date: new Date("2026-04-20"), type: "in_person", notes: "First contact. Child is withdrawn but engaged. Mother present. Established weekly schedule. Dev seed.", conductedBy: swId },
        { date: new Date("2026-04-23"), type: "in_person", notes: "Second session — drawing exercise. No new disclosures. Sleep slowly improving. Dev seed.", conductedBy: swId },
      ],
      referredTo: "Dr. Sunita Rao, Child Psychologist — Patna",
      confidentialNotes: "Family is supportive. Father absent but no safety concerns. Coordinate with school counsellor before re-entry. Dev seed.",
    },
    {
      community: priyaId, case: dvCase?._id, createdBy: anitaId,
      title: "Safe shelter + legal support — DV survivor",
      category: "shelter", priority: "high", status: "active",
      summary: "Client moved to safe shelter on 18 April. Plan covers shelter logistics, protection-order follow-through, and financial aid for 3 months. Dev seed.",
      goals: [
        { description: "Secure 3-month shelter accommodation", completed: true, completedAt: new Date("2026-04-18") },
        { description: "Protection order application filed", completed: true, completedAt: new Date("2026-04-19") },
        { description: "Set up monthly financial aid (₹5000)", completed: false },
      ],
      sessions: [
        { date: new Date("2026-04-18"), type: "in_person", notes: "Shelter intake. Children with her. Counsellor referral made. Dev seed.", conductedBy: anitaId },
      ],
      referredTo: "Mahila Helpline shelter — Mumbai West",
    },
    {
      community: priyaId, case: evictionCase?._id, createdBy: anitaId,
      title: "Rehabilitation — eviction victim",
      category: "rehabilitation", priority: "medium", status: "active",
      summary: "Family evicted without notice. Plan covers temporary accommodation, livelihood restoration, and education continuity for 2 children. Dev seed.",
      goals: [
        { description: "Help apply for state housing scheme", completed: false, targetDate: new Date("2026-05-30") },
        { description: "Connect family with vocational training", completed: false },
      ],
      sessions: [],
    },
    {
      community: rajanId, createdBy: swId,
      title: "Medical follow-up — custodial violence injuries",
      category: "medical", priority: "high", status: "active",
      summary: "Documented serious injuries (DEV-CRM-002). Plan tracks orthopedic follow-up and mental-health check-ins. Dev seed.",
      goals: [
        { description: "Orthopedic review every 3 weeks for 3 months", completed: false },
        { description: "Mental health screening", completed: true, completedAt: new Date("2026-04-15") },
      ],
      sessions: [
        { date: new Date("2026-04-15"), type: "phone", notes: "Phone follow-up. Sleeping better. Painkillers reduced. Dev seed.", conductedBy: swId },
      ],
      referredTo: "AIIMS Delhi — Orthopedics OPD",
    },
  ]);
  console.log(`Care Plans:    ${carePlans.length} inserted`);

  // Offline Training Sessions — created by SW, with sample enrollments
  await TrainingSession.deleteMany({ description: /dev seed/i });
  const sessions = await TrainingSession.insertMany([
    {
      title: "Know Your Rights — Women's Safety Workshop",
      description: "Hands-on workshop covering FIR rights, DV Act protection orders, helplines, and how to claim maintenance. Open to all women in the district. Dev seed.",
      topics: ["FIR", "Domestic Violence Act", "Maintenance §125", "Helplines"],
      venue: "Janman Office, Karol Bagh", district: "Delhi",
      date: new Date(Date.now() + 7 * 86_400_000),
      endDate: new Date(Date.now() + 7 * 86_400_000 + 3 * 60 * 60_000),
      capacity: 40, conductedBy: swId,
      facilitators: "Anita Desai (co-host)",
      targetAudience: "Women, ages 18+",
      language: "Hindi",
      status: "scheduled",
      enrollments: [
        { user: communityId, enrolledAt: new Date(), attended: false },
        { user: priyaId,   enrolledAt: new Date(), attended: false },
      ],
    },
    {
      title: "PLV Field Training — Filing FIRs & Complaints",
      description: "For approved PLVs and shortlisted volunteers. Live walk-through of the FIR registration process at a police station, with mock cases. Dev seed.",
      topics: ["FIR drafting", "BNSS sections", "Magistrate complaints"],
      venue: "Patna District Court Complex", district: "Patna",
      date: new Date(Date.now() + 14 * 86_400_000),
      capacity: 20, conductedBy: swId,
      targetAudience: "Approved PLVs and shortlisted volunteers",
      language: "Hindi & English",
      status: "scheduled",
      enrollments: [],
    },
    {
      title: "RTI Mela — Mass Application Drive",
      description: "Bring your RTI questions and we'll help you draft and file them on the spot. Free stamps and fee. Dev seed.",
      topics: ["RTI Act 2005", "First & Second Appeals"],
      venue: "Community Hall, Andheri East", district: "Mumbai Suburban",
      date: new Date(Date.now() + 21 * 86_400_000),
      capacity: 60, conductedBy: anitaId,
      targetAudience: "Anyone with a pending RTI",
      language: "Hindi, Marathi & English",
      status: "scheduled",
      enrollments: [{ user: priyaId, enrolledAt: new Date() }],
    },
    {
      title: "Past Session — POCSO Field Handbook Launch",
      description: "Launch event for the new POCSO field handbook. 32 attendees. Dev seed.",
      topics: ["POCSO", "Child Welfare Committee"],
      venue: "Janman Conference Room, Patna", district: "Patna",
      date: new Date(Date.now() - 7 * 86_400_000),
      capacity: 35, conductedBy: swId,
      status: "completed",
      highlights: "32 attendees. Field handbook distributed to all PLVs in attendance. Two case referrals identified. Dev seed.",
      enrollments: [
        { user: communityId, enrolledAt: new Date(Date.now() - 14 * 86_400_000), attended: true },
        { user: rajanId,   enrolledAt: new Date(Date.now() - 14 * 86_400_000), attended: true },
      ],
    },
  ]);
  console.log(`Sessions:      ${sessions.length} offline training sessions inserted`);

  // PLV requests — seed Priya as pending, Rajan as approved
  await User.updateOne(
    { email: "priya@dev.janmanindia.in" },
    {
      $set: {
        "communityProfile.plvStatus": "requested",
        "communityProfile.plvMotivation": "I've helped 4 neighbours file FIRs already and want to do this systematically. I speak Hindi, Marathi, and basic English. Available 10 hours per week. (Dev seed.)",
        "communityProfile.plvRequestedAt": new Date(),
      },
    }
  );
  await User.updateOne(
    { email: "rajan@dev.janmanindia.in" },
    {
      $set: {
        "communityProfile.plvStatus": "approved",
        "communityProfile.plvMotivation": "Ex-army, retired. Want to give back by helping others navigate the system. (Dev seed.)",
        "communityProfile.plvRequestedAt": new Date(Date.now() - 30 * 86_400_000),
        "communityProfile.plvDecidedBy": swId,
        "communityProfile.plvDecidedAt": new Date(Date.now() - 21 * 86_400_000),
      },
    }
  );
  console.log("PLV requests:  Priya pending, Rajan approved");

  console.log(`\nAll done. Password for all dev users: ${DEV_PASSWORD}`);

  // Optional: chain into a gitignored privileged seed (director + administrator)
  const here = dirname(fileURLToPath(import.meta.url));
  const privileged = join(here, "seed-privileged.mjs");
  if (existsSync(privileged)) {
    console.log("\nChaining → seed-privileged.mjs …");
    const mod = await import(pathToFileURL(privileged).href);
    if (typeof mod.run === "function") {
      await mod.run({ User, passwordHash, mongoose });
    }
  } else {
    console.log("\n(Skipping privileged seed — scripts/seed-privileged.mjs not present.)");
  }

  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
