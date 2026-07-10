import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import StaffDailyReport from "@/models/StaffDailyReport";
import {
  REPORT_VIEWER_ROLES, REPORTING_ROLES,
  istDateKey, sanitizeReportHtml, htmlToPreview,
} from "@/lib/daily-report";

/** Strip "directors"-only comments for people outside the reviewer group. */
function serializeReport(r: Record<string, unknown>, viewer: boolean, sessionId: string) {
  const comments = ((r.comments as Array<Record<string, unknown>>) ?? [])
    .filter((c) => viewer || c.visibility === "public")
    .map((c) => ({
      _id: String(c._id),
      text: c.text,
      byName: c.byName,
      byRole: c.byRole,
      visibility: c.visibility,
      createdAt: c.createdAt,
      mine: String(c.by) === sessionId,
    }));
  return {
    _id: String(r._id),
    author: String(r.author),
    authorName: r.authorName,
    authorRole: r.authorRole,
    dateKey: r.dateKey,
    html: r.html,
    preview: r.preview,
    createdAt: r.createdAt,
    comments,
  };
}

/**
 * GET /api/staff-reports
 *   ?mine=1            → my own history (any staff; newest first, 90 entries)
 *   ?date=YYYY-MM-DD   → all submissions that day + missing list (viewers only)
 *   ?month=YYYY-MM     → calendar map { "YYYY-MM-DD": count } (viewers get
 *                        org-wide counts; everyone else their own 0/1 map)
 *
 * Privacy: staff can NEVER read each other's reports — only the reviewer
 * group (director / superadmin / administrator / HR) sees other people's.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community" || session.role === "pending") {
      return NextResponse.json({ error: "Staff only" }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    const viewer = REPORT_VIEWER_ROLES.includes(session.role);
    const today = istDateKey();

    if (searchParams.get("mine")) {
      const reports = await StaffDailyReport.find({ author: session.id })
        .sort({ dateKey: -1 })
        .limit(90)
        .lean();
      return NextResponse.json({
        reports: reports.map((r) => serializeReport(r as never, viewer, session.id)),
        today,
        submittedToday: reports.some((r) => r.dateKey === today),
        isViewer: viewer,
      });
    }

    const month = searchParams.get("month");
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const match: Record<string, unknown> = { dateKey: { $regex: `^${month}` } };
      if (!viewer) match.author = new mongoose.Types.ObjectId(session.id);
      const rows = await StaffDailyReport.aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: "$dateKey", count: { $sum: 1 } } },
      ]);
      const days: Record<string, number> = {};
      for (const r of rows) days[r._id] = r.count;
      return NextResponse.json({ days, today });
    }

    const date = searchParams.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const reports = await StaffDailyReport.find({ dateKey: date })
        .sort({ createdAt: 1 })
        .lean();
      // Who was expected but didn't submit that day.
      const staff = await User.find({ role: { $in: REPORTING_ROLES }, isActive: true })
        .select("name role")
        .lean();
      const submittedIds = new Set(reports.map((r) => String(r.author)));
      const missing = staff
        .filter((u) => !submittedIds.has(String(u._id)))
        .map((u) => ({ _id: String(u._id), name: u.name, role: u.role }));
      return NextResponse.json({
        reports: reports.map((r) => serializeReport(r as never, true, session.id)),
        missing,
        today,
      });
    }

    return NextResponse.json({ error: "Pass ?mine=1, ?date= or ?month=" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/staff-reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/staff-reports — submit TODAY's report. One per day, immutable. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community" || session.role === "pending") {
      return NextResponse.json({ error: "Staff only" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const html = sanitizeReportHtml(String(body.html ?? ""));
    const preview = htmlToPreview(html);
    if (!preview) {
      return NextResponse.json({ error: "Write something before submitting." }, { status: 400 });
    }

    const dateKey = istDateKey();
    const existing = await StaffDailyReport.findOne({ author: session.id, dateKey }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "You've already submitted today's report — it can't be edited once filed." },
        { status: 409 }
      );
    }

    const me = await User.findById(session.id).select("name role").lean();
    try {
      const report = await StaffDailyReport.create({
        author: session.id,
        authorName: me?.name ?? session.name,
        authorRole: me?.role ?? session.role,
        dateKey,
        html,
        preview,
      });
      return NextResponse.json(
        { report: serializeReport(report.toObject() as never, REPORT_VIEWER_ROLES.includes(session.role), session.id) },
        { status: 201 }
      );
    } catch (e) {
      // Unique-index race (double click) — treat as already submitted.
      if ((e as { code?: number })?.code === 11000) {
        return NextResponse.json({ error: "Already submitted today." }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/staff-reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
