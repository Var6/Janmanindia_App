import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import CaseReviewMeeting from "@/models/CaseReviewMeeting";

type Params = { params: Promise<{ caseId: string; meetingId: string }> };

const PRIVILEGED = ["director", "superadmin", "administrator"];

/** Author of the meeting or a privileged role may edit/delete it. */
async function canMutate(caseId: string, session: { id: string; role: string }, authorId: string) {
  if (PRIVILEGED.includes(session.role)) return true;
  if (authorId === session.id) return true;
  // Assigned litigation lead/shared can also tidy up the case log.
  const c = await Case.findById(caseId).select("litigationMember litigationMembers createdBy").lean();
  if (!c) return false;
  if (String(c.createdBy ?? "") === session.id) return true;
  const lead = String(c.litigationMember ?? "");
  const shared = (c.litigationMembers ?? []).map(String);
  return session.role === "litigation" && (lead === session.id || shared.includes(session.id));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId, meetingId } = await params;
    await connectDB();

    const meeting = await CaseReviewMeeting.findOne({ _id: meetingId, case: caseId });
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    if (!(await canMutate(caseId, session, String(meeting.author)))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    if (typeof body.outcome === "string") meeting.outcome = body.outcome.trim() || undefined;
    if (typeof body.objectives === "string") meeting.objectives = body.objectives.trim() || undefined;

    // Toggle / annotate a single action item.
    if (body.actionItemId) {
      const item = meeting.actionItems.find(
        (a) => String((a as unknown as { _id?: unknown })._id) === String(body.actionItemId)
      );
      if (item) {
        if (typeof body.done === "boolean") item.done = body.done;
        if (typeof body.actionOutcome === "string") item.outcome = body.actionOutcome.trim() || undefined;
        meeting.markModified("actionItems");
      }
    }

    await meeting.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/cases/[caseId]/meetings/[meetingId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId, meetingId } = await params;
    await connectDB();

    const meeting = await CaseReviewMeeting.findOne({ _id: meetingId, case: caseId }).select("author");
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    if (!(await canMutate(caseId, session, String(meeting.author)))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await CaseReviewMeeting.deleteOne({ _id: meetingId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("DELETE /api/cases/[caseId]/meetings/[meetingId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
