import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Report from "@/models/Report";

const PRIVILEGED = ["director", "superadmin", "administrator"];

/** GET /api/reports/[id] — fetch one. Author can always see their own;
 *  privileged roles see all. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (session.role === "community") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const report = await Report.findById(id)
      .populate("submittedBy", "name role email")
      .lean();
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAuthor = String(report.submittedBy && (report.submittedBy as unknown as { _id: unknown })._id) === session.id;
    if (!isAuthor && !PRIVILEGED.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/reports/[id]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
