import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import Case from "@/models/Case";
import CarePlan from "@/models/CarePlan";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/users/[id]
 *
 * Returns a community member's profile bundled with their cases and care
 * plans — the data the SW community-detail page needs in one round-trip so
 * the SW can review history before approving / triaging.
 *
 * Authorisation:
 *   - superadmin / director / socialworker can view any community member
 *   - the user themselves can view their own record
 *   - all other roles (litigation, hr, finance, …) are forbidden here, since
 *     this endpoint exposes care-plan summaries which are SW-confidential
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const ALLOWED_VIEWERS = ["superadmin", "director", "socialworker"];
    const isSelf = session.id === id;
    if (!ALLOWED_VIEWERS.includes(session.role) && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(id)
      .select("-passwordHash -googleRefreshToken")
      .populate("communityProfile.assignedSocialWorker", "name email phone")
      .populate("communityProfile.verifiedBy", "name role")
      .populate("communityProfile.plvDecidedBy", "name role")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cases + care plans are only meaningful for community members. For staff
    // viewers we still return the profile so the SW can use this endpoint as
    // a directory lookup, but the related collections are scoped to community.
    let cases: unknown[] = [];
    let carePlans: unknown[] = [];
    if (user.role === "community") {
      [cases, carePlans] = await Promise.all([
        Case.find({ community: id })
          .select("caseNumber caseTitle status path district causeTitle nextHearingDate createdAt updatedAt litigationMember socialWorker")
          .populate("litigationMember", "name")
          .populate("socialWorker", "name")
          .sort({ updatedAt: -1 })
          .lean(),
        CarePlan.find({ community: id })
          .select("title status priority category summary createdAt updatedAt sessions case createdBy")
          .populate("createdBy", "name")
          .sort({ updatedAt: -1 })
          .lean(),
      ]);
    }

    return NextResponse.json({ user, cases, carePlans });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
