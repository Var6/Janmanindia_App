import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole, getSessionFromCookies } from "@/lib/auth";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

/**
 * GET /api/hr/attendance?date=2024-01-15
 * Returns all staff + their attendance record for the given date (defaults to today).
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const day = dateParam ? new Date(dateParam) : new Date();
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const [staff, records] = await Promise.all([
      User.find({ isActive: true, role: { $nin: ["community"] } })
        .select("name email role employeeId avatarUrl")
        .sort({ name: 1 })
        .lean(),
      Attendance.find({ date: { $gte: day, $lte: dayEnd } }).lean(),
    ]);

    const recordMap = new Map(records.map((r) => [String(r.employee), r]));

    const result = staff.map((u) => ({
      ...u,
      attendance: recordMap.get(String(u._id)) ?? null,
    }));

    return NextResponse.json({ staff: result, date: day });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/hr/attendance
 * Body: { employeeId: string, status: "present"|"absent"|"late"|"half-day", date?: string, notes?: string }
 * Upserts the attendance record for that employee on that date.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    const session = await getSessionFromCookies();
    await connectDB();

    const body = await req.json() as {
      employeeId: string;
      status: "present" | "absent" | "late" | "half-day";
      date?: string;
      notes?: string;
    };

    const { employeeId, status, notes } = body;
    if (!employeeId || !status) {
      return NextResponse.json({ error: "employeeId and status are required" }, { status: 400 });
    }
    if (!["present", "absent", "late", "half-day"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const day = body.date ? new Date(body.date) : new Date();
    day.setHours(0, 0, 0, 0);

    const record = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: day },
      {
        $set: {
          status,
          markedBy: session!.id,
          markedAt: new Date(),
          notes: notes?.trim() || undefined,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("attendance mark error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
