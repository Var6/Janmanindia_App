import mongoose from "mongoose";
import User from "@/models/User";
import Case from "@/models/Case";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

/**
 * Hearing-date → Google Calendar sync for cases.
 *
 * Unlike the old service-account approach (one shared org calendar, attendees
 * silently stripped), this mirrors the activity/training sync: the event lives
 * on ONE team member's personal calendar (the "owner"), and EVERY other person
 * on the matter — all litigation members, the social worker, the community
 * member — is added as an attendee. Because google-calendar.ts sends invites
 * with `sendUpdates: "all"`, the hearing lands on each person's own calendar.
 *
 * All helpers swallow errors — a calendar hiccup must never break a case save.
 */

interface HostResolution {
  ownerId: mongoose.Types.ObjectId;
  refreshToken: string;
  attendeeEmails: string[];
}

/** Collect everyone on the matter (all advocates + social worker + community +
 *  creator), pick the first who has connected Google as the calendar owner, and
 *  return every other person's email as an attendee. */
async function resolveHost(caseDoc: {
  litigationMember?: mongoose.Types.ObjectId;
  litigationMembers?: mongoose.Types.ObjectId[];
  socialWorker?: mongoose.Types.ObjectId;
  community?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}): Promise<HostResolution | null> {
  try {
    // Preference order for who hosts the event. Advocates first (they run the
    // hearing), then social worker, community, and finally the creator.
    const advocates = caseDoc.litigationMembers?.length
      ? caseDoc.litigationMembers
      : caseDoc.litigationMember
        ? [caseDoc.litigationMember]
        : [];
    const orderedIds = [
      ...advocates,
      caseDoc.socialWorker,
      caseDoc.community,
      caseDoc.createdBy,
    ].filter((id): id is mongoose.Types.ObjectId => Boolean(id));

    // De-dupe while preserving order (a person can hold two roles on a case).
    const uniqueIds: mongoose.Types.ObjectId[] = [];
    const seen = new Set<string>();
    for (const id of orderedIds) {
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueIds.push(id);
    }
    if (uniqueIds.length === 0) return null;

    const users = await User.find({ _id: { $in: uniqueIds } })
      .select("+googleRefreshToken googleEmail email")
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    // Owner = first person (in preference order) who has connected Google.
    let owner: { _id: mongoose.Types.ObjectId; refreshToken: string } | null = null;
    for (const id of uniqueIds) {
      const u = byId.get(String(id));
      if (u?.googleRefreshToken) {
        owner = { _id: id, refreshToken: u.googleRefreshToken };
        break;
      }
    }
    if (!owner) return null; // nobody connected — nothing to sync to

    // Everyone except the owner becomes an attendee, invited by email.
    const attendees = new Set<string>();
    for (const id of uniqueIds) {
      if (String(id) === String(owner._id)) continue;
      const u = byId.get(String(id));
      const email = u?.googleEmail || u?.email;
      if (email) attendees.add(email.toLowerCase());
    }

    return { ownerId: owner._id, refreshToken: owner.refreshToken, attendeeEmails: [...attendees] };
  } catch {
    return null;
  }
}

/** One-hour hearing slot starting at the stored date/time. */
function hearingTimes(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start, end };
}

/**
 * Create or update the hearing event for a case. Call this whenever the hearing
 * date changes OR the people on the case change (so newly added advocates get
 * the invite). Safe to call repeatedly.
 */
export async function syncCaseHearing(caseId: string): Promise<void> {
  try {
    const c = await Case.findById(caseId).lean();
    if (!c) return;

    // No hearing date → make sure no stale event lingers, then stop.
    if (!c.nextHearingDate) {
      if (c.googleCalendarEventId && c.googleEventOwner) await removeCaseHearing(caseId);
      return;
    }

    const host = await resolveHost(c);
    if (!host) return; // nobody has connected Google — silently skip

    const { start, end } = hearingTimes(new Date(c.nextHearingDate));
    const summary = `⚖️ Hearing: ${c.caseTitle}`;
    const description = [
      `Case #${c.caseNumber}`,
      "",
      "Manage at https://app.janmanindia.org/litigation",
    ].join("\n");

    // If a prior event exists AND it's hosted on the same owner's calendar, patch
    // it in place. Otherwise create a fresh one (covers first-time sync and the
    // migration off the old shared service-account calendar, whose ids we can't
    // patch with a user token).
    const sameOwner =
      c.googleEventOwner && String(c.googleEventOwner) === String(host.ownerId);

    if (c.googleCalendarEventId && sameOwner) {
      const ok = await updateEvent(host.refreshToken, c.googleCalendarEventId, {
        summary,
        description,
        start,
        end,
        attendeeEmails: host.attendeeEmails,
      });
      if (ok) return;
      // Patch failed (event deleted in Google, owner revoked access, …) — fall
      // through and create a new one.
    }

    // Best-effort cleanup of any previous event before creating a replacement,
    // so we don't leave a duplicate on the old owner's calendar.
    if (c.googleCalendarEventId && c.googleEventOwner) {
      await removeCaseHearing(caseId).catch(() => {});
    }

    const eventId = await createEvent(host.refreshToken, {
      summary,
      description,
      start,
      end,
      attendeeEmails: host.attendeeEmails.length > 0 ? host.attendeeEmails : undefined,
    });

    if (eventId) {
      await Case.updateOne(
        { _id: caseId },
        { $set: { googleCalendarEventId: eventId, googleEventOwner: host.ownerId } }
      );
    }
  } catch (err) {
    console.error("syncCaseHearing failed:", err);
  }
}

/** Delete the hearing event (on disposal/withdrawal/close, or case delete). */
export async function removeCaseHearing(caseId: string): Promise<void> {
  try {
    const c = await Case.findById(caseId).lean();
    if (!c?.googleCalendarEventId) return;

    // The event lives on the owner's calendar — delete with their token.
    if (c.googleEventOwner) {
      const owner = await User.findById(c.googleEventOwner).select("+googleRefreshToken").lean();
      if (owner?.googleRefreshToken) {
        await deleteEvent(owner.googleRefreshToken, c.googleCalendarEventId);
      }
    }

    await Case.updateOne(
      { _id: caseId },
      { $unset: { googleCalendarEventId: "", googleEventOwner: "" } }
    );
  } catch (err) {
    console.error("removeCaseHearing failed:", err);
  }
}
