import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User from "@/models/User";
import mongoose from "mongoose";

const HR_ROLES = ["hr", "director", "superadmin"] as const;

/**
 * GET /api/hr/staff/[id]/docs — read a staff member's onboardingDocs sub-doc.
 * HR / Director / Superadmin only.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(...HR_ROLES);
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const user = await User.findById(id).select("name email role employeeId onboardingDocs").lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/hr/staff/[id]/docs — replace the onboardingDocs sub-doc on
 * any staff member. HR uses this to fill in PAN / Aadhaar / bank / CV /
 * academic docs after they've been collected from the staff member.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(...HR_ROLES);
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const body = await request.json();

    // Only the onboardingDocs subtree is mutable through this endpoint —
    // role / email / passwordHash / employeeId are managed elsewhere.
    const { onboardingDocs } = body as { onboardingDocs?: unknown };
    if (!onboardingDocs || typeof onboardingDocs !== "object") {
      return NextResponse.json({ error: "onboardingDocs object is required" }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    user.onboardingDocs = {
      ...(user.onboardingDocs ?? {}),
      ...(onboardingDocs as Record<string, unknown>),
      submittedAt: user.onboardingDocs?.submittedAt ?? new Date(),
    };
    user.markModified("onboardingDocs");
    await user.save();

    return NextResponse.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        onboardingDocs: user.onboardingDocs,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/hr/staff/[id]/docs", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
