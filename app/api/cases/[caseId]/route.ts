import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/gcal";

type Params = { params: Promise<{ caseId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId)
      .populate("citizen", "name email phone")
      .populate("litigationMember", "name email")
      .populate("socialWorker", "name email")
      .lean();

    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Access control
    const citizenId = String(caseDoc.citizen?._id ?? caseDoc.citizen);
    const lmId = String(caseDoc.litigationMember?._id ?? caseDoc.litigationMember ?? "");
    const swId = String(caseDoc.socialWorker?._id ?? caseDoc.socialWorker ?? "");

    const allowed =
      session.role === "superadmin" ||
      session.role === "director" ||
      (session.role === "community" && citizenId === session.id) ||
      (session.role === "litigation" && lmId === session.id) ||
      (session.role === "socialworker" && swId === session.id);

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ case: caseDoc });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!["litigation", "director", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session.role === "litigation" && String(caseDoc.litigationMember) !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ["status", "nextHearingDate", "caseTitle", "criminalPath", "highCourtPath"];
    const update: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    // Handle diary entry via this route
    if (body.diaryEntry) {
      update["$push"] = {
        caseDiary: {
          date: new Date(body.diaryEntry.date),
          findings: body.diaryEntry.findings,
          writtenBy: session.id,
        },
      };
      delete update.diaryEntry;
    }

    const updated = await Case.findByIdAndUpdate(caseId, update, { new: true });

    // Sync Google Calendar on nextHearingDate change
    if (body.nextHearingDate && updated) {
      try {
        const lmUser = await User.findById(updated.litigationMember).lean();
        const citizenUser = await User.findById(updated.citizen).lean();
        const swUser = updated.socialWorker
          ? await User.findById(updated.socialWorker).lean()
          : null;

        const attendees = [lmUser?.email, citizenUser?.email, swUser?.email].filter(
          Boolean
        ) as string[];

        const hearingDate = new Date(body.nextHearingDate);

        if (updated.googleCalendarEventId) {
          await updateCalendarEvent(updated.googleCalendarEventId, {
            startDateTime: hearingDate,
            attendeeEmails: attendees,
          });
        }
      } catch (calErr) {
        console.error("Calendar sync error:", calErr);
      }
    }

    // Delete calendar event on case close/dismiss
    if ((body.status === "Closed" || body.status === "Dismissed") && caseDoc.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(caseDoc.googleCalendarEventId);
        await Case.updateOne({ _id: caseId }, { $unset: { googleCalendarEventId: 1 } });
      } catch (calErr) {
        console.error("Calendar delete error:", calErr);
      }
    }

    return NextResponse.json({ case: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!["director", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (caseDoc.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(caseDoc.googleCalendarEventId);
      } catch {
        // Non-fatal
      }
    }

    await Case.deleteOne({ _id: caseId });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
