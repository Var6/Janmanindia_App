import User from "@/models/User";
import TrainingSession from "@/models/TrainingSession";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

/** All sync helpers swallow errors — calendar issues must never break the API. */

const DEFAULT_DURATION_MIN = 90;

interface ResolvedHost {
  ownerId: string;
  refreshToken: string;
  attendeeEmails: string[];
}

/** Pick whose calendar the event lives on (the conductor) and collect every
 *  enrolled user's email so they receive an invite. */
async function resolveHost(sessionId: string): Promise<ResolvedHost | null> {
  try {
    const ts = await TrainingSession.findById(sessionId).lean();
    if (!ts) return null;

    const conductor = await User.findById(ts.conductedBy)
      .select("+googleRefreshToken googleEmail email")
      .lean();
    if (!conductor?.googleRefreshToken) return null;

    const enrolledIds = (ts.enrollments ?? []).map((e) => e.user).filter(Boolean);
    const enrollees = enrolledIds.length
      ? await User.find({ _id: { $in: enrolledIds } }).select("googleEmail email").lean()
      : [];

    const attendees = new Set<string>();
    for (const u of enrollees) {
      const email = u.googleEmail || u.email;
      if (!email) continue;
      // Skip the conductor — they're the host, not an attendee.
      if (String(u._id) === String(conductor._id)) continue;
      attendees.add(email.toLowerCase());
    }

    return {
      ownerId: String(conductor._id),
      refreshToken: conductor.googleRefreshToken,
      attendeeEmails: [...attendees],
    };
  } catch {
    return null;
  }
}

/** Compute event start/end. Honour the session's endDate if set; otherwise
 *  fall back to a 90-minute slot. */
function eventTimes(start: Date, end?: Date): { start: Date; end: Date } {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(s.getTime() + DEFAULT_DURATION_MIN * 60_000);
  return { start: s, end: e };
}

function buildSummary(title: string, status: string): string {
  const prefix = status === "cancelled" ? "❌ "
    : status === "completed" ? "✅ "
    : status === "ongoing"   ? "▶️ "
    : "🎓 ";
  return `${prefix}${title}`;
}

function buildDescription(ts: {
  description?: string;
  topics?: string[];
  venue?: string;
  district?: string;
  facilitators?: string;
  language?: string;
}): string {
  return [
    ts.description || "",
    ts.topics?.length ? `Topics: ${ts.topics.join(", ")}` : "",
    ts.venue ? `Venue: ${ts.venue}${ts.district ? ` · ${ts.district}` : ""}` : "",
    ts.facilitators ? `Co-facilitators: ${ts.facilitators}` : "",
    ts.language ? `Language: ${ts.language}` : "",
    "",
    "Enroll / manage at https://app.janmanindia.org/training",
  ].filter(Boolean).join("\n");
}

/** Push a brand-new training session to the conductor's Google Calendar.
 *  Skips silently if the conductor hasn't connected Google. */
export async function syncTrainingCreate(sessionId: string): Promise<void> {
  try {
    const ts = await TrainingSession.findById(sessionId).lean();
    if (!ts) return;
    const host = await resolveHost(sessionId);
    if (!host) return;

    const { start, end } = eventTimes(ts.date, ts.endDate);
    const eventId = await createEvent(host.refreshToken, {
      summary: buildSummary(ts.title, ts.status),
      description: buildDescription(ts),
      location: [ts.venue, ts.district].filter(Boolean).join(", "),
      start, end,
      attendeeEmails: host.attendeeEmails.length > 0 ? host.attendeeEmails : undefined,
    });

    if (eventId) {
      await TrainingSession.updateOne(
        { _id: sessionId },
        { $set: { googleEventId: eventId, googleEventOwner: host.ownerId } },
      );
    }
  } catch (err) {
    console.error("syncTrainingCreate failed:", err);
  }
}

/** Patch the synced event in place (title, status, venue, attendee list). */
export async function syncTrainingUpdate(sessionId: string): Promise<void> {
  try {
    const ts = await TrainingSession.findById(sessionId).lean();
    if (!ts) return;

    if (!ts.googleEventId || !ts.googleEventOwner) {
      // Wasn't synced before — try a fresh create now (e.g. conductor just
      // connected Google).
      await syncTrainingCreate(sessionId);
      return;
    }

    const owner = await User.findById(ts.googleEventOwner).select("+googleRefreshToken").lean();
    if (!owner?.googleRefreshToken) return;

    // Refresh attendees so newly enrolled users get the invite and dropped
    // ones fall off the event.
    const enrolledIds = (ts.enrollments ?? []).map((e) => e.user).filter(Boolean);
    const enrollees = enrolledIds.length
      ? await User.find({ _id: { $in: enrolledIds } }).select("googleEmail email").lean()
      : [];
    const attendees = Array.from(new Set(
      enrollees
        .filter((u) => String(u._id) !== String(ts.googleEventOwner))
        .map((u) => (u.googleEmail || u.email || "").toLowerCase())
        .filter(Boolean),
    ));

    const { start, end } = eventTimes(ts.date, ts.endDate);
    await updateEvent(owner.googleRefreshToken, ts.googleEventId, {
      summary: buildSummary(ts.title, ts.status),
      description: buildDescription(ts),
      location: [ts.venue, ts.district].filter(Boolean).join(", "),
      start, end,
      attendeeEmails: attendees,
    });
  } catch (err) {
    console.error("syncTrainingUpdate failed:", err);
  }
}

export async function syncTrainingDelete(sessionId: string): Promise<void> {
  try {
    const ts = await TrainingSession.findById(sessionId).lean();
    if (!ts?.googleEventId || !ts.googleEventOwner) return;
    const owner = await User.findById(ts.googleEventOwner).select("+googleRefreshToken").lean();
    if (!owner?.googleRefreshToken) return;
    await deleteEvent(owner.googleRefreshToken, ts.googleEventId);
    await TrainingSession.updateOne(
      { _id: sessionId },
      { $unset: { googleEventId: "", googleEventOwner: "" } },
    );
  } catch (err) {
    console.error("syncTrainingDelete failed:", err);
  }
}
