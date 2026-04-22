import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import DistrictHelpline from "@/models/DistrictHelpline";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ district: string }> }) {
  try {
    await requireRole("hr", "director", "superadmin");
    const { district } = await params;
    await connectDB();
    await DistrictHelpline.deleteOne({ district: decodeURIComponent(district) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
