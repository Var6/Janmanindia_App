import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import HeadLawyer from "@/models/HeadLawyer";
import User from "@/models/User";
import mongoose from "mongoose";

const APPROVER_ROLES = ["director", "superadmin"];

export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const heads = await HeadLawyer.find({})
      .populate("user", "name email litigationProfile")
      .populate("assignedBy", "name")
      .sort({ district: 1 })
      .lean();
    return NextResponse.json({ heads });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!APPROVER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only the director can assign head lawyers" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { district, userId, notes } = body as { district: string; userId: string; notes?: string };
    const cleanDistrict = String(district ?? "").trim();
    if (!cleanDistrict || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "district and a valid userId are required" }, { status: 400 });
    }

    const candidate = await User.findById(userId).lean();
    if (!candidate || candidate.role !== "litigation") {
      return NextResponse.json({ error: "Selected user must be a litigation member" }, { status: 400 });
    }

    // Upsert: one head lawyer per district
    const head = await HeadLawyer.findOneAndUpdate(
      { district: cleanDistrict },
      {
        district: cleanDistrict,
        user: userId,
        assignedBy: session.id,
        notes: notes?.trim(),
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ head }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/head-lawyers", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!APPROVER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only the director can remove head lawyers" }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");
    if (!district) return NextResponse.json({ error: "district is required" }, { status: 400 });
    await HeadLawyer.deleteOne({ district });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
