import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Project from "@/models/Project";
import mongoose from "mongoose";

const SUPERADMIN_ROLES = ["superadmin", "director"];

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!SUPERADMIN_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();

    if (typeof body.name === "string") project.name = body.name.trim();
    if (typeof body.description === "string") project.description = body.description.trim();
    if (body.status && ["active", "completed", "on_hold"].includes(body.status)) project.status = body.status;
    if (body.startDate) project.startDate = new Date(body.startDate);
    if (body.endDate)   project.endDate   = new Date(body.endDate);
    if (typeof body.totalBudget === "number") project.totalBudget = Math.max(0, body.totalBudget);
    if (body.managerId === null) project.manager = undefined;
    else if (body.managerId && mongoose.Types.ObjectId.isValid(body.managerId)) {
      project.manager = new mongoose.Types.ObjectId(body.managerId);
    }

    // Add a new fund allocation (donor receipt). Recomputes totalBudget = sum.
    if (body.addAllocation?.amount > 0 && body.addAllocation.source) {
      project.allocations.push({
        source: String(body.addAllocation.source).trim(),
        amount: Math.max(0, Number(body.addAllocation.amount)),
        receivedAt: body.addAllocation.receivedAt ? new Date(body.addAllocation.receivedAt) : new Date(),
        notes: body.addAllocation.notes?.trim(),
      });
      project.totalBudget = project.allocations.reduce((s, a) => s + (a.amount ?? 0), 0);
    }

    // Replace the full phases array (the UI sends the edited list).
    if (Array.isArray(body.phases)) {
      project.phases = body.phases.map((p: Record<string, unknown>) => ({
        name: String(p.name ?? "").trim(),
        startDate: p.startDate ? new Date(p.startDate as string) : undefined,
        endDate:   p.endDate   ? new Date(p.endDate as string)   : undefined,
        budget: p.budget != null ? Math.max(0, Number(p.budget)) : undefined,
        status: ["upcoming", "active", "completed"].includes(p.status as string) ? (p.status as string) : "upcoming",
        objectives: Array.isArray(p.objectives)
          ? (p.objectives as Record<string, unknown>[]).map((o) => ({
              label: String(o.label ?? "").trim(),
              target: o.target != null ? Number(o.target) : undefined,
              current: o.current != null ? Number(o.current) : 0,
              done: !!o.done,
            })).filter((o) => o.label)
          : [],
      })).filter((p: { name: string }) => p.name) as typeof project.phases;
    }

    await project.save();
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/projects/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (session.role !== "superadmin") {
      return NextResponse.json({ error: "Only superadmin can delete projects" }, { status: 403 });
    }
    const { id } = await ctx.params;
    await connectDB();
    await Project.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
