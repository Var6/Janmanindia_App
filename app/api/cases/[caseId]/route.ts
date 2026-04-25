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
      .populate("community", "name email phone")
      .populate("litigationMember", "name email")
      .populate("socialWorker", "name email")
      .lean();

    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Access control
    const communityId = String(caseDoc.community?._id ?? caseDoc.community);
    const lmId = String(caseDoc.litigationMember?._id ?? caseDoc.litigationMember ?? "");
    const swId = String(caseDoc.socialWorker?._id ?? caseDoc.socialWorker ?? "");

    const allowed =
      session.role === "superadmin" ||
      session.role === "director" ||
      (session.role === "community" && communityId === session.id) ||
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
    const pushOps: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    if (body.diaryEntry) {
      pushOps.caseDiary = {
        date: new Date(body.diaryEntry.date),
        findings: body.diaryEntry.findings,
        writtenBy: session.id,
      };
      delete update.diaryEntry;
    }

    // Document upload routed by category. Empty/general → documents[];
    // criminal-path categories → relevant criminal sub-doc; high-court step
    // names → highCourtPath.<step>.{filed, filedAt, doc}.
    if (body.addDocument) {
      const { label, url, category } = body.addDocument as { label: string; url: string; category?: string };
      if (!label || !url) {
        return NextResponse.json({ error: "addDocument.label and addDocument.url are required" }, { status: 400 });
      }
      const docPayload = {
        label,
        url,
        uploadedBy: session.id,
        uploadedAt: new Date(),
        ocrStatus: "pending" as const,
      };
      const cat = (category ?? "general").toLowerCase();
      if (cat === "general" || !cat) {
        pushOps.documents = docPayload;
      } else if (cat === "fir") {
        update["criminalPath.firFiled"] = true;
        update["criminalPath.firDoc"] = docPayload;
      } else if (cat === "charge") {
        update["criminalPath.chargesFramed"] = true;
        pushOps["criminalPath.chargeDocs"] = docPayload;
      } else if (cat === "cognizance") {
        update["criminalPath.cognizanceOrderDoc"] = docPayload;
      } else if (cat === "evidence") {
        pushOps["criminalPath.trial.evidenceDocs"] = docPayload;
      } else if (cat === "forensic") {
        pushOps["criminalPath.trial.forensicDocs"] = docPayload;
      } else if (["petitionfiled", "supportingaffidavit", "admission", "counteraffidavit", "rejoinder", "pleaclose", "inducement"].includes(cat)) {
        const stepKey = cat === "petitionfiled"        ? "petitionFiled"
                      : cat === "supportingaffidavit"  ? "supportingAffidavit"
                      : cat === "counteraffidavit"     ? "counterAffidavit"
                      : cat === "pleaclose"            ? "pleaClose"
                      : cat;
        update[`highCourtPath.${stepKey}.filed`]   = true;
        update[`highCourtPath.${stepKey}.filedAt`] = new Date();
        update[`highCourtPath.${stepKey}.doc`]     = docPayload;
      } else {
        pushOps.documents = docPayload;
      }
    }

    if (Object.keys(pushOps).length > 0) update["$push"] = pushOps;

    const updated = await Case.findByIdAndUpdate(caseId, update, { new: true });

    // Sync Google Calendar on nextHearingDate change
    if (body.nextHearingDate && updated) {
      try {
        const lmUser = await User.findById(updated.litigationMember).lean();
        const communityUser = await User.findById(updated.community).lean();
        const swUser = updated.socialWorker
          ? await User.findById(updated.socialWorker).lean()
          : null;

        const attendees = [lmUser?.email, communityUser?.email, swUser?.email].filter(
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
