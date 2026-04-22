import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Asset, { type AssetStatus } from "@/models/Asset";

const RETURN_STATUSES: AssetStatus[] = ["returned", "lost", "damaged"];

/** PATCH /api/hr/assets/[id] — mark asset returned/lost/damaged with optional notes. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hr", "director", "superadmin");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { status, returnNotes } = body as { status?: AssetStatus; returnNotes?: string };
    if (!status || !RETURN_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${RETURN_STATUSES.join(", ")}` }, { status: 400 });
    }

    await connectDB();
    const asset = await Asset.findById(id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    asset.status = status;
    asset.returnedAt = new Date();
    asset.returnedBy = new mongoose.Types.ObjectId(session.id);
    if (returnNotes?.trim()) asset.returnNotes = returnNotes.trim();
    await asset.save();

    return NextResponse.json({ asset });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("asset update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/hr/assets/[id] — remove (admin/superadmin only — corrects mistakes). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("director", "superadmin");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    await Asset.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
