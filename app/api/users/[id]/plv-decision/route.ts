import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import mongoose from "mongoose";

const APPROVER_ROLES = ["socialworker", "director", "superadmin"];

/** Social worker (or higher) approves / rejects a PLV request. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!APPROVER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers can decide PLV requests" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const body = await request.json();
    const { decision, reason } = body as { decision: "approved" | "rejected"; reason?: string };
    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
    }
    if (decision === "rejected" && !reason?.trim()) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    const target = await User.findById(id);
    if (!target || target.role !== "community") {
      return NextResponse.json({ error: "Community member not found" }, { status: 404 });
    }
    if (target.communityProfile?.plvStatus !== "requested") {
      return NextResponse.json({ error: "There is no pending PLV request for this user" }, { status: 400 });
    }

    target.communityProfile.plvStatus     = decision;
    target.communityProfile.plvDecidedBy  = new mongoose.Types.ObjectId(session.id);
    target.communityProfile.plvDecidedAt  = new Date();
    target.communityProfile.plvRejectionReason = decision === "rejected" ? reason!.trim() : undefined;
    target.markModified("communityProfile");
    await target.save();

    return NextResponse.json({ ok: true, plvStatus: decision });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/users/[id]/plv-decision", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
