import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import EodReport from "@/models/EodReport";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hr", "director", "superadmin");
    await connectDB();
    const { id } = await params;

    const report = await EodReport.findByIdAndUpdate(
      id,
      { $set: { invoiceStatus: "hr_verified" } },
      { new: true }
    );
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const referer = req.headers.get("referer") ?? "/hr";
    return NextResponse.redirect(referer, { status: 303 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
