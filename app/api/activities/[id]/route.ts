import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Activity, { type ActivityStatus, type ActivityPriority } from "@/models/Activity";

const ASSIGN_ROLES = ["director", "superadmin", "administrator", "hr"];

/** PATCH /api/activities/[id] — update status, notes, priority, dueDate.
 *  Only the assignee, creator, or a privileged role may update. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { status, notes, priority, dueDate, title, description } = body as {
      status?: ActivityStatus; notes?: string; priority?: ActivityPriority;
      dueDate?: string; title?: string; description?: string;
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
