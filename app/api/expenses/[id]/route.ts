import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Expense from "@/models/Expense";
import Project from "@/models/Project";
import mongoose from "mongoose";

/**
 * Approval pipeline:
 *   submitted          → HR verifies      → hr_verified
 *   hr_verified        → Director approves→ director_approved
 *   director_approved  → Finance pays     → paid (amount deducts from project budget)
 * Any stage may be rejected with a reason.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const expense = await Expense.findById(id);
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { action, notes } = body as {
      action: "hr_verify" | "director_approve" | "mark_paid" | "reject";
      notes?: string;
    };
    const stamp = { by: new mongoose.Types.ObjectId(session.id), at: new Date(), notes: notes?.trim() };

    if (action === "hr_verify") {
      if (!["hr", "director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Only HR can verify" }, { status: 403 });
      }
      if (expense.status !== "submitted") {
        return NextResponse.json({ error: "Only submitted expenses can be verified" }, { status: 400 });
      }
      expense.status = "hr_verified";
      expense.hrVerification = stamp;
      await expense.save();
      return NextResponse.json({ expense });
    }

    if (action === "director_approve") {
      if (!["director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Only the director can approve" }, { status: 403 });
      }
      if (expense.status !== "hr_verified") {
        return NextResponse.json({ error: "Expense must be HR-verified before director approval" }, { status: 400 });
      }
      expense.status = "director_approved";
      expense.directorApproval = stamp;
      await expense.save();
      return NextResponse.json({ expense });
    }

    if (action === "mark_paid") {
      if (!["finance", "director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Only finance can mark paid" }, { status: 403 });
      }
      if (expense.status !== "director_approved") {
        return NextResponse.json({ error: "Expense must be director-approved before payment" }, { status: 400 });
      }
      // Confirm the project still has budget headroom (advisory — we still allow it).
      const project = await Project.findById(expense.project).lean();
      if (project) {
        const paidSoFar = await Expense.aggregate([
          { $match: { project: project._id, status: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const spent = paidSoFar[0]?.total ?? 0;
        if (spent + expense.amount > (project.totalBudget ?? 0)) {
          // Don't block — just stamp a note that this overran budget.
          expense.payment = { ...stamp, notes: `${stamp.notes ?? ""}${stamp.notes ? " · " : ""}⚠ exceeds project budget`.trim() };
        }
      }
      expense.status = "paid";
      if (!expense.payment) expense.payment = stamp;
      await expense.save();
      return NextResponse.json({ expense });
    }

    if (action === "reject") {
      const stage = expense.status === "submitted" ? "hr"
                  : expense.status === "hr_verified" ? "director"
                  : null;
      if (!stage) return NextResponse.json({ error: "Cannot reject at this stage" }, { status: 400 });
      const isHrStage = stage === "hr";
      const allowed = isHrStage
        ? ["hr", "director", "superadmin"].includes(session.role)
        : ["director", "superadmin"].includes(session.role);
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!notes?.trim()) return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
      expense.status = "rejected";
      expense.rejection = { stage, ...stamp };
      await expense.save();
      return NextResponse.json({ expense });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/expenses/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
