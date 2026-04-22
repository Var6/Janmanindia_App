import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User from "@/models/User";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole("socialworker", "director", "superadmin");
    await connectDB();

    const body = await request.json();
    const { userId, status, rejectionReason } = body as {
      userId: string;
      status: "verified" | "rejected";
      rejectionReason?: string;
    };

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and status are required" }, { status: 400 });
    }

    if (!["verified", "rejected"].includes(status)) {
      return NextResponse.json({ error: "status must be verified or rejected" }, { status: 400 });
    }

    if (status === "rejected" && !rejectionReason) {
      return NextResponse.json({ error: "rejectionReason is required when rejecting" }, { status: 400 });
    }

    const target = await User.findOne({ _id: userId, role: "community" });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      "citizenProfile.verificationStatus": status,
      "citizenProfile.verifiedBy": session.id,
      "citizenProfile.verifiedAt": new Date(),
    };

    if (status === "rejected") {
      update["citizenProfile.rejectionReason"] = rejectionReason;
    }

    await User.updateOne({ _id: userId }, update);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/users/verify-id error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Also support POST for form submissions from the dashboard
export async function POST(request: NextRequest) {
  return PATCH(request);
}
