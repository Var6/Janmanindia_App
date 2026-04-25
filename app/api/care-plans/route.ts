import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import CarePlan from "@/models/CarePlan";
import Case from "@/models/Case";
import mongoose from "mongoose";

const SW_ROLES = ["socialworker", "director", "superadmin"];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const caseId    = searchParams.get("caseId");
    const community = searchParams.get("community");
    const status    = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (caseId    && mongoose.Types.ObjectId.isValid(caseId))    filter.case      = caseId;
    if (community && mongoose.Types.ObjectId.isValid(community)) filter.community = community;
    if (status) filter.status = status;

    // Community members can only see their own care plans
    if (session.role === "community") filter.community = session.id;

    const plans = await CarePlan.find(filter)
      .sort({ updatedAt: -1 })
      .populate("community", "name email")
      .populate("createdBy", "name")
      .populate("sessions.conductedBy", "name")
      .lean();

    return NextResponse.json({ plans });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/care-plans", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers can create care plans" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { community, case: caseId, title, category, priority, summary, referredTo, confidentialNotes, goals } = body as {
      community: string;
      case?: string;
      title: string;
      category: string;
      priority?: string;
      summary: string;
      referredTo?: string;
      confidentialNotes?: string;
      goals?: { description: string; targetDate?: string }[];
    };

    if (!community || !mongoose.Types.ObjectId.isValid(community)) {
      return NextResponse.json({ error: "Valid community ID is required" }, { status: 400 });
    }
    if (!title || !category || !summary) {
      return NextResponse.json({ error: "title, category, and summary are required" }, { status: 400 });
    }

    // If case provided, derive community from it (defensive — keeps the link consistent)
    let resolvedCommunity = community;
    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
      const caseDoc = await Case.findById(caseId).select("community").lean();
      if (caseDoc?.community) resolvedCommunity = String(caseDoc.community);
    }

    const plan = await CarePlan.create({
      community: resolvedCommunity,
      case: caseId && mongoose.Types.ObjectId.isValid(caseId) ? caseId : undefined,
      createdBy: session.id,
      title: title.trim(),
      category,
      priority: priority ?? "medium",
      summary: summary.trim(),
      referredTo: referredTo?.trim() || undefined,
      confidentialNotes: confidentialNotes?.trim() || undefined,
      goals: (goals ?? []).map((g) => ({
        description: g.description,
        targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        completed: false,
      })),
      sessions: [],
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/care-plans", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
