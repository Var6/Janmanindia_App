import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Activity, { type ActivityStatus, type ActivityPriority } from "@/models/Activity";
import TaskAssignment from "@/models/TaskAssignment";
import { syncActivityUpdate, syncActivityReassign, syncActivityDelete } from "@/lib/activity-calendar-sync";

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
    const { status, notes, priority, dueDate, endsAt, title, description, assignee, coAssignees, note } = body as {
      status?: ActivityStatus; notes?: string; priority?: ActivityPriority;
      dueDate?: string; endsAt?: string;
      title?: string; description?: string;
      assignee?: string; coAssignees?: string[]; note?: string;
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
    if (endsAt !== undefined) {
      const candidate = endsAt ? new Date(endsAt) : undefined;
      const start = activity.dueDate ? new Date(activity.dueDate) : undefined;
      // Drop the end if it's not strictly after the start — the calendar
      // sync's 30-min default takes over in that case.
      activity.endsAt = candidate && start && !isNaN(candidate.getTime()) && candidate.getTime() > start.getTime()
        ? candidate
        : undefined;
    }
    if (notes !== undefined) activity.notes = notes;

    if (status) {
      activity.status = status;
      if (status === "in_progress" && !activity.startedAt) activity.startedAt = new Date();
      if (status === "done")        activity.completedAt = new Date();
    }

    // Reassignment — privileged only
    let didReassign = false;
    let previousAssigneeId: mongoose.Types.ObjectId | null = null;
    if (assignee && mongoose.Types.ObjectId.isValid(assignee) && assignee !== String(activity.assignee)) {
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      previousAssigneeId = activity.assignee;
      activity.assignee = new mongoose.Types.ObjectId(assignee);
      await TaskAssignment.create({
        activity: activity._id,
        assignedTo: activity.assignee,
        assignedBy: new mongoose.Types.ObjectId(session.id),
        previousAssignee: previousAssigneeId,
        note: note?.trim() || undefined,
      });
      didReassign = true;
    }

    // Co-assignees update — privileged only. Replaces the full list.
    // Newly added people get a TaskAssignment record; removals are silent.
    if (Array.isArray(coAssignees)) {
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const primaryId = String(activity.assignee);
      const seen = new Set<string>([primaryId]);
      const next: mongoose.Types.ObjectId[] = [];
      for (const id of coAssignees) {
        if (!mongoose.Types.ObjectId.isValid(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        next.push(new mongoose.Types.ObjectId(id));
      }
      const prev = new Set((activity.coAssignees ?? []).map((id) => String(id)));
      const added = next.filter((id) => !prev.has(String(id)));
      activity.coAssignees = next;
      if (added.length > 0) {
        const assignerId = new mongoose.Types.ObjectId(session.id);
        await TaskAssignment.insertMany(
          added.map((id) => ({
            activity: activity._id,
            assignedTo: id,
            assignedBy: assignerId,
            note: note?.trim() || undefined,
          })),
        );
      }
    }

    await activity.save();

    // Sync calendar event after save (best-effort). A reassignment moves the
    // event to a new owner's calendar; any other change — including the
    // coAssignee attendee list — is patched in place.
    if (didReassign && previousAssigneeId) {
      void syncActivityReassign(String(activity._id), previousAssigneeId);
    } else {
      void syncActivityUpdate(String(activity._id));
    }

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

    // Delete the calendar event first (uses the saved owner+eventId), then the activity.
    await syncActivityDelete(String(activity._id));
    await activity.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
