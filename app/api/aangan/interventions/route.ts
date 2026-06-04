import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import AanganIntervention from "@/models/AanganIntervention";

const ALLOWED = ["socialworker", "director", "superadmin"];
const STAGES = ["planned", "ongoing", "resolved"];

/** POST /api/aangan/interventions — add an action to the interventions board. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!ALLOWED.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const b = await req.json();
    const childId = String(b.childId ?? "");
    const type = String(b.type ?? "").trim();
    if (!mongoose.Types.ObjectId.isValid(childId)) return NextResponse.json({ error: "Valid childId is required" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Intervention type is required" }, { status: 400 });

    await connectDB();
    const item = await AanganIntervention.create({
      child: new mongoose.Types.ObjectId(childId),
      type,
      stage: STAGES.includes(b.stage) ? b.stage : "planned",
      date: b.date ? new Date(b.date) : new Date(),
      lead: String(b.lead ?? "").trim(),
      createdBy: mongoose.Types.ObjectId.isValid(session.id) ? new mongoose.Types.ObjectId(session.id) : undefined,
    });
    return NextResponse.json({ ok: true, id: String(item._id) }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/aangan/interventions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
