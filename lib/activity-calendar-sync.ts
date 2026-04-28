import mongoose from "mongoose";
import User from "@/models/User";
import Activity from "@/models/Activity";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

/** All sync helpers swallow errors — calendar issues must never break the API. */

/** Pick the right calendar to host the event on:
 *  1. The assignee (so it shows on the person's calendar who must do the work)
 *  2. Otherwise the creator (so the assigner still sees it)
 *  3. Otherwise null — neither has connected, skip. */
async function pickEventOwner(
  assigneeId: mongoose.Types.ObjectId,
  creatorId: mongoose.Types.ObjectId,
): Promise<{ ownerId: mongoose.Types.ObjectId; refreshToken: string; otherEmail?: string } | null> {
  try {
    const [assignee, creator] = await Promise.all([
      User.findById(assigneeId).select("+googleRefreshToken googleEmail email").lean(),
      User.findById(creatorId ).select("+googleRefreshToken googleEmail email").lean(),
    ]);

    if (assignee?.googleRefreshToken) {
      return {
        ownerId: assigneeId,
        refreshToken: assignee.googleRefreshToken,
        otherEmail: creator?.googleEmail || creator?.email,
      };
    }
    if (creator?.googleRefreshToken) {
      return {
        ownerId: creatorId,
        refreshToken: creator.googleRefreshToken,
        otherEmail: assignee?.googleEmail || assignee?.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Compute event start/end. If dueDate has zeroed time (date-only),
 *  default to 09:00 IST that day for a 30-min slot. Otherwise honour the time. */
function eventTimes(dueDate: Date): { start: Date; end: Date } {
  const d = new Date(dueDate);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    // Treat midnight UTC as a date-only value → 09:00 IST = 03:30 UTC
    d.setUTCHours(3, 30, 0, 0);
  }
  return { start: d, end: new Date(d.getTime() + 30 * 60_000) };
}

/** Push a brand-new activity to the right user's Google Calendar. */
export async function syncActivityCreate(activityId: string): Promise<void> {
  try {
    const act = await Activity.findById(activityId).lean();
    if (!act?.dueDate) return; // no due date — skip calendar sync

    const owner = await pickEventOwner(act.assignee, act.createdBy);
    if (!owner) return;

    const { start, end } = eventTimes(act.dueDate);
    const eventId = await createEvent(owner.refreshToken, {
      summary: `📋 ${act.title}`,
      description: [
        act.description || "",
        `Priority: ${act.priority}`,
        `Category: ${act.category}`,
        "",
        "Manage at https://app.janmanindia.org/activities",
      ].filter(Boolean).join("\n"),
      start, end,
      attendeeEmails: owner.otherEmail ? [owner.otherEmail] : undefined,
    });

    if (eventId) {
      await Activity.updateOne(
        { _id: activityId },
        { $set: { googleEventId: eventId, googleEventOwner: owner.ownerId } }
      );
    }
  } catch (err) {
    console.error("syncActivityCreate failed:", err);
  }
}

/** Update the synced calendar event in place (title, due date, status). */
export async function syncActivityUpdate(activityId: string): Promise<void> {
  try {
    const act = await Activity.findById(activityId).lean();
    if (!act) return;
    if (!act.googleEventId || !act.googleEventOwner) {
      // Wasn't synced before — try a fresh create now (e.g. user just added a due date).
      if (act.dueDate) await syncActivityCreate(activityId);
      return;
    }

    const owner = await User.findById(act.googleEventOwner).select("+googleRefreshToken").lean();
    if (!owner?.googleRefreshToken) return;

    if (!act.dueDate) {
      // Due date was cleared — remove the event.
      await deleteEvent(owner.googleRefreshToken, act.googleEventId);
      await Activity.updateOne({ _id: activityId }, { $unset: { googleEventId: "", googleEventOwner: "" } });
      return;
    }

    const { start, end } = eventTimes(act.dueDate);
    const statusPrefix = act.status === "done" ? "✅ " : act.status === "in_progress" ? "▶️ " : "📋 ";
    await updateEvent(owner.googleRefreshToken, act.googleEventId, {
      summary: `${statusPrefix}${act.title}`,
      description: [
        act.description || "",
        `Priority: ${act.priority}`,
        `Category: ${act.category}`,
        `Status: ${act.status}`,
        "",
        "Manage at https://app.janmanindia.org/activities",
      ].filter(Boolean).join("\n"),
      start, end,
    });
  } catch (err) {
    console.error("syncActivityUpdate failed:", err);
  }
}

/** Reassignment — delete the old event and create a fresh one on the new
 *  assignee's calendar (or fall back to creator). */
export async function syncActivityReassign(activityId: string, _previousAssigneeId?: mongoose.Types.ObjectId): Promise<void> {
  try {
    await syncActivityDelete(activityId);
    await syncActivityCreate(activityId);
  } catch (err) {
    console.error("syncActivityReassign failed:", err);
  }
}

export async function syncActivityDelete(activityId: string): Promise<void> {
  try {
    const act = await Activity.findById(activityId).lean();
    if (!act?.googleEventId || !act.googleEventOwner) return;
    const owner = await User.findById(act.googleEventOwner).select("+googleRefreshToken").lean();
    if (!owner?.googleRefreshToken) return;
    await deleteEvent(owner.googleRefreshToken, act.googleEventId);
    await Activity.updateOne({ _id: activityId }, { $unset: { googleEventId: "", googleEventOwner: "" } });
  } catch (err) {
    console.error("syncActivityDelete failed:", err);
  }
}
