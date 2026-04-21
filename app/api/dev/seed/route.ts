import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";

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

    const passwordHash = await hashPassword(DEV_PASSWORD);
    let created = 0;
    let updated = 0;

    for (const user of TEST_USERS) {
      const existing = await User.findOne({ email: user.email });
      if (existing) {
        await User.updateOne({ email: user.email }, { passwordHash, isActive: true });
        updated++;
      } else {
        await User.create({ ...user, passwordHash, isActive: true });
        created++;
      }
    }

    return NextResponse.json({
      message: `Seeded ${TEST_USERS.length} users — ${created} created, ${updated} refreshed. Password for all: Dev@1234`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed — check MONGODB_URI" }, { status: 500 });
  }
}
