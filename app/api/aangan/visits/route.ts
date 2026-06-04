import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import AanganChild from "@/models/AanganChild";
import AanganVisit from "@/models/AanganVisit";

const ALLOWED = ["socialworker", "director", "superadmin"];
const CONCERNS = ["low", "medium", "high", "critical"];

/** POST /api/aangan/visits — log a home visit; also refreshes the child's
 *  last-visit date and concern level so the registry stays current. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!ALLOWED.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const b = await req.json();
    const childId = String(b.childId ?? "");
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "Valid childId is required" }, { status: 400 });
    }
    const date = b.date ? new Date(b.date) : new Date();
    const concern = CONCERNS.includes(b.concern) ? b.concern : "medium";

    await connectDB();
    const visit = await AanganVisit.create({
      child: new mongoose.Types.ObjectId(childId),
      date,
      fieldworker: String(b.fw ?? "").trim(),
      concern,
      note: String(b.note ?? "").trim(),
      createdBy: mongoose.Types.ObjectId.isValid(session.id) ? new mongoose.Types.ObjectId(session.id) : undefined,
    });
    // Keep the registry row in sync with the latest visit.
    await AanganChild.updateOne({ _id: childId }, { $set: { lastVisitDate: date, concern } });

    return NextResponse.json({ ok: true, id: String(visit._id) }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/aangan/visits error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
