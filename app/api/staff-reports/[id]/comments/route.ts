import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import Notification from "@/models/Notification";
import StaffDailyReport from "@/models/StaffDailyReport";
import { REPORT_VIEWER_ROLES } from "@/lib/daily-report";

/**
 * POST /api/staff-reports/[id]/comments — { text, visibility }
 *
 * Two comment tiers:
 *   "public"    — the report's author sees it (and all reviewers)
 *   "directors" — ONLY the reviewer group sees it (author never does)
 *
 * Reviewers (director / superadmin / administrator / HR) may post either tier
 * on any report. The report's author may post PUBLIC comments on their own
 * report (to reply to feedback). Nobody else can see or touch the report.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const report = await StaffDailyReport.findById(id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const viewer = REPORT_VIEWER_ROLES.includes(session.role);
    const isAuthor = String(report.author) === session.id;
    if (!viewer && !isAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Comment text is required." }, { status: 400 });

    let visibility: "public" | "directors" = body.visibility === "directors" ? "directors" : "public";
    // The author can only ever post public replies on their own report.
    if (!viewer) visibility = "public";

    const me = await User.findById(session.id).select("name role").lean();
    report.comments.push({
      text: text.slice(0, 3000),
      by: new mongoose.Types.ObjectId(session.id),
      byName: me?.name ?? session.name,
      byRole: me?.role ?? session.role,
      visibility,
      createdAt: new Date(),
    } as never);
    await report.save();

    // A public reviewer comment pings the author so feedback isn't missed.
    if (visibility === "public" && !isAuthor) {
      await Notification.create({
        recipient: report.author,
        type: "daily_report_comment",
        title: `💬 ${me?.name ?? "A reviewer"} commented on your daily report`,
        body: text.slice(0, 140),
        link: "/reports/daily",
        meta: { reportId: String(report._id) },
        read: false,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/staff-reports/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
