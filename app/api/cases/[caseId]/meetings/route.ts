import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import CaseReviewMeeting from "@/models/CaseReviewMeeting";

type Params = { params: Promise<{ caseId: string }> };

const PRIVILEGED = ["director", "superadmin", "administrator"];

/** View/write access for review meetings. Privileged roles, the assigned
 *  litigation member(s), the assigned social worker, and the case creator can
 *  all see and log meetings. A community owner can view their own case's log. */
async function resolveAccess(caseId: string, session: { id: string; role: string }) {
  const c = await Case.findById(caseId)
    .select("litigationMember litigationMembers socialWorker createdBy community")
    .lean();
  if (!c) return null;
  const lead = String(c.litigationMember ?? "");
  const shared = (c.litigationMembers ?? []).map(String);
  const swId = String(c.socialWorker ?? "");
  const communityId = String(c.community ?? "");
  const isCreator = String(c.createdBy ?? "") === session.id;
  const isAssignedLitigation = session.role === "litigation" && (lead === session.id || shared.includes(session.id));
  const isAssignedSW = session.role === "socialworker" && swId === session.id;
  const isPrivileged = PRIVILEGED.includes(session.role);
  const isCommunityOwner = session.role === "community" && communityId === session.id;
  const canWrite = isPrivileged || isAssignedLitigation || isAssignedSW || isCreator;
  return { canView: canWrite || isCommunityOwner, canWrite };
}

type SerInput = Record<string, unknown> & { _id: unknown; author: unknown };

function serialize(m: SerInput, sessionId: string, canWrite: boolean) {
  return {
    _id: String(m._id),
    date: m.date,
    author: String(m.author),
    authorName: m.authorName,
    authorRole: m.authorRole,
    attendees: m.attendees ?? [],
    summary: m.summary,
    objectives: m.objectives,
    nextDate: m.nextDate,
    actionItems: ((m.actionItems as Array<Record<string, unknown>>) ?? []).map((a) => ({
      _id: String(a._id),
      text: a.text,
      activity: a.activity ? String(a.activity) : undefined,
      activityTitle: a.activityTitle,
      outcome: a.outcome,
      done: Boolean(a.done),
    })),
    outcome: m.outcome,
    createdAt: m.createdAt,
    mine: String(m.author) === sessionId,
    canDelete: canWrite,
  };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const access = await resolveAccess(caseId, session);
    if (!access) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (!access.canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const meetings = await CaseReviewMeeting.find({ case: caseId }).sort({ date: -1 }).lean();
    return NextResponse.json({
      meetings: meetings.map((m) => serialize(m as unknown as SerInput, session.id, access.canWrite)),
      canWrite: access.canWrite,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/cases/[caseId]/meetings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const access = await resolveAccess(caseId, session);
    if (!access) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (!access.canWrite) {
      return NextResponse.json({ error: "You don't have access to log a meeting on this case." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    if (!summary) return NextResponse.json({ error: "A summary of what was decided is required." }, { status: 400 });

    const date = body.date ? new Date(body.date) : new Date();
    if (isNaN(date.getTime())) return NextResponse.json({ error: "Invalid meeting date." }, { status: 400 });
    const nextDate = body.nextDate ? new Date(body.nextDate) : undefined;

    const attendees = Array.isArray(body.attendees)
      ? body.attendees
          .map((a: { name?: unknown; role?: unknown; user?: unknown }) => ({
            name: typeof a.name === "string" ? a.name.trim() : "",
            role: typeof a.role === "string" ? a.role.trim() || undefined : undefined,
            user: typeof a.user === "string" && a.user ? a.user : undefined,
          }))
          .filter((a: { name: string }) => a.name)
      : [];

    const actionItems = Array.isArray(body.actionItems)
      ? body.actionItems
          .map((a: { text?: unknown; activity?: unknown; activityTitle?: unknown; outcome?: unknown }) => ({
            text: typeof a.text === "string" ? a.text.trim() : "",
            activity: typeof a.activity === "string" && a.activity ? a.activity : undefined,
            activityTitle: typeof a.activityTitle === "string" ? a.activityTitle.trim() || undefined : undefined,
            outcome: typeof a.outcome === "string" ? a.outcome.trim() || undefined : undefined,
            done: false,
          }))
          .filter((a: { text: string }) => a.text)
      : [];

    const me = await User.findById(session.id).select("name").lean();
    const meeting = await CaseReviewMeeting.create({
      case: caseId,
      date,
      author: session.id,
      authorName: me?.name,
      authorRole: session.role,
      attendees,
      summary,
      objectives: typeof body.objectives === "string" ? body.objectives.trim() || undefined : undefined,
      nextDate: nextDate && !isNaN(nextDate.getTime()) ? nextDate : undefined,
      actionItems,
      outcome: typeof body.outcome === "string" ? body.outcome.trim() || undefined : undefined,
    });

    const created = meeting.toObject();
    return NextResponse.json({ meeting: serialize(created as unknown as SerInput, session.id, true) }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/cases/[caseId]/meetings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
