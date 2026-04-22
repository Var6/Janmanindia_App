import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole, requireSession } from "@/lib/auth";
import DistrictHelpline from "@/models/DistrictHelpline";

/** GET /api/hr/helplines — list every district helpline (any authenticated). */
export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const helplines = await DistrictHelpline.find({})
      .sort({ district: 1 })
      .populate("setBy", "name role")
      .lean();
    return NextResponse.json({ helplines });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/hr/helplines — HR/admin/superadmin creates or updates one (upsert by district). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("hr", "director", "superadmin");
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    const body = await req.json();
    const { district, primaryName, primaryPhone, secondaryName, secondaryPhone, notes } = body as {
      district?: string; primaryName?: string; primaryPhone?: string;
      secondaryName?: string; secondaryPhone?: string; notes?: string;
    };
    if (!district?.trim() || !primaryName?.trim() || !primaryPhone?.trim()) {
      return NextResponse.json({ error: "district, primaryName, and primaryPhone are required" }, { status: 400 });
    }

    await connectDB();
    const helpline = await DistrictHelpline.findOneAndUpdate(
      { district: district.trim() },
      {
        district: district.trim(),
        primaryName: primaryName.trim(),
        primaryPhone: primaryPhone.trim(),
        secondaryName: secondaryName?.trim(),
        secondaryPhone: secondaryPhone?.trim(),
        notes: notes?.trim(),
        setBy: new mongoose.Types.ObjectId(session.id),
      },
      { upsert: true, new: true }
    );
    return NextResponse.json({ helpline }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("helpline upsert error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
