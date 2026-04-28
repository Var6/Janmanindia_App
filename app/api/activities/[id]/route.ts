import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Activity, { type ActivityStatus, type ActivityPriority } from "@/models/Activity";
import TaskAssignment from "@/models/TaskAssignment";

const ASSIGN_ROLES = ["director", "superadmin", "administrator", "hr"];

/** PATCH /api/activities/[id] — update status, notes, priority, dueDate, or reassign. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { status, notes, priority, dueDate, title, description, assignee, note } = body as {
      status?: ActivityStatus; notes?: string; priority?: ActivityPriority;
      dueDate?: string; title?: string; description?: string;
      assignee?: string; note?: string;
    };

    await connectDB();
    const activity = await Activity.findById(id);
    if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(activity.assignee) === session.id || String(activity.createdBy) === session.id;
    const isPrivileged = ASSIGN_ROLES.includes(session.role);
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (title?.trim()) activity.title = title.trim();
    if (description !== undefined) activity.description = description.trim();
    if (priority) activity.priority = priority;
    if (dueDate !== undefined) activity.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (notes !== undefined) activity.notes = notes;

    if (status) {
      activity.status = status;
      if (status === "in_progress" && !activity.startedAt) activity.startedAt = new Date();
      if (status === "done")        activity.completedAt = new Date();
    }

    // Reassignment — privileged only
    if (assignee && mongoose.Types.ObjectId.isValid(assignee) && assignee !== String(activity.assignee)) {
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const previousAssignee = activity.assignee;
      activity.assignee = new mongoose.Types.ObjectId(assignee);
      await TaskAssignment.create({
        activity: activity._id,
        assignedTo: activity.assignee,
        assignedBy: new mongoose.Types.ObjectId(session.id),
        previousAssignee,
        note: note?.trim() || undefined,
      });
    }

    await activity.save();
    return NextResponse.json({ activity });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/activities/[id] — creator or privileged only. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const activity = await Activity.findById(id);
    if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isCreator = String(activity.createdBy) === session.id;
    const isPrivileged = ASSIGN_ROLES.includes(session.role);
    if (!isCreator && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await activity.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
