import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import "@/models/User";
import "@/models/Case";
import mongoose from "mongoose";

const SUPERVISOR_ROLES = ["hr", "director", "superadmin"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await connectDB();
    const report = await DailyReport.findById(id)
      .populate("preparedBy", "name email employeeId socialWorkerProfile")
      .populate("supervisor", "name role")
      .lean();
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ownerId = String((report.preparedBy as { _id?: unknown })?._id ?? report.preparedBy);
    const allowed = ownerId === session.id || SUPERVISOR_ROLES.includes(session.role);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/daily-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/daily-reports/[id]
 *  - Owner SW can edit while status=draft (or re-open after submission for now).
 *  - Supervisors (HR / Director / Superadmin) can attach review remarks and
 *    flip status to "reviewed".
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await connectDB();
    const report = await DailyReport.findById(id);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const action = body.action as string | undefined;

    // Supervisor review flow
    if (action === "review") {
      if (!SUPERVISOR_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Only supervisors can mark a report reviewed" }, { status: 403 });
      }
      if (report.status === "draft") {
        return NextResponse.json({ error: "Report has not been submitted yet" }, { status: 400 });
      }
      report.status = "reviewed";
      report.supervisor = new mongoose.Types.ObjectId(session.id);
      report.reviewedAt = new Date();
      if (typeof body.supervisorRemarks === "string") report.supervisorRemarks = body.supervisorRemarks.trim();
      await report.save();
      return NextResponse.json({ report });
    }

    // Owner edit / submit
    if (String(report.preparedBy) !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip server-controlled keys
    delete body._id; delete body.preparedBy; delete body.supervisor;
    delete body.reviewedAt; delete body.supervisorRemarks; delete body.action;
    delete body.createdAt; delete body.updatedAt; delete body.__v;

    if (body.status === "submitted" && !body.submittedAt) body.submittedAt = new Date();

    Object.assign(report, body);
    await report.save();
    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/daily-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await connectDB();
    const report = await DailyReport.findById(id);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(report.preparedBy) !== session.id && !SUPERVISOR_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (report.status !== "draft") {
      return NextResponse.json({ error: "Only draft reports can be deleted" }, { status: 400 });
    }
    await report.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
