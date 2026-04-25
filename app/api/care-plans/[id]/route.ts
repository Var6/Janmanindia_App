import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import CarePlan from "@/models/CarePlan";
import mongoose from "mongoose";

const SW_ROLES = ["socialworker", "director", "superadmin"];

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers can update care plans" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const plan = await CarePlan.findById(id);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { status, addSession, addGoal, completeGoal, summary, priority, referredTo, confidentialNotes } = body as {
      status?: "active" | "on_hold" | "completed" | "cancelled";
      summary?: string;
      priority?: "low" | "medium" | "high" | "critical";
      referredTo?: string;
      confidentialNotes?: string;
      addSession?: { date?: string; type: "phone" | "in_person" | "video" | "home_visit"; notes: string };
      addGoal?:    { description: string; targetDate?: string };
      completeGoal?: string; // goal _id
    };

    if (status) {
      plan.status = status;
      if (status === "completed" || status === "cancelled") plan.closedAt = new Date();
    }
    if (typeof summary  === "string") plan.summary  = summary.trim();
    if (priority) plan.priority = priority;
    if (typeof referredTo === "string") plan.referredTo = referredTo.trim() || undefined;
    if (typeof confidentialNotes === "string") plan.confidentialNotes = confidentialNotes.trim() || undefined;

    if (addSession?.notes && addSession.type) {
      plan.sessions.push({
        date: addSession.date ? new Date(addSession.date) : new Date(),
        type: addSession.type,
        notes: addSession.notes.trim(),
        conductedBy: new mongoose.Types.ObjectId(session.id),
      });
    }
    if (addGoal?.description) {
      plan.goals.push({
        description: addGoal.description.trim(),
        targetDate: addGoal.targetDate ? new Date(addGoal.targetDate) : undefined,
        completed: false,
      });
    }
    if (completeGoal) {
      const goals = plan.goals as unknown as mongoose.Types.DocumentArray<typeof plan.goals[number]>;
      const g = goals.id(completeGoal);
      if (g) {
        g.completed = true;
        g.completedAt = new Date();
      }
    }

    await plan.save();
    const populated = await CarePlan.findById(plan._id)
      .populate("community", "name email")
      .populate("createdBy", "name")
      .populate("sessions.conductedBy", "name")
      .lean();
    return NextResponse.json({ plan: populated });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/care-plans/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
