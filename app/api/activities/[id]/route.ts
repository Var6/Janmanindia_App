import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Activity, { type ActivityStatus, type ActivityPriority } from "@/models/Activity";
import TaskAssignment from "@/models/TaskAssignment";
import User from "@/models/User";
import Notification from "@/models/Notification";
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
    const { status, notes, priority, dueDate, endsAt, title, description, assignee, coAssignees, note,
            addTodo, toggleTodo, editTodo, removeTodo, commentTodo,
            editTodoComment, deleteTodoComment } = body as {
      status?: ActivityStatus; notes?: string; priority?: ActivityPriority;
      dueDate?: string; endsAt?: string;
      title?: string; description?: string;
      assignee?: string; coAssignees?: string[]; note?: string;
      /** Checklist mutations — only one fires per request. `mentions` on
       *  add/edit are user ids the title `@`-references; the API validates
       *  every id is on this activity (assignee or co-assignee) so people
       *  can't be mentioned into work they're not part of. */
      addTodo?:    { title: string; mentions?: string[] };
      toggleTodo?: { id: string; done: boolean };
      editTodo?:   { id: string; title: string; mentions?: string[] };
      removeTodo?: { id: string };
      /** Post a message on a checklist item's discussion thread. Open to any
       *  staff member (activities are org-visible), not just the owner. */
      commentTodo?: { id: string; text: string };
      /** Edit / delete your own thread message. */
      editTodoComment?:   { todoId: string; commentId: string; text: string };
      deleteTodoComment?: { todoId: string; commentId: string };
    };

    await connectDB();
    const activity = await Activity.findById(id);
    if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isPrivilegedRole = ASSIGN_ROLES.includes(session.role);

    // ── Todo discussion thread ─────────────────────────────────────────────
    // Any signed-in staff member can post on a checklist item's thread — a todo
    // doubles as a place to talk about that specific topic. Handled before the
    // owner/privileged gate below so non-owners can still chime in. The message
    // author (or a privileged role) can edit / delete their own message.
    if (commentTodo || editTodoComment || deleteTodoComment) {
      if (session.role === "community") {
        return NextResponse.json({ error: "Activities are staff-only" }, { status: 403 });
      }

      if (commentTodo) {
        if (!mongoose.Types.ObjectId.isValid(commentTodo.id)) {
          return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
        }
        const text = String(commentTodo.text ?? "").trim();
        if (!text) return NextResponse.json({ error: "Message is required" }, { status: 400 });
        const todo = activity.todos.find((tt) => String(tt._id) === commentTodo.id);
        if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        const me = await User.findById(session.id).select("name role").lean();
        todo.comments.push({
          text: text.slice(0, 2000),
          by: new mongoose.Types.ObjectId(session.id),
          byName: me?.name ?? "",
          byRole: session.role,
          createdAt: new Date(),
        } as never);
        await activity.save();

        // Notify everyone connected to this checklist item — the people it's
        // assigned to, whoever's @-mentioned, and anyone already in the thread —
        // except the person who just wrote it.
        const recipients = new Set<string>();
        [activity.assignee, activity.createdBy, ...(activity.coAssignees ?? []), ...(todo.mentions ?? [])]
          .forEach((u) => u && recipients.add(String(u)));
        (todo.comments ?? []).forEach((c) => c?.by && recipients.add(String(c.by)));
        recipients.delete(session.id);
        if (recipients.size > 0) {
          const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
          await Notification.insertMany(
            Array.from(recipients).map((r) => ({
              recipient: r,
              type: "activity_todo_comment",
              title: `💬 ${me?.name ?? "Someone"} on “${todo.title.slice(0, 60)}”`,
              body: preview,
              link: "/activities",
              meta: { activityId: id, todoId: commentTodo.id },
              read: false,
            }))
          ).catch(() => {});
        }
        return NextResponse.json({ activity });
      }

      if (editTodoComment) {
        const todo = activity.todos.find((tt) => String(tt._id) === editTodoComment.todoId);
        if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        const comment = todo.comments.find((c) => String(c._id) === editTodoComment.commentId);
        if (!comment) return NextResponse.json({ error: "Message not found" }, { status: 404 });
        if (String(comment.by) !== session.id && !isPrivilegedRole) {
          return NextResponse.json({ error: "You can only edit your own message." }, { status: 403 });
        }
        const text = String(editTodoComment.text ?? "").trim();
        if (!text) return NextResponse.json({ error: "Message can't be empty — delete it instead." }, { status: 400 });
        comment.text = text.slice(0, 2000);
        await activity.save();
        return NextResponse.json({ activity });
      }

      if (deleteTodoComment) {
        const todo = activity.todos.find((tt) => String(tt._id) === deleteTodoComment.todoId);
        if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        const comment = todo.comments.find((c) => String(c._id) === deleteTodoComment.commentId);
        if (!comment) return NextResponse.json({ error: "Message not found" }, { status: 404 });
        if (String(comment.by) !== session.id && !isPrivilegedRole) {
          return NextResponse.json({ error: "You can only delete your own message." }, { status: 403 });
        }
        todo.comments = todo.comments.filter((c) => String(c._id) !== deleteTodoComment.commentId) as typeof todo.comments;
        await activity.save();
        return NextResponse.json({ activity });
      }
    }

    // Anyone listed on the activity (assignee, co-assignee, or creator) plus
    // privileged roles can mutate it. Co-assignees couldn't tick todos before
    // because the original check only looked at primary + creator.
    const isCoAssignee = (activity.coAssignees ?? []).some((id) => String(id) === session.id);
    const isOwner = String(activity.assignee) === session.id || String(activity.createdBy) === session.id || isCoAssignee;
    const isPrivileged = ASSIGN_ROLES.includes(session.role);
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Checklist mutations — handled before the rest so adding a todo doesn't
    // accidentally trigger a calendar resync. Saved and returned immediately.
    if (addTodo || toggleTodo || editTodo || removeTodo) {
      // Build the activity's "member set" once — assignee + co-assignees.
      // `@`-mentions on a todo must point at someone in this set so people
      // can't be silently roped into work they aren't part of.
      const memberIds = new Set<string>([String(activity.assignee), ...activity.coAssignees.map((id) => String(id))]);
      const validateMentions = (raw: unknown): mongoose.Types.ObjectId[] => {
        if (!Array.isArray(raw)) return [];
        const out: mongoose.Types.ObjectId[] = [];
        const seen = new Set<string>();
        for (const id of raw) {
          if (typeof id !== "string") continue;
          if (!mongoose.Types.ObjectId.isValid(id)) continue;
          if (!memberIds.has(id)) continue;        // off-activity → drop
          if (seen.has(id)) continue;              // dedupe
          seen.add(id);
          out.push(new mongoose.Types.ObjectId(id));
        }
        return out;
      };

      if (addTodo) {
        const t = String(addTodo.title ?? "").trim();
        if (!t) return NextResponse.json({ error: "Todo title is required" }, { status: 400 });
        activity.todos.push({
          title: t.slice(0, 280),
          done: false,
          addedBy: new mongoose.Types.ObjectId(session.id),
          addedAt: new Date(),
          mentions: validateMentions(addTodo.mentions),
        } as never);
      }
      if (toggleTodo) {
        if (!mongoose.Types.ObjectId.isValid(toggleTodo.id)) {
          return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
        }
        const todo = activity.todos.find((t) => String(t._id) === toggleTodo.id);
        if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        todo.done = Boolean(toggleTodo.done);
        if (todo.done) {
          todo.doneBy = new mongoose.Types.ObjectId(session.id);
          todo.doneAt = new Date();
        } else {
          todo.doneBy = undefined;
          todo.doneAt = undefined;
        }
      }
      if (editTodo) {
        if (!mongoose.Types.ObjectId.isValid(editTodo.id)) {
          return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
        }
        const next = String(editTodo.title ?? "").trim();
        if (!next) return NextResponse.json({ error: "Todo title can't be empty — delete it instead" }, { status: 400 });
        const todo = activity.todos.find((t) => String(t._id) === editTodo.id);
        if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        todo.title = next.slice(0, 280);
        // Only overwrite mentions when the client explicitly sent the field —
        // a plain title rename shouldn't blow away the existing list.
        if ("mentions" in editTodo) {
          todo.mentions = validateMentions(editTodo.mentions) as typeof todo.mentions;
        }
      }
      if (removeTodo) {
        if (!mongoose.Types.ObjectId.isValid(removeTodo.id)) {
          return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
        }
        activity.todos = activity.todos.filter((t) => String(t._id) !== removeTodo.id) as typeof activity.todos;
      }
      await activity.save();
      return NextResponse.json({ activity });
    }

    const isCreator = String(activity.createdBy) === session.id;

    if (title?.trim()) activity.title = title.trim();
    if (description !== undefined) activity.description = description.trim();
    if (priority) activity.priority = priority;
    // Rescheduling is the CREATOR's call — nobody else moves the slot.
    if (dueDate !== undefined || endsAt !== undefined) {
      if (!isCreator) {
        return NextResponse.json({ error: "Only the activity's creator can reschedule it." }, { status: 403 });
      }
    }
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
      // Concluding is only possible once the scheduled slot has passed —
      // an activity planned for tomorrow can't be marked done today.
      if (status === "done") {
        const schedEnd = activity.endsAt ?? activity.dueDate;
        if (schedEnd && new Date(schedEnd).getTime() > Date.now()) {
          return NextResponse.json(
            { error: "This activity can only be concluded after its scheduled time has passed." },
            { status: 400 }
          );
        }
      }
      // Cancelling is creator-only (the UI no longer offers it broadly).
      if (status === "cancelled" && !isCreator) {
        return NextResponse.json({ error: "Only the activity's creator can cancel it." }, { status: 403 });
      }
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

    // Removing an activity is the creator's call alone.
    const isCreator = String(activity.createdBy) === session.id;
    if (!isCreator) {
      return NextResponse.json({ error: "Only the activity's creator can delete it." }, { status: 403 });
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
