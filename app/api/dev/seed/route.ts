import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import Case from "@/models/Case";
import Appointment from "@/models/Appointment";
import EodReport from "@/models/EodReport";
import SosAlert from "@/models/SosAlert";
import mongoose from "mongoose";

const DEV_PASSWORD = "Dev@1234";

const TEST_USERS = [
  {
    name: "Dev Citizen",
    email: "user@dev.janmanindia.in",
    role: "user" as const,
    phone: "9000000001",
    citizenProfile: {
      govtIdType: "Aadhar" as const,
      govtIdUrl: "https://example.com/dev-id.pdf",
      verificationStatus: "verified" as const,
    },
  },
  {
    name: "Priya Sharma",
    email: "priya@dev.janmanindia.in",
    role: "user" as const,
    phone: "9000000011",
    citizenProfile: {
      govtIdType: "VoterId" as const,
      govtIdUrl: "https://example.com/priya-id.pdf",
      verificationStatus: "pending" as const,
    },
  },
  {
    name: "Rajan Mehra",
    email: "rajan@dev.janmanindia.in",
    role: "user" as const,
    phone: "9000000012",
    citizenProfile: {
      govtIdType: "Passport" as const,
      govtIdUrl: "https://example.com/rajan-id.pdf",
      verificationStatus: "verified" as const,
    },
  },
  {
    name: "Dev Social Worker",
    email: "sw@dev.janmanindia.in",
    role: "socialworker" as const,
    phone: "9000000002",
    socialWorkerProfile: {
      avgResolutionTimeDays: 4.2,
      openTickets: 3,
      resolvedTickets: 12,
      slaBreaches: 1,
    },
  },
  {
    name: "Anita Desai",
    email: "anita@dev.janmanindia.in",
    role: "socialworker" as const,
    phone: "9000000013",
    socialWorkerProfile: {
      avgResolutionTimeDays: 6.8,
      openTickets: 5,
      resolvedTickets: 28,
      slaBreaches: 3,
    },
  },
  {
    name: "Dev Litigation",
    email: "litigation@dev.janmanindia.in",
    role: "litigation" as const,
    phone: "9000000003",
    litigationProfile: {
      barCouncilId: "BAR/DEV/001",
      activeCaseCount: 5,
      location: { district: "Delhi", city: "New Delhi" },
      specialisation: ["Criminal", "Constitutional"],
    },
  },
  {
    name: "Vikram Nair",
    email: "vikram@dev.janmanindia.in",
    role: "litigation" as const,
    phone: "9000000014",
    litigationProfile: {
      barCouncilId: "BAR/DEV/002",
      activeCaseCount: 8,
      location: { district: "Mumbai Suburban", city: "Mumbai" },
      specialisation: ["Civil", "Family"],
    },
  },
  {
    name: "Dev HR Manager",
    email: "hr@dev.janmanindia.in",
    role: "hr" as const,
    phone: "9000000004",
  },
  {
    name: "Dev Finance Officer",
    email: "finance@dev.janmanindia.in",
    role: "finance" as const,
    phone: "9000000005",
  },
  {
    name: "Dev Admin",
    email: "admin@dev.janmanindia.in",
    role: "admin" as const,
    phone: "9000000006",
  },
  {
    name: "Dev Super Admin",
    email: "superadmin@dev.janmanindia.in",
    role: "superadmin" as const,
    phone: "9000000007",
  },
];

export async function POST() {
  if (process.env.DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev bypass is disabled" }, { status: 403 });
  }

  try {
    await connectDB();

    // ── 1. Users ──────────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(DEV_PASSWORD);
    let usersCreated = 0;
    let usersUpdated = 0;

    for (const user of TEST_USERS) {
      const existing = await User.findOne({ email: user.email });
      if (existing) {
        await User.updateOne({ email: user.email }, { passwordHash, isActive: true });
        usersUpdated++;
      } else {
        await User.create({ ...user, passwordHash, isActive: true });
        usersCreated++;
      }
    }

    // Fetch IDs for relational data
    const userDocs = await User.find({
      email: { $in: TEST_USERS.map((u) => u.email) },
    }).lean();

    const byEmail = Object.fromEntries(userDocs.map((u) => [u.email, u._id as mongoose.Types.ObjectId]));

    const citizenId  = byEmail["user@dev.janmanindia.in"];
    const priyaId    = byEmail["priya@dev.janmanindia.in"];
    const rajanId    = byEmail["rajan@dev.janmanindia.in"];
    const swId       = byEmail["sw@dev.janmanindia.in"];
    const anitaId    = byEmail["anita@dev.janmanindia.in"];
    const litigId    = byEmail["litigation@dev.janmanindia.in"];
    const vikramId   = byEmail["vikram@dev.janmanindia.in"];
    const adminId    = byEmail["admin@dev.janmanindia.in"];

    // ── 2. Cases ──────────────────────────────────────────────────────────────
    await Case.deleteMany({ caseNumber: /^DEV-/ });

    const cases = await Case.insertMany([
      {
        caseTitle: "State v. Unknown — Theft at Karol Bagh Market",
        caseNumber: "DEV-CRM-001",
        status: "Open",
        path: "criminal",
        citizen: citizenId,
        litigationMember: litigId,
        socialWorker: swId,
        nextHearingDate: new Date("2026-05-10"),
        caseDiary: [
          {
            date: new Date("2026-04-01"),
            findings: "FIR registered at Karol Bagh PS. Client cooperative.",
            writtenBy: litigId,
          },
          {
            date: new Date("2026-04-15"),
            findings: "Chargesheet review in progress. Awaiting forensic report.",
            writtenBy: litigId,
          },
        ],
        criminalPath: {
          firFiled: true,
          firDoc: {
            label: "FIR Copy",
            url: "https://example.com/fir-001.pdf",
            uploadedBy: litigId,
            uploadedAt: new Date("2026-04-01"),
            ocrStatus: "processed",
            ocrText: "FIR No. 45/2026 Karol Bagh Police Station...",
          },
          chargesheetDueDate: new Date("2026-06-01"),
          chargesheetFiled: false,
          chargesheetAlertSent: false,
          chargesFramed: false,
          chargeDocs: [],
          trial: {
            prosecutionWitnesses: [{ name: "Ramesh Kumar" }, { name: "Shop owner Gupta" }],
            defenseWitnesses: [],
            evidenceDocs: [],
            forensicDocs: [],
          },
        },
      },
      {
        caseTitle: "Priya Sharma v. Landlord — Unlawful Eviction",
        caseNumber: "DEV-HC-001",
        status: "Pending",
        path: "highcourt",
        citizen: priyaId,
        litigationMember: vikramId,
        socialWorker: anitaId,
        nextHearingDate: new Date("2026-05-22"),
        caseDiary: [
          {
            date: new Date("2026-03-20"),
            findings: "Petition drafted. Client evicted without notice.",
            writtenBy: vikramId,
          },
        ],
        highCourtPath: {
          petitionFiled: {
            filed: true,
            filedAt: new Date("2026-03-25"),
            notes: "Writ petition filed under Article 226.",
          },
          supportingAffidavit: {
            filed: true,
            filedAt: new Date("2026-03-25"),
          },
          admission: { filed: false },
          counterAffidavit: { filed: false },
          rejoinder: { filed: false },
          pleaClose: { filed: false },
          inducement: { filed: false },
        },
      },
      {
        caseTitle: "Rajan Mehra — Custodial Violence Complaint",
        caseNumber: "DEV-CRM-002",
        status: "Escalated",
        path: "criminal",
        citizen: rajanId,
        litigationMember: litigId,
        socialWorker: swId,
        nextHearingDate: new Date("2026-04-30"),
        caseDiary: [
          {
            date: new Date("2026-04-10"),
            findings: "Medical examination report obtained. Serious injuries documented.",
            writtenBy: litigId,
          },
        ],
        criminalPath: {
          firFiled: true,
          chargesheetFiled: false,
          chargesheetDueDate: new Date("2026-05-15"),
          chargesheetAlertSent: true,
          chargesFramed: false,
          chargeDocs: [],
          trial: {
            prosecutionWitnesses: [{ name: "Dr. Sunita Rao (Medical Officer)" }],
            defenseWitnesses: [],
            evidenceDocs: [],
            forensicDocs: [],
          },
        },
      },
      {
        caseTitle: "Consumer Dispute — Defective Appliance (Closed)",
        caseNumber: "DEV-CRM-003",
        status: "Closed",
        path: "criminal",
        citizen: citizenId,
        litigationMember: litigId,
        socialWorker: swId,
        caseDiary: [
          {
            date: new Date("2026-02-01"),
            findings: "Settlement reached. Refund issued to client.",
            writtenBy: litigId,
          },
        ],
        criminalPath: {
          firFiled: true,
          chargesheetFiled: true,
          chargesheetDate: new Date("2026-02-10"),
          chargesheetAlertSent: true,
          chargesFramed: true,
          chargeDocs: [],
          trial: {
            prosecutionWitnesses: [],
            defenseWitnesses: [],
            evidenceDocs: [],
            forensicDocs: [],
          },
          verdict: "Settled — full refund awarded",
          verdictDate: new Date("2026-03-01"),
        },
      },
    ]);

    const case1Id = cases[0]._id as mongoose.Types.ObjectId;
    const case2Id = cases[1]._id as mongoose.Types.ObjectId;

    // ── 3. Appointments ───────────────────────────────────────────────────────
    await Appointment.deleteMany({ reason: /dev seed/i });

    await Appointment.insertMany([
      {
        citizen: citizenId,
        socialWorker: swId,
        litigationMember: litigId,
        requestedAt: new Date("2026-04-18"),
        proposedDate: new Date("2026-04-28T10:00:00"),
        status: "confirmed_litigation",
        reason: "Initial case consultation — dev seed",
        swNotes: "Client is cooperative. Documents in order.",
        litigationNotes: "Schedule confirmed for Monday 10 AM.",
      },
      {
        citizen: priyaId,
        socialWorker: anitaId,
        requestedAt: new Date("2026-04-20"),
        proposedDate: new Date("2026-05-02T14:00:00"),
        status: "approved_sw",
        reason: "Follow-up on eviction case documentation — dev seed",
        swNotes: "Approved. Awaiting litigation confirmation.",
      },
      {
        citizen: rajanId,
        socialWorker: swId,
        requestedAt: new Date("2026-04-21"),
        proposedDate: new Date("2026-05-05T11:00:00"),
        status: "pending_sw",
        reason: "Urgent review of custodial violence evidence — dev seed",
      },
    ]);

    // ── 4. EOD Reports ────────────────────────────────────────────────────────
    await EodReport.deleteMany({ summary: /dev seed/i });

    await EodReport.insertMany([
      {
        submittedBy: swId,
        date: new Date("2026-04-21"),
        summary: "Visited 3 clients in Karol Bagh area. Filed FIR paperwork for DEV-CRM-001. Dev seed.",
        hoursWorked: 8,
        ticketsWorkedOn: [case1Id],
        expenses: [
          { description: "Auto fare to Karol Bagh PS", amount: 120 },
          { description: "Document photocopies", amount: 45 },
        ],
        invoiceStatus: "pending",
      },
      {
        submittedBy: swId,
        date: new Date("2026-04-20"),
        summary: "Coordination meeting with litigation team. Client follow-up calls. Dev seed.",
        hoursWorked: 7,
        ticketsWorkedOn: [case1Id, case2Id],
        expenses: [
          { description: "Metro travel", amount: 60 },
        ],
        invoiceUrl: "https://example.com/invoice-sw-apr20.pdf",
        invoiceStatus: "approved",
        reviewedBy: adminId,
      },
      {
        submittedBy: anitaId,
        date: new Date("2026-04-21"),
        summary: "Home visit to Priya Sharma. Collected eviction notice and rent receipts. Dev seed.",
        hoursWorked: 6,
        ticketsWorkedOn: [case2Id],
        expenses: [
          { description: "Cab to client location", amount: 180 },
          { description: "Notarisation fee", amount: 200 },
        ],
        invoiceStatus: "pending",
      },
      {
        submittedBy: anitaId,
        date: new Date("2026-04-19"),
        summary: "Community outreach camp at Dharavi. 12 new citizens registered. Dev seed.",
        hoursWorked: 9,
        ticketsWorkedOn: [],
        expenses: [
          { description: "Pamphlet printing", amount: 350 },
          { description: "Travel", amount: 90 },
        ],
        invoiceStatus: "rejected",
        reviewedBy: adminId,
      },
    ]);

    // ── 5. SOS Alerts ─────────────────────────────────────────────────────────
    await SosAlert.deleteMany({ description: /dev seed/i });

    await SosAlert.insertMany([
      {
        raisedBy: citizenId,
        location: "Karol Bagh, New Delhi — near Metro Gate 4",
        description: "Threatening behaviour by landlord's men outside residence. Dev seed.",
        mediaUrls: ["https://example.com/sos-media-001.jpg"],
        status: "escalated",
        escalatedBy: swId,
        escalatedAt: new Date("2026-04-20T09:30:00"),
        assignedTo: litigId,
      },
      {
        raisedBy: rajanId,
        location: "Tihar Road, New Delhi",
        description: "Police harassment after bail. Being followed. Dev seed.",
        mediaUrls: [],
        status: "open",
      },
      {
        raisedBy: priyaId,
        location: "Kurla West, Mumbai",
        description: "Forcible entry by landlord while family at home. Dev seed.",
        mediaUrls: ["https://example.com/sos-media-003a.jpg", "https://example.com/sos-media-003b.jpg"],
        status: "resolved",
        escalatedBy: anitaId,
        escalatedAt: new Date("2026-04-15T16:00:00"),
        assignedTo: vikramId,
      },
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        users: `${usersCreated} created, ${usersUpdated} refreshed (password: Dev@1234)`,
        cases: `${cases.length} inserted (DEV-CRM-001, DEV-CRM-002, DEV-CRM-003, DEV-HC-001)`,
        appointments: "3 inserted",
        eodReports: "4 inserted",
        sosAlerts: "3 inserted (open / escalated / resolved)",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed — check server logs", detail: String(error) }, { status: 500 });
  }
}
