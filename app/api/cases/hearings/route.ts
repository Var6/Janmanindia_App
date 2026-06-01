import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";

/** GET /api/cases/hearings — upcoming court hearings (next 60 days) for the
 *  caller's cases. Returned to litigation members so the appointments hub
 *  can surface court dates alongside meeting requests. Director / superadmin
 *  see hearings across every case for the same window. */
export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const now    = new Date();
    const future = new Date(now); future.setDate(future.getDate() + 60); future.setHours(23, 59, 59, 999);

    const FINAL = ["Closed", "Dismissed", "Disposal", "Withdrawn"];
    let filter: Record<string, unknown> = {
      nextHearingDate: { $gte: now, $lte: future },
      status: { $nin: FINAL },
    };

    if (session.role === "litigation" && mongoose.Types.ObjectId.isValid(session.id)) {
      const id = new mongoose.Types.ObjectId(session.id);
      filter = {
        ...filter,
        $or: [{ litigationMember: id }, { litigationMembers: id }, { createdBy: id }],
      };
    } else if (session.role !== "director" && session.role !== "superadmin") {
      // Other roles don't get hearings — return an empty list so the
      // appointments page can render the section conditionally without
      // a special-case error.
      return NextResponse.json({ hearings: [] });
    }

    const cases = await Case.find(filter)
      .select("caseTitle caseNumber nextHearingDate courtName courtType status")
      .sort({ nextHearingDate: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({ hearings: cases });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/cases/hearings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
