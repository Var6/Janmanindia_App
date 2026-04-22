/**
 * Standalone seed script — run with:
 *   node scripts/seed.mjs
 *
 * Requires mongoose + bcryptjs to be installed (already in package.json).
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/janmandb";
const DEV_PASSWORD = "Dev@1234";

// ── Inline schemas (avoids Next.js / TypeScript compilation) ─────────────────

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
    citizenProfile: {
      govtIdUrl: String,
      govtIdType: String,
      verificationStatus: { type: String, default: "pending" },
    },
    socialWorkerProfile: {
      avgResolutionTimeDays: Number,
      openTickets: Number,
      resolvedTickets: Number,
      slaBreaches: Number,
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
    citizen: mongoose.Schema.Types.ObjectId,
    litigationMember: mongoose.Schema.Types.ObjectId,
    socialWorker: mongoose.Schema.Types.ObjectId,
    nextHearingDate: Date,
    documents: [documentSchema],
    caseDiary: [
      {
        date: Date,
        findings: String,
        writtenBy: mongoose.Schema.Types.ObjectId,
      },
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
    citizen: mongoose.Schema.Types.ObjectId,
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

// ── Models ────────────────────────────────────────────────────────────────────
const User        = mongoose.models.User        ?? mongoose.model("User", userSchema);
const Case        = mongoose.models.Case        ?? mongoose.model("Case", caseSchema);
const Appointment = mongoose.models.Appointment ?? mongoose.model("Appointment", appointmentSchema);
const EodReport   = mongoose.models.EodReport   ?? mongoose.model("EodReport", eodReportSchema);
const SosAlert    = mongoose.models.SosAlert    ?? mongoose.model("SosAlert", sosAlertSchema);

// ── Seed data ─────────────────────────────────────────────────────────────────
async function run() {
  console.log(`Connecting to ${MONGODB_URI} …`);
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("Connected.\n");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // Users
  const TEST_USERS = [
    { name: "Dev Citizen",        email: "user@dev.janmanindia.in",       role: "user",        phone: "9000000001", citizenProfile: { govtIdType: "Aadhar",   govtIdUrl: "https://example.com/dev-id.pdf",   verificationStatus: "verified" } },
    { name: "Priya Sharma",       email: "priya@dev.janmanindia.in",      role: "user",        phone: "9000000011", citizenProfile: { govtIdType: "VoterId",  govtIdUrl: "https://example.com/priya-id.pdf", verificationStatus: "pending"  } },
    { name: "Rajan Mehra",        email: "rajan@dev.janmanindia.in",      role: "user",        phone: "9000000012", citizenProfile: { govtIdType: "Passport", govtIdUrl: "https://example.com/rajan-id.pdf", verificationStatus: "verified" } },
    { name: "Dev Social Worker",  email: "sw@dev.janmanindia.in",         role: "socialworker",phone: "9000000002", socialWorkerProfile: { avgResolutionTimeDays: 4.2, openTickets: 3,  resolvedTickets: 12, slaBreaches: 1 } },
    { name: "Anita Desai",        email: "anita@dev.janmanindia.in",      role: "socialworker",phone: "9000000013", socialWorkerProfile: { avgResolutionTimeDays: 6.8, openTickets: 5,  resolvedTickets: 28, slaBreaches: 3 } },
    { name: "Dev Litigation",     email: "litigation@dev.janmanindia.in", role: "litigation",  phone: "9000000003", litigationProfile: { barCouncilId: "BAR/DEV/001", activeCaseCount: 5, location: { district: "Delhi",          city: "New Delhi" }, specialisation: ["Criminal", "Constitutional"] } },
    { name: "Vikram Nair",        email: "vikram@dev.janmanindia.in",     role: "litigation",  phone: "9000000014", litigationProfile: { barCouncilId: "BAR/DEV/002", activeCaseCount: 8, location: { district: "Mumbai Suburban", city: "Mumbai"    }, specialisation: ["Civil", "Family"]           } },
    { name: "Dev HR Manager",     email: "hr@dev.janmanindia.in",         role: "hr",          phone: "9000000004" },
    { name: "Dev Finance Officer",email: "finance@dev.janmanindia.in",    role: "finance",     phone: "9000000005" },
    { name: "Dev Admin",          email: "admin@dev.janmanindia.in",      role: "admin",       phone: "9000000006" },
    { name: "Dev Super Admin",    email: "superadmin@dev.janmanindia.in", role: "superadmin",  phone: "9000000007" },
  ];

  let usersCreated = 0, usersUpdated = 0;
  for (const u of TEST_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      await User.updateOne({ email: u.email }, { passwordHash, isActive: true });
      usersUpdated++;
    } else {
      await User.create({ ...u, passwordHash, isActive: true });
      usersCreated++;
    }
  }
  console.log(`Users: ${usersCreated} created, ${usersUpdated} updated`);

  const byEmail = {};
  const docs = await User.find({ email: { $in: TEST_USERS.map(u => u.email) } }).lean();
  for (const d of docs) byEmail[d.email] = d._id;

  const citizenId = byEmail["user@dev.janmanindia.in"];
  const priyaId   = byEmail["priya@dev.janmanindia.in"];
  const rajanId   = byEmail["rajan@dev.janmanindia.in"];
  const swId      = byEmail["sw@dev.janmanindia.in"];
  const anitaId   = byEmail["anita@dev.janmanindia.in"];
  const litigId   = byEmail["litigation@dev.janmanindia.in"];
  const vikramId  = byEmail["vikram@dev.janmanindia.in"];
  const adminId   = byEmail["admin@dev.janmanindia.in"];

  // Cases
  await Case.deleteMany({ caseNumber: /^DEV-/ });
  const cases = await Case.insertMany([
    {
      caseTitle: "State v. Unknown — Theft at Karol Bagh Market",
      caseNumber: "DEV-CRM-001", status: "Open", path: "criminal",
      citizen: citizenId, litigationMember: litigId, socialWorker: swId,
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
      caseNumber: "DEV-HC-001", status: "Pending", path: "highcourt",
      citizen: priyaId, litigationMember: vikramId, socialWorker: anitaId,
      nextHearingDate: new Date("2026-05-22"),
      caseDiary: [{ date: new Date("2026-03-20"), findings: "Petition drafted. Client evicted without notice.", writtenBy: vikramId }],
      highCourtPath: {
        petitionFiled:      { filed: true,  filedAt: new Date("2026-03-25"), notes: "Writ petition filed under Article 226." },
        supportingAffidavit:{ filed: true,  filedAt: new Date("2026-03-25") },
        admission:          { filed: false },
        counterAffidavit:   { filed: false },
        rejoinder:          { filed: false },
        pleaClose:          { filed: false },
        inducement:         { filed: false },
      },
    },
    {
      caseTitle: "Rajan Mehra — Custodial Violence Complaint",
      caseNumber: "DEV-CRM-002", status: "Escalated", path: "criminal",
      citizen: rajanId, litigationMember: litigId, socialWorker: swId,
      nextHearingDate: new Date("2026-04-30"),
      caseDiary: [{ date: new Date("2026-04-10"), findings: "Medical examination report obtained. Serious injuries documented.", writtenBy: litigId }],
      criminalPath: {
        firFiled: true, chargesheetFiled: false, chargesheetDueDate: new Date("2026-05-15"), chargesheetAlertSent: true, chargesFramed: false, chargeDocs: [],
        trial: { prosecutionWitnesses: [{ name: "Dr. Sunita Rao (Medical Officer)" }], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
      },
    },
    {
      caseTitle: "Consumer Dispute — Defective Appliance (Closed)",
      caseNumber: "DEV-CRM-003", status: "Closed", path: "criminal",
      citizen: citizenId, litigationMember: litigId, socialWorker: swId,
      caseDiary: [{ date: new Date("2026-02-01"), findings: "Settlement reached. Refund issued to client.", writtenBy: litigId }],
      criminalPath: {
        firFiled: true, chargesheetFiled: true, chargesheetDate: new Date("2026-02-10"), chargesheetAlertSent: true, chargesFramed: true, chargeDocs: [],
        trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
        verdict: "Settled — full refund awarded", verdictDate: new Date("2026-03-01"),
      },
    },
  ]);
  console.log(`Cases: ${cases.length} inserted`);

  const case1Id = cases[0]._id;
  const case2Id = cases[1]._id;

  // Appointments
  await Appointment.deleteMany({ reason: /dev seed/i });
  const appts = await Appointment.insertMany([
    { citizen: citizenId, socialWorker: swId, litigationMember: litigId, requestedAt: new Date("2026-04-18"), proposedDate: new Date("2026-04-28T10:00:00"), status: "confirmed_litigation", reason: "Initial case consultation — dev seed", swNotes: "Client is cooperative. Documents in order.", litigationNotes: "Schedule confirmed for Monday 10 AM." },
    { citizen: priyaId,   socialWorker: anitaId,                          requestedAt: new Date("2026-04-20"), proposedDate: new Date("2026-05-02T14:00:00"), status: "approved_sw",          reason: "Follow-up on eviction case documentation — dev seed", swNotes: "Approved. Awaiting litigation confirmation." },
    { citizen: rajanId,   socialWorker: swId,                             requestedAt: new Date("2026-04-21"), proposedDate: new Date("2026-05-05T11:00:00"), status: "pending_sw",           reason: "Urgent review of custodial violence evidence — dev seed" },
  ]);
  console.log(`Appointments: ${appts.length} inserted`);

  // EOD Reports
  await EodReport.deleteMany({ summary: /dev seed/i });
  const eods = await EodReport.insertMany([
    { submittedBy: swId,    date: new Date("2026-04-21"), summary: "Visited 3 clients in Karol Bagh area. Filed FIR paperwork for DEV-CRM-001. Dev seed.", hoursWorked: 8, ticketsWorkedOn: [case1Id], expenses: [{ description: "Auto fare to Karol Bagh PS", amount: 120 }, { description: "Document photocopies", amount: 45 }], invoiceStatus: "pending" },
    { submittedBy: swId,    date: new Date("2026-04-20"), summary: "Coordination meeting with litigation team. Client follow-up calls. Dev seed.", hoursWorked: 7, ticketsWorkedOn: [case1Id, case2Id], expenses: [{ description: "Metro travel", amount: 60 }], invoiceUrl: "https://example.com/invoice-sw-apr20.pdf", invoiceStatus: "approved", reviewedBy: adminId },
    { submittedBy: anitaId, date: new Date("2026-04-21"), summary: "Home visit to Priya Sharma. Collected eviction notice and rent receipts. Dev seed.", hoursWorked: 6, ticketsWorkedOn: [case2Id], expenses: [{ description: "Cab to client location", amount: 180 }, { description: "Notarisation fee", amount: 200 }], invoiceStatus: "pending" },
    { submittedBy: anitaId, date: new Date("2026-04-19"), summary: "Community outreach camp at Dharavi. 12 new citizens registered. Dev seed.", hoursWorked: 9, ticketsWorkedOn: [], expenses: [{ description: "Pamphlet printing", amount: 350 }, { description: "Travel", amount: 90 }], invoiceStatus: "rejected", reviewedBy: adminId },
  ]);
  console.log(`EOD Reports: ${eods.length} inserted`);

  // SOS Alerts
  await SosAlert.deleteMany({ description: /dev seed/i });
  const alerts = await SosAlert.insertMany([
    { raisedBy: citizenId, location: "Karol Bagh, New Delhi — near Metro Gate 4", description: "Threatening behaviour by landlord's men outside residence. Dev seed.", mediaUrls: ["https://example.com/sos-001.jpg"], status: "escalated", escalatedBy: swId, escalatedAt: new Date("2026-04-20T09:30:00"), assignedTo: litigId },
    { raisedBy: rajanId,   location: "Tihar Road, New Delhi",   description: "Police harassment after bail. Being followed. Dev seed.", mediaUrls: [], status: "open" },
    { raisedBy: priyaId,   location: "Kurla West, Mumbai",      description: "Forcible entry by landlord while family at home. Dev seed.", mediaUrls: ["https://example.com/sos-003a.jpg", "https://example.com/sos-003b.jpg"], status: "resolved", escalatedBy: anitaId, escalatedAt: new Date("2026-04-15T16:00:00"), assignedTo: vikramId },
  ]);
  console.log(`SOS Alerts: ${alerts.length} inserted`);

  console.log("\nAll done. Password for all dev users: Dev@1234");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
