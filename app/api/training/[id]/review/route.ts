import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import TrainingMaterial from "@/models/TrainingMaterial";

/** POST /api/training/[id]/review — HR/director/superadmin approve or reject. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hr", "director", "superadmin");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { action, reason } = body as { action?: "approve" | "reject"; reason?: string };
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    await connectDB();
    const material = await TrainingMaterial.findById(id);
    if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "approve") {
      material.status = "approved";
      material.approvedBy = new mongoose.Types.ObjectId(session.id);
      material.approvedAt = new Date();
      material.rejectionReason = undefined;
    } else {
      material.status = "rejected";
      material.rejectionReason = reason?.trim() || "No reason provided";
    }

    await material.save();
    return NextResponse.json({ material });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("training review error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
