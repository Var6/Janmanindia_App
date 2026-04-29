import mongoose from "mongoose";
import User from "@/models/User";
import Activity from "@/models/Activity";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

/** All sync helpers swallow errors — calendar issues must never break the API. */

/** Pick the right calendar to host the event on, plus collect attendee emails
 *  for everyone else who needs to see it (creator + co-assignees).
 *  Owner preference order:
 *  1. The primary assignee (so it lands on the calendar of the person doing the work)
 *  2. Otherwise the creator (so the assigner still sees it)
 *  3. Otherwise null — nobody has connected, skip. */
async function pickEventOwner(
  assigneeId: mongoose.Types.ObjectId,
  creatorId: mongoose.Types.ObjectId,
  coAssigneeIds: mongoose.Types.ObjectId[] = [],
): Promise<{ ownerId: mongoose.Types.ObjectId; refreshToken: string; attendeeEmails: string[] } | null> {
  try {
    const ids = [assigneeId, creatorId, ...coAssigneeIds];
    const users = await User.find({ _id: { $in: ids } })
      .select("+googleRefreshToken googleEmail email")
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const assignee = byId.get(String(assigneeId));
    const creator  = byId.get(String(creatorId));

    let ownerId: mongoose.Types.ObjectId;
    let refreshToken: string;
    if (assignee?.googleRefreshToken) {
      ownerId = assigneeId;
      refreshToken = assignee.googleRefreshToken;
    } else if (creator?.googleRefreshToken) {
      ownerId = creatorId;
      refreshToken = creator.googleRefreshToken;
    } else {
      return null;
    }

    // Everyone except the calendar owner becomes an attendee, so the invite
    // arrives on their primary calendar without needing them to connect.
    const attendees = new Set<string>();
    for (const id of [assigneeId, creatorId, ...coAssigneeIds]) {
      if (String(id) === String(ownerId)) continue;
      const u = byId.get(String(id));
      const email = u?.googleEmail || u?.email;
      if (email) attendees.add(email.toLowerCase());
    }

    return { ownerId, refreshToken, attendeeEmails: [...attendees] };
  } catch {
    return null;
  }
}

/** Compute event start/end. Order of precedence:
 *   1. If `endsAt` is supplied and strictly after the start → use both.
 *   2. If `dueDate` has zeroed time (date-only midnight UTC) → start at 09:00
 *      IST, end 30 min later.
 *   3. Otherwise honour the start time and default to a 30-min slot. */
function eventTimes(dueDate: Date, endsAt?: Date | null): { start: Date; end: Date } {
  const d = new Date(dueDate);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    // Treat midnight UTC as a date-only value → 09:00 IST = 03:30 UTC
    d.setUTCHours(3, 30, 0, 0);
  }
  if (endsAt) {
    const e = new Date(endsAt);
    if (!isNaN(e.getTime()) && e.getTime() > d.getTime()) {
      return { start: d, end: e };
    }
  }
  return { start: d, end: new Date(d.getTime() + 30 * 60_000) };
}

/** Build the human-readable description used on the Google Calendar event.
 *  Includes attribution ("Assigned by … to …"), priority, category, and an
 *  optional status line. Pass status only on the update path. */
async function buildEventDescription(
  act: {
    description?: string;
    priority: string;
    category: string;
    status?: string;
    assignee: mongoose.Types.ObjectId;
    coAssignees?: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
  },
  options: { includeStatus?: boolean } = {},
): Promise<string> {
  const ids = [act.assignee, act.createdBy, ...(act.coAssignees ?? [])];
  const users = ids.length
    ? await User.find({ _id: { $in: ids } }).select("name").lean()
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u.name]));

  const assigneeName  = byId.get(String(act.assignee))  ?? "—";
  const creatorName   = byId.get(String(act.createdBy)) ?? "—";
  const coNames       = (act.coAssignees ?? [])
    .map((id) => byId.get(String(id)))
    .filter((n): n is string => Boolean(n));

  const recipients = coNames.length
    ? `${assigneeName}, ${coNames.join(", ")}`
    : assigneeName;

  const lines: string[] = [];
  if (act.description) lines.push(act.description, "");
  lines.push(`Assigned by ${creatorName} → ${recipients}`);
  lines.push(`Priority: ${act.priority}  ·  Category: ${act.category}`);
  if (options.includeStatus && act.status) lines.push(`Status: ${act.status}`);
  lines.push("");
  lines.push("Manage at https://app.janmanindia.org/activities");
  return lines.join("\n");
}

/** Push a brand-new activity to the right user's Google Calendar. */
export async function syncActivityCreate(activityId: string): Promise<void> {
  try {
    const act = await Activity.findById(activityId).lean();
    if (!act?.dueDate) return; // no due date — skip calendar sync

    const owner = await pickEventOwner(act.assignee, act.createdBy, act.coAssignees ?? []);
    if (!owner) return;

    const { start, end } = eventTimes(act.dueDate, act.endsAt);
    const description = await buildEventDescription(act);
    const eventId = await createEvent(owner.refreshToken, {
      summary: `📋 ${act.title}`,
      description,
      start, end,
      attendeeEmails: owner.attendeeEmails.length > 0 ? owner.attendeeEmails : undefined,
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

    // Refresh the attendee list so newly added co-assignees get the invite
    // and removed ones drop off. Skip the calendar owner — they're the host,
    // not an attendee.
    const otherIds = [act.createdBy, ...(act.coAssignees ?? [])].filter(
      (id) => String(id) !== String(act.googleEventOwner),
    );
    const otherUsers = otherIds.length
      ? await User.find({ _id: { $in: otherIds } }).select("googleEmail email").lean()
      : [];
    const attendeeEmails = Array.from(
      new Set(
        otherUsers
          .map((u) => (u.googleEmail || u.email || "").toLowerCase())
          .filter(Boolean),
      ),
    );

    const { start, end } = eventTimes(act.dueDate, act.endsAt);
    const statusPrefix = act.status === "done" ? "✅ " : act.status === "in_progress" ? "▶️ " : "📋 ";
    const description  = await buildEventDescription(act, { includeStatus: true });
    await updateEvent(owner.googleRefreshToken, act.googleEventId, {
      summary: `${statusPrefix}${act.title}`,
      description,
      start, end,
      attendeeEmails,
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
