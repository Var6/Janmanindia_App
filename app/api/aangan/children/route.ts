import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import AanganChild from "@/models/AanganChild";

const ALLOWED = ["socialworker", "director", "superadmin"];
const CONCERNS = ["low", "medium", "high", "critical"];

/** POST /api/aangan/children — register a child. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!ALLOWED.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const b = await req.json();
    const name = String(b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Child name is required" }, { status: 400 });

    await connectDB();
    const child = await AanganChild.create({
      name,
      age: Number(b.age) || 10,
      gender: ["F", "M", "O"].includes(b.gender) ? b.gender : "F",
      village: String(b.village ?? "").trim(),
      district: String(b.district ?? "").trim(),
      risks: Array.isArray(b.risks) ? b.risks.map(String) : [],
      concern: CONCERNS.includes(b.concern) ? b.concern : "medium",
      fieldworker: String(b.fw ?? b.fieldworker ?? "").trim(),
      lastVisitDate: b.date ? new Date(b.date) : undefined,
      createdBy: mongoose.Types.ObjectId.isValid(session.id) ? new mongoose.Types.ObjectId(session.id) : undefined,
    });
    return NextResponse.json({ ok: true, id: String(child._id) }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/aangan/children error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
