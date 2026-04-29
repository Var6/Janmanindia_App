import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Appointment from "@/models/Appointment";
import User from "@/models/User";
import mongoose from "mongoose";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

const DEFAULT_DURATION_MIN = 30;

/** Best-effort: push a new appointment to the requester's Google Calendar (if they
 *  connected). Saves the eventId on the appointment so we can update/delete it
 *  later. Always swallows errors — calendar sync should never block the API. */
async function syncToGoogleCalendar(
  appointmentId: string,
  requesterId: string,
  requesteeId: string,
  start: Date,
  end: Date,
  reason: string,
  coAttendeeIds: string[] = [],
): Promise<void> {
  try {
    const ids = [requesterId, requesteeId, ...coAttendeeIds];
    const users = await User.find({ _id: { $in: ids } })
      .select("+googleRefreshToken googleEmail name email")
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const requester = byId.get(requesterId);
    if (!requester?.googleRefreshToken) return; // not connected — silently skip

    const attendees = new Set<string>();
    for (const id of [requesteeId, ...coAttendeeIds]) {
      if (id === requesterId) continue;
      const u = byId.get(id);
      const email = u?.googleEmail || u?.email;
      if (email) attendees.add(email.toLowerCase());
    }

    const requestee = byId.get(requesteeId);
    const eventId = await createEvent(requester.googleRefreshToken, {
      summary: `Janman: ${reason || "Appointment"}`,
      description: `Appointment with ${requestee?.name ?? "team member"}${coAttendeeIds.length ? ` + ${coAttendeeIds.length} other${coAttendeeIds.length === 1 ? "" : "s"}` : ""}\n\nManage at https://app.janmanindia.org/appointments`,
      start, end,
      attendeeEmails: attendees.size > 0 ? [...attendees] : undefined,
    });
    if (eventId) {
      await Appointment.updateOne({ _id: appointmentId }, { $set: { googleEventId: eventId } });
    }
  } catch (err) {
    console.error("syncToGoogleCalendar failed:", err);
  }
}

/** Update the existing Google Calendar event (used on reschedule). */
async function updateGoogleCalendar(appointmentId: string, requesterId: string, start: Date, end: Date): Promise<void> {
  try {
    const apt = await Appointment.findById(appointmentId).select("googleEventId").lean();
    if (!apt?.googleEventId) return;
    const requester = await User.findById(requesterId).select("+googleRefreshToken").lean();
    if (!requester?.googleRefreshToken) return;
    await updateEvent(requester.googleRefreshToken, apt.googleEventId, { start, end });
  } catch (err) {
    console.error("updateGoogleCalendar failed:", err);
  }
}

/** Delete the Google Calendar event (used on cancel). */
async function deleteGoogleCalendar(appointmentId: string, requesterId: string): Promise<void> {
  try {
    const apt = await Appointment.findById(appointmentId).select("googleEventId").lean();
    if (!apt?.googleEventId) return;
    const requester = await User.findById(requesterId).select("+googleRefreshToken").lean();
    if (!requester?.googleRefreshToken) return;
    await deleteEvent(requester.googleRefreshToken, apt.googleEventId);
    await Appointment.updateOne({ _id: appointmentId }, { $unset: { googleEventId: "" } });
  } catch (err) {
    console.error("deleteGoogleCalendar failed:", err);
  }
}

/**
 * Returns true if the given user already has an accepted/pending appointment
 * overlapping the [start, end) window. Used so booking is blocked when either
 * party is busy.
 */
async function hasConflict(userId: string, start: Date, end: Date): Promise<boolean> {
  const oid = new mongoose.Types.ObjectId(userId);
  const blockingStatuses = ["pending", "confirmed", "pending_sw", "approved_sw", "confirmed_litigation"];
  const fallbackStart = new Date(start.getTime() - DEFAULT_DURATION_MIN * 60_000);

  const conflict = await Appointment.findOne({
    status: { $in: blockingStatuses },
    $and: [
      {
        $or: [
          { requester: oid }, { requestee: oid }, { coAttendees: oid },
          { community: oid }, { socialWorker: oid }, { litigationMember: oid },
        ],
      },
      // existing.start < new.end AND existing.end (or fallback) > new.start
      { proposedDate: { $lt: end } },
      {
        $or: [
          { endDate: { $gt: start } },
          { endDate: { $exists: false }, proposedDate: { $gt: fallbackStart } },
        ],
      },
    ],
  }).select("_id").lean();

  return Boolean(conflict);
}

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const oid = new mongoose.Types.ObjectId(session.id);
    const filter: Record<string, unknown> = ["director", "superadmin"].includes(session.role)
      ? {}
      : {
          $or: [
            { requester: oid }, { requestee: oid }, { coAttendees: oid },
            { community: oid }, { socialWorker: oid }, { litigationMember: oid },
          ],
        };

    const appointments = await Appointment.find(filter)
      .sort({ proposedDate: 1 })
      .populate("community",        "name email phone role")
      .populate("socialWorker",     "name email role")
      .populate("litigationMember", "name email role")
      .populate("requester",        "name email role")
      .populate("requestee",        "name email role")
      .populate("coAttendees",      "name email role")
      .lean();

    return NextResponse.json({ appointments });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/appointments", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST creates an appointment. Two flows:
 *  1. Direct (any role): { requesteeId, proposedDate, endDate?, reason } →
 *     status "pending"; recipient confirms via PATCH `respond`.
 *  2. Legacy community → SW: { socialWorkerId, proposedDate, reason } →
 *     status "pending_sw"; SW approves, then routes to a lawyer.
 *
 * In both cases we verify the time slot is free for the requester AND the recipient.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const body = await request.json();

    const proposedDate = body.proposedDate ? new Date(body.proposedDate) : null;
    if (!proposedDate || isNaN(proposedDate.getTime())) {
      return NextResponse.json({ error: "proposedDate is required" }, { status: 400 });
    }
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date(proposedDate.getTime() + DEFAULT_DURATION_MIN * 60_000);
    const reason = String(body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const requesteeId = body.requesteeId as string | undefined;
    const legacySwId  = body.socialWorkerId as string | undefined;
    // Optional additional invitees — they ride along on the same appointment
    // record so it shows up on their calendars and on /appointments.
    const rawCoAttendees = Array.isArray(body.coAttendeeIds) ? body.coAttendeeIds as unknown[] : [];

    if (requesteeId) {
      if (!mongoose.Types.ObjectId.isValid(requesteeId)) {
        return NextResponse.json({ error: "requesteeId is not a valid id" }, { status: 400 });
      }
      if (requesteeId === session.id) {
        return NextResponse.json({ error: "You can't book an appointment with yourself" }, { status: 400 });
      }

      // Validate + dedupe co-attendees: drop the requester / requestee / dups
      // / invalid ids without erroring, so the form can pass everyone the user
      // ticked and we'll just keep the unique ones.
      const seen = new Set<string>([session.id, requesteeId]);
      const coAttendeeIds: string[] = [];
      for (const raw of rawCoAttendees) {
        if (typeof raw !== "string" || !mongoose.Types.ObjectId.isValid(raw)) continue;
        if (seen.has(raw)) continue;
        seen.add(raw);
        coAttendeeIds.push(raw);
      }

      if (await hasConflict(session.id, proposedDate, endDate)) {
        return NextResponse.json({ error: "You already have an appointment in that time window." }, { status: 409 });
      }
      if (await hasConflict(requesteeId, proposedDate, endDate)) {
        return NextResponse.json({ error: "The other person is busy in that time window. Pick another slot." }, { status: 409 });
      }
      // Soft-check co-attendees — flag the first conflict but don't block,
      // since group meetings can legitimately overlap something else for
      // some attendees. Surface the busy person's name so the requester
      // can decide whether to reschedule.
      for (const id of coAttendeeIds) {
        if (await hasConflict(id, proposedDate, endDate)) {
          const u = await User.findById(id).select("name").lean();
          return NextResponse.json({
            error: `${u?.name ?? "A co-attendee"} is busy in that time window. Pick another slot or remove them.`,
          }, { status: 409 });
        }
      }

      const appointment = await Appointment.create({
        requester: session.id,
        requestee: requesteeId,
        coAttendees: coAttendeeIds,
        proposedDate, endDate, reason,
        status: "pending",
      });
      void syncToGoogleCalendar(
        String(appointment._id),
        session.id,
        requesteeId,
        proposedDate, endDate, reason,
        coAttendeeIds,
      );
      return NextResponse.json({ appointment }, { status: 201 });
    }

    // Legacy community flow
    if (session.role !== "community" || !legacySwId) {
      return NextResponse.json({ error: "requesteeId is required" }, { status: 400 });
    }
    if (await hasConflict(session.id, proposedDate, endDate)) {
      return NextResponse.json({ error: "You already have an appointment in that time window." }, { status: 409 });
    }
    if (await hasConflict(legacySwId, proposedDate, endDate)) {
      return NextResponse.json({ error: "The social worker is busy in that time window. Pick another slot." }, { status: 409 });
    }

    const appointment = await Appointment.create({
      community: session.id,
      socialWorker: legacySwId,
      requester: session.id,
      requestee: legacySwId,
      proposedDate, endDate, reason,
      status: "pending_sw",
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/appointments", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const body = await request.json();
    const { appointmentId, action, litigationMemberId, notes, decision, proposedDate, endDate } = body as {
      appointmentId: string;
      action: "approve_sw" | "reject_sw" | "confirm_litigation" | "reject_litigation" | "respond" | "cancel" | "reschedule";
      litigationMemberId?: string;
      notes?: string;
      decision?: "approve" | "reject";
      proposedDate?: string;
      endDate?: string;
    };

    if (!appointmentId || !action) {
      return NextResponse.json({ error: "appointmentId and action are required" }, { status: 400 });
    }

    const apt = await Appointment.findById(appointmentId);
    if (!apt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    if (action === "reschedule") {
      // Either party (requester or requestee) may propose a new time. The
      // appointment goes back to "pending" so the other side must accept.
      const isParty =
        String(apt.requester ?? "") === session.id ||
        String(apt.requestee ?? "") === session.id ||
        String(apt.community ?? "") === session.id ||
        String(apt.socialWorker ?? "") === session.id ||
        String(apt.litigationMember ?? "") === session.id;
      if (!isParty) return NextResponse.json({ error: "Only the requester or recipient can reschedule" }, { status: 403 });
      if (!proposedDate) return NextResponse.json({ error: "proposedDate is required" }, { status: 400 });
      const newStart = new Date(proposedDate);
      if (isNaN(newStart.getTime())) return NextResponse.json({ error: "Invalid proposedDate" }, { status: 400 });
      apt.proposedDate = newStart;
      apt.endDate = endDate ? new Date(endDate) : new Date(newStart.getTime() + DEFAULT_DURATION_MIN * 60_000);
      apt.status = "pending";
      if (notes) apt.responseNotes = notes;
      await apt.save();
      const reqId = apt.requester ? String(apt.requester) : (apt.community ? String(apt.community) : "");
      if (reqId) void updateGoogleCalendar(String(apt._id), reqId, apt.proposedDate, apt.endDate ?? new Date(apt.proposedDate.getTime() + DEFAULT_DURATION_MIN * 60_000));
      return NextResponse.json({ appointment: apt });
    }

    if (action === "respond") {
      if (String(apt.requestee) !== session.id) {
        return NextResponse.json({ error: "Only the recipient can respond" }, { status: 403 });
      }
      apt.status = decision === "approve" ? "confirmed" : "rejected";
      if (notes) apt.responseNotes = notes;
      await apt.save();
      return NextResponse.json({ appointment: apt });
    }

    if (action === "cancel") {
      const isRequester = String(apt.requester ?? "") === session.id || String(apt.community ?? "") === session.id;
      if (!isRequester) return NextResponse.json({ error: "Only the requester can cancel" }, { status: 403 });
      apt.status = "cancelled";
      await apt.save();
      const reqId = apt.requester ? String(apt.requester) : (apt.community ? String(apt.community) : "");
      if (reqId) void deleteGoogleCalendar(String(apt._id), reqId);
      return NextResponse.json({ appointment: apt });
    }

    if (action === "approve_sw" || action === "reject_sw") {
      if (session.role !== "socialworker" || String(apt.socialWorker) !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      apt.status = action === "approve_sw" ? "approved_sw" : "rejected";
      if (litigationMemberId) apt.litigationMember = new mongoose.Types.ObjectId(litigationMemberId);
      if (notes) apt.swNotes = notes;
      await apt.save();
      return NextResponse.json({ appointment: apt });
    }

    if (action === "confirm_litigation" || action === "reject_litigation") {
      if (session.role !== "litigation" || String(apt.litigationMember) !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      apt.status = action === "confirm_litigation" ? "confirmed_litigation" : "rejected";
      if (notes) apt.litigationNotes = notes;
      await apt.save();
      return NextResponse.json({ appointment: apt });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/appointments", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
