import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import TrainingMaterial from "@/models/TrainingMaterial";

/** GET /api/training/pending — HR/director/superadmin see the approval queue. */
export async function GET() {
  try {
    await requireRole("hr", "director", "superadmin");
    await connectDB();
    const materials = await TrainingMaterial.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role email")
      .lean();
    return NextResponse.json({ materials });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
