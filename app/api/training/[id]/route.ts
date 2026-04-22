import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import TrainingMaterial from "@/models/TrainingMaterial";

/** DELETE /api/training/[id] — uploader, admin, or superadmin can delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const material = await TrainingMaterial.findById(id);
    if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(material.uploadedBy) === session.id;
    const isAdmin = session.role === "director" || session.role === "superadmin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await material.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("training delete error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
