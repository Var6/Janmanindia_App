import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import EodReport from "@/models/EodReport";
import HeadLawyer from "@/models/HeadLawyer";
import User from "@/models/User";
import mongoose from "mongoose";

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const body = await request.json();
    const { action, notes } = body as {
      action: "hr_verify" | "approve" | "reject";
      notes?: string;
    };

    const report = await EodReport.findById(id);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "hr_verify") {
      if (!["hr", "director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Only HR can verify invoices" }, { status: 403 });
      }
      if (report.invoiceStatus !== "pending") {
        return NextResponse.json({ error: "Invoice is no longer pending" }, { status: 400 });
      }
      // For SW invoices HR's verify is the final approval (no head-lawyer hop).
      // For litigation invoices HR moves it to hr_verified for head-lawyer/director sign-off.
      const isLitigation = report.submitterRole === "litigation";
      report.hrVerifiedBy = new mongoose.Types.ObjectId(session.id);
      report.hrVerifiedAt = new Date();
      if (notes) report.hrNotes = notes;
      if (isLitigation) {
        report.invoiceStatus = "hr_verified";
      } else {
        report.invoiceStatus = "approved";
        report.finalApprovedBy = new mongoose.Types.ObjectId(session.id);
        report.finalApprovedAt = new Date();
        report.reviewedBy = new mongoose.Types.ObjectId(session.id); // legacy
      }
      await report.save();
      return NextResponse.json({ report });
    }

    if (action === "approve") {
      // Only the head lawyer of the submitter's district, or the director, can finalize.
      if (!["litigation", "director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (report.invoiceStatus !== "hr_verified") {
        return NextResponse.json({ error: "Invoice must be HR-verified before final approval" }, { status: 400 });
      }
      if (session.role === "litigation") {
        // Verify they are the head lawyer for the submitter's district
        const submitter = await User.findById(report.submittedBy).lean();
        const district = submitter?.litigationProfile?.location?.district;
        if (!district) {
          return NextResponse.json({ error: "Submitter has no district on file — director must approve" }, { status: 403 });
        }
        const head = await HeadLawyer.findOne({ district }).lean();
        if (!head || String(head.user) !== session.id) {
          return NextResponse.json({ error: "Only the head lawyer of this district can approve" }, { status: 403 });
        }
      }
      report.finalApprovedBy = new mongoose.Types.ObjectId(session.id);
      report.finalApprovedAt = new Date();
      if (notes) report.approvalNotes = notes;
      report.invoiceStatus = "approved";
      report.reviewedBy = new mongoose.Types.ObjectId(session.id); // legacy
      await report.save();
      return NextResponse.json({ report });
    }

    if (action === "reject") {
      // HR can reject pending; head lawyer / director can reject hr_verified.
      const canHr  = ["hr", "director", "superadmin"].includes(session.role) && report.invoiceStatus === "pending";
      const canHead = ["litigation", "director", "superadmin"].includes(session.role) && report.invoiceStatus === "hr_verified";
      if (!canHr && !canHead) {
        return NextResponse.json({ error: "Not allowed to reject at this stage" }, { status: 403 });
      }
      report.invoiceStatus = "rejected";
      report.rejectionReason = notes ?? "No reason given";
      report.reviewedBy = new mongoose.Types.ObjectId(session.id);
      await report.save();
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/eod-reports/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
