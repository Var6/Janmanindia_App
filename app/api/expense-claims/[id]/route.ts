import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import ExpenseClaim from "@/models/ExpenseClaim";
import mongoose from "mongoose";

const PAYER_ROLES = ["finance", "director", "superadmin"];

/**
 * PATCH — advance a claim through its lifecycle.
 *   action = "approve"    → chosen director (or superadmin): submitted → approved
 *   action = "reject"     → chosen director OR a payer: → rejected
 *   action = "mark_paid"  → finance/director/superadmin: approved → paid
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const body = await request.json();
    const { action, notes } = body as { action?: string; notes?: string };
    if (!action || !["approve", "reject", "mark_paid"].includes(action)) {
      return NextResponse.json({ error: "action must be approve, reject or mark_paid" }, { status: 400 });
    }

    const claim = await ExpenseClaim.findById(id);
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

    const isChosenApprover =
      claim.approver && String(claim.approver) === session.id;
    const isSuperadmin = session.role === "superadmin";
    const isPayer = PAYER_ROLES.includes(session.role);

    if (action === "approve") {
      if (!isChosenApprover && !isSuperadmin) {
        return NextResponse.json({ error: "Only the director this claim was sent to can approve it" }, { status: 403 });
      }
      if (claim.status !== "submitted") {
        return NextResponse.json({ error: `Claim is already ${claim.status}` }, { status: 409 });
      }
      claim.status = "approved";
      claim.approval = { by: new mongoose.Types.ObjectId(session.id), at: new Date(), notes: notes?.trim() };
    } else if (action === "reject") {
      if (!isChosenApprover && !isSuperadmin && !isPayer) {
        return NextResponse.json({ error: "You can't reject this claim" }, { status: 403 });
      }
      if (claim.status === "paid" || claim.status === "rejected") {
        return NextResponse.json({ error: `Claim is already ${claim.status}` }, { status: 409 });
      }
      const rejectedFrom = claim.status; // "submitted" or "approved"
      claim.status = "rejected";
      claim.rejection = {
        stage: rejectedFrom === "approved" ? "finance" : "director",
        by: new mongoose.Types.ObjectId(session.id),
        at: new Date(),
        notes: notes?.trim(),
      };
    } else {
      // mark_paid
      if (!isPayer) {
        return NextResponse.json({ error: "Only finance can mark a claim paid" }, { status: 403 });
      }
      if (claim.status !== "approved") {
        return NextResponse.json({ error: "Only an approved claim can be marked paid" }, { status: 409 });
      }
      claim.status = "paid";
      claim.payment = { by: new mongoose.Types.ObjectId(session.id), at: new Date(), notes: notes?.trim() };
    }

    await claim.save();
    return NextResponse.json({ claim });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/expense-claims/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
