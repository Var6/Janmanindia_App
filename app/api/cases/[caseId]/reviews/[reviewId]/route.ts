import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import CaseReview, { isReviewLocked } from "@/models/CaseReview";

type Params = { params: Promise<{ caseId: string; reviewId: string }> };

/** Edit a review — only the author, only within 24h of submission. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId, reviewId } = await params;
    await connectDB();

    const review = await CaseReview.findOne({ _id: reviewId, case: caseId });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (String(review.author) !== session.id) {
      return NextResponse.json({ error: "You can only edit your own review." }, { status: 403 });
    }
    if (isReviewLocked(review.createdAt)) {
      return NextResponse.json({ error: "This review is locked — reviews can't be edited more than 24 hours after submission." }, { status: 423 });
    }

    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Review text is required." }, { status: 400 });

    review.text = text;
    await review.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Delete a review — only the author, only within 24h of submission. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId, reviewId } = await params;
    await connectDB();

    const review = await CaseReview.findOne({ _id: reviewId, case: caseId });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (String(review.author) !== session.id) {
      return NextResponse.json({ error: "You can only delete your own review." }, { status: 403 });
    }
    if (isReviewLocked(review.createdAt)) {
      return NextResponse.json({ error: "This review is locked — reviews can't be deleted more than 24 hours after submission." }, { status: 423 });
    }

    await CaseReview.deleteOne({ _id: reviewId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
