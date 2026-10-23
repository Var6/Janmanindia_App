import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import MonthlyReport from "@/models/MonthlyReport";
import mongoose from "mongoose";

const VIEWER_ROLES = ["director", "superadmin", "hr", "administrator"];
const MONTH_RE = /^\d{4}-\d{2}$/;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const report = await MonthlyReport.findById(id)
      .populate("submittedBy", "name email role employeeId")
      .lean();
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ownerId = String((report.submittedBy as unknown as { _id?: unknown })?._id ?? report.submittedBy);
    if (ownerId !== session.id && !VIEWER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/monthly-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const report = await MonthlyReport.findById(id);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Only the author may edit their report.
    if (String(report.submittedBy) !== session.id) {
      return NextResponse.json({ error: "You can only edit your own report." }, { status: 403 });
    }

    const body = await request.json();
    const { month, submissionDate, header, sections } = body as {
      month?: string;
      submissionDate?: string;
      header?: Record<string, unknown>;
      sections?: Record<string, unknown>;
    };

    if (month !== undefined) {
      if (!MONTH_RE.test(month)) {
        return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
      }
      if (month !== report.month) {
        const clash = await MonthlyReport.findOne({ submittedBy: session.id, month, _id: { $ne: id } }).select("_id").lean();
        if (clash) return NextResponse.json({ error: "You already have a report for that month." }, { status: 409 });
        report.month = month;
      }
    }
    if (submissionDate !== undefined) report.submissionDate = submissionDate ? new Date(submissionDate) : new Date();
    if (header && typeof header === "object") { report.header = header; report.markModified("header"); }
    if (sections && typeof sections === "object") { report.sections = sections; report.markModified("sections"); }

    await report.save();
    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PUT /api/monthly-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const report = await MonthlyReport.findById(id).select("submittedBy");
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(report.submittedBy) !== session.id && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await MonthlyReport.deleteOne({ _id: id });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/monthly-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
