import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import MonthlyReport from "@/models/MonthlyReport";
import { templateForRole } from "@/lib/monthly-report-templates";
import mongoose from "mongoose";

// Who files monthly reports, and the template type each role fills.
const SUBMITTER_ROLES = ["litigation", "socialworker"];
// Who can read everyone's reports.
const VIEWER_ROLES = ["director", "superadmin", "hr", "administrator"];

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "true";
    const type = searchParams.get("type");
    const month = searchParams.get("month");
    const submittedBy = searchParams.get("submittedBy");

    const filter: Record<string, unknown> = {};
    if (mine) {
      filter.submittedBy = session.id;
    } else if (!VIEWER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (type) filter.type = type;
    if (month) filter.month = month;
    if (submittedBy && mongoose.Types.ObjectId.isValid(submittedBy)) filter.submittedBy = submittedBy;

    const reports = await MonthlyReport.find(filter)
      .sort({ month: -1, createdAt: -1 })
      .populate("submittedBy", "name email role employeeId")
      .lean();

    return NextResponse.json({ reports });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/monthly-reports", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const template = templateForRole(session.role);
    if (!SUBMITTER_ROLES.includes(session.role) || !template) {
      return NextResponse.json({ error: "Your role doesn't file monthly reports." }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { month, submissionDate, header, sections } = body as {
      month?: string;
      submissionDate?: string;
      header?: Record<string, unknown>;
      sections?: Record<string, unknown>;
    };
    if (!month || !MONTH_RE.test(month)) {
      return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
    }

    const existing = await MonthlyReport.findOne({ submittedBy: session.id, month }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "You already have a report for this month. Open it to edit.", id: String(existing._id) },
        { status: 409 }
      );
    }

    const report = await MonthlyReport.create({
      type: template.type,
      submittedBy: session.id,
      submitterName: session.name,
      submitterRole: session.role,
      month,
      submissionDate: submissionDate ? new Date(submissionDate) : new Date(),
      header: header && typeof header === "object" ? header : {},
      sections: sections && typeof sections === "object" ? sections : {},
      status: "submitted",
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/monthly-reports", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
