import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import AanganChild from "@/models/AanganChild";
import AanganVisit from "@/models/AanganVisit";
import AanganIntervention from "@/models/AanganIntervention";

const ALLOWED = ["socialworker", "director", "superadmin"];
const day = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** GET /api/aangan — everything the Aangan dashboard needs, mapped to the
 *  shape the client component already uses (id / childId / fw / lead …). */
export async function GET() {
  try {
    const session = await requireSession();
    if (!ALLOWED.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const [children, visits, interventions] = await Promise.all([
      AanganChild.find({}).sort({ updatedAt: -1 }).lean(),
      AanganVisit.find({}).sort({ date: -1 }).lean(),
      AanganIntervention.find({}).sort({ date: -1 }).lean(),
    ]);

    return NextResponse.json({
      children: children.map((c) => ({
        id: String(c._id), name: c.name, age: c.age, gender: c.gender,
        village: c.village ?? "", district: c.district ?? "", risks: c.risks ?? [],
        concern: c.concern, fw: c.fieldworker ?? "", lastVisit: day(c.lastVisitDate),
      })),
      visits: visits.map((v) => ({
        id: String(v._id), childId: String(v.child), date: day(v.date),
        fw: v.fieldworker ?? "", concern: v.concern, note: v.note ?? "",
      })),
      interventions: interventions.map((i) => ({
        id: String(i._id), childId: String(i.child), type: i.type,
        stage: i.stage, date: day(i.date), lead: i.lead ?? "",
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/aangan error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
