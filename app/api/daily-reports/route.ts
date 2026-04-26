import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import "@/models/User";  // populate
import "@/models/Case";  // populate
import mongoose from "mongoose";

const SUPERVISOR_ROLES = ["hr", "director", "superadmin"];

/**
 * GET /api/daily-reports
 *  - SW: own reports only
 *  - HR / Director / Superadmin: all reports (filterable by ?preparedBy)
 *  - ?date=YYYY-MM-DD returns the report (or empty) for that day
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(request.url);

    const filter: Record<string, unknown> = {};
    if (session.role === "socialworker") {
      filter.preparedBy = session.id;
    } else if (SUPERVISOR_ROLES.includes(session.role)) {
      const preparedBy = searchParams.get("preparedBy");
      if (preparedBy && mongoose.Types.ObjectId.isValid(preparedBy)) filter.preparedBy = preparedBy;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const date = searchParams.get("date");
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end   = new Date(d); end.setHours(23, 59, 59, 999);
        filter.reportDate = { $gte: start, $lte: end };
      }
    }

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const reports = await DailyReport.find(filter)
      .sort({ reportDate: -1 })
      .populate("preparedBy", "name email employeeId socialWorkerProfile")
      .populate("supervisor", "name role")
      .lean();
    return NextResponse.json({ reports });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/daily-reports", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/daily-reports — upserts by (preparedBy, reportDate). SW only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "socialworker") {
      return NextResponse.json({ error: "Only social workers can submit a daily report" }, { status: 403 });
    }
    await connectDB();
    const body = await request.json();

    const reportDateRaw = body.reportDate ?? new Date().toISOString();
    const reportDate = new Date(reportDateRaw);
    if (isNaN(reportDate.getTime())) {
      return NextResponse.json({ error: "reportDate is required and must be a valid date" }, { status: 400 });
    }
    // Normalise to midnight so a SW only ever has one report per calendar day.
    reportDate.setHours(0, 0, 0, 0);

    // Strip server-controlled fields
    const {
      _id: _id1, preparedBy: _preparedBy, supervisor: _sup, reviewedAt: _ra, supervisorRemarks: _sr,
      submittedAt: _sa, createdAt: _ca, updatedAt: _ua, __v: _v,
      ...payload
    } = body;
    void _id1; void _preparedBy; void _sup; void _ra; void _sr; void _sa; void _ca; void _ua; void _v;

    if (payload.status === "submitted") payload.submittedAt = new Date();

    const report = await DailyReport.findOneAndUpdate(
      { preparedBy: session.id, reportDate },
      { $set: { ...payload, preparedBy: session.id, reportDate } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/daily-reports", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
