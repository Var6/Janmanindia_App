import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import CaseReview, { isReviewLocked } from "@/models/CaseReview";

type Params = { params: Promise<{ caseId: string }> };

const PRIVILEGED = ["director", "superadmin", "administrator"];

/** Privileged roles see every review; an assigned litigation member or the
 *  case creator can see (and the litigation member write) reviews. */
async function resolveAccess(caseId: string, session: { id: string; role: string }) {
  const c = await Case.findById(caseId).select("litigationMember litigationMembers createdBy isPrivate").lean();
  if (!c) return null;
  // Private case → only its creator has any access.
  if ((c as { isPrivate?: boolean }).isPrivate && String(c.createdBy ?? "") !== session.id) {
    return { canView: false, isAssignedLitigation: false, isPrivileged: false };
  }
  const lead = String(c.litigationMember ?? "");
  const shared = (c.litigationMembers ?? []).map(String);
  const isCreator = String(c.createdBy ?? "") === session.id;
  const isAssignedLitigation = session.role === "litigation" && (lead === session.id || shared.includes(session.id));
  const isPrivileged = PRIVILEGED.includes(session.role);
  return { canView: isPrivileged || isAssignedLitigation || isCreator, isAssignedLitigation, isPrivileged };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const access = await resolveAccess(caseId, session);
    if (!access) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (!access.canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const reviews = await CaseReview.find({ case: caseId }).sort({ createdAt: -1 }).lean();
    const out = reviews.map((r) => ({
      _id: String(r._id),
      text: r.text,
      author: String(r.author),
      authorName: r.authorName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      locked: isReviewLocked(r.createdAt),
      mine: String(r.author) === session.id,
    }));
    return NextResponse.json({ reviews: out, canWrite: access.isAssignedLitigation });
  } catch (error) {
    if (error instanceof Response) return error;
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
    if (!access.isAssignedLitigation) {
      return NextResponse.json({ error: "Only the assigned litigation member can write a review." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Review text is required." }, { status: 400 });

    const me = await User.findById(session.id).select("name").lean();
    const review = await CaseReview.create({
      case: caseId,
      author: session.id,
      authorName: me?.name,
      text,
    });

    return NextResponse.json({
      review: {
        _id: String(review._id),
        text: review.text,
        author: String(review.author),
        authorName: review.authorName,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        locked: false,
        mine: true,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
