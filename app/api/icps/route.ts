import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Icp from "@/models/Icp";
import Case from "@/models/Case";
import User from "@/models/User";
import mongoose from "mongoose";

const SW_ROLES = ["socialworker", "director", "superadmin"];

/**
 * GET /api/icps?caseId=...
 *
 * Returns the ICP for a case if it exists, or a pre-filled draft skeleton
 * derived from the case + community member when none exists yet. The skeleton
 * is NOT persisted — it lets the front-end render a form with sensible
 * defaults so the social worker can start typing immediately.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // Access control — same rules as the case detail itself
    const cId = String(caseDoc.community ?? "");
    const lmId = String(caseDoc.litigationMember ?? "");
    const swId = String(caseDoc.socialWorker ?? "");
    const allowed =
      session.role === "superadmin" ||
      session.role === "director" ||
      (session.role === "community"   && cId === session.id) ||
      (session.role === "litigation"  && lmId === session.id) ||
      (session.role === "socialworker" && swId === session.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await Icp.findOne({ case: caseId })
      .populate("community", "name email phone communityProfile")
      .populate("interviewer", "name email")
      .lean();
    if (existing) return NextResponse.json({ icp: existing });

    // Build pre-filled skeleton from the case + community profile
    const community = await User.findById(caseDoc.community)
      .select("name email phone communityProfile")
      .lean();
    const skeleton = {
      _draft: true,
      case: caseId,
      community: caseDoc.community,
      interviewer: session.id,
      interviewDate: new Date().toISOString(),
      beneficiaryName: community?.name,
      phone: community?.phone,
      village: community?.communityProfile?.district,
      familyMembers: [],
      status: "draft" as const,
    };
    return NextResponse.json({ icp: skeleton });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/icps", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/icps  — upsert. Body must include `case` (id). If an ICP already
 * exists for the case it is updated; otherwise a new one is created. SW only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers can save an ICP" }, { status: 403 });
    }
    await connectDB();
    const body = await request.json();
    const caseId = body.case;
    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return NextResponse.json({ error: "case (id) is required" }, { status: 400 });
    }
    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // Strip server-controlled fields out of the incoming payload
    const {
      _id: _ignoreId, _draft: _ignoreDraft,
      case: _ignoreCase, community: _ignoreCommunity, interviewer: _ignoreInterviewer,
      createdAt: _ignoreCreated, updatedAt: _ignoreUpdated, __v: _ignoreV,
      ...payload
    } = body;
    void _ignoreId; void _ignoreDraft; void _ignoreCase; void _ignoreCommunity;
    void _ignoreInterviewer; void _ignoreCreated; void _ignoreUpdated; void _ignoreV;

    if (payload.status === "complete") payload.finalisedAt = new Date();

    const icp = await Icp.findOneAndUpdate(
      { case: caseId },
      {
        $set: {
          ...payload,
          case: caseId,
          community: caseDoc.community,
          interviewer: session.id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    return NextResponse.json({ icp }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/icps", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
