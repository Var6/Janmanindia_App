import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";

type Params = { params: Promise<{ caseId: string }> };

/**
 * Pinned-on-the-graph "cheatcode" comments — strategy notes the team
 * leaves on a case so anyone reading later (or themselves a month later)
 * sees the one or two facts that make the matter winnable.
 *
 * Permission model — different from the rest of the case API:
 *   - READ:   any session with access to the case (handled by GET /api/cases/[caseId])
 *   - CREATE: any session with access (community member, SW, lawyer) — encourages
 *             cross-role notes ("SW saw landlord intimidation on visit")
 *   - EDIT/DELETE: only the original author of the comment / reply
 *   - REPLY: any session with access
 *
 * Wire format — single PATCH endpoint with an op discriminator. Saves
 * routing four endpoints for what is conceptually one resource.
 *
 *   { op: "add",        text, pinned? }
 *   { op: "edit",       commentId, text }
 *   { op: "delete",     commentId }
 *   { op: "reply",      commentId, text }
 *   { op: "editReply",  commentId, replyId, text }
 *   { op: "deleteReply",commentId, replyId }
 *   { op: "togglePin",  commentId }      — only the author can change pin state
 */

async function checkCaseAccess(caseId: string, session: { id: string; role: string }) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  const c = await Case.findById(caseId)
    .select("community litigationMember litigationMembers socialWorker createdBy isPrivate")
    .lean();
  if (!c) return null;

  // Private case → only its creator may read/write notes.
  if ((c as { isPrivate?: boolean }).isPrivate) {
    return String((c as { createdBy?: unknown }).createdBy ?? "") === session.id ? c : null;
  }

  const communityId = String(c.community ?? "");
  const lmId = String(c.litigationMember ?? "");
  const swId = String(c.socialWorker ?? "");
  const sharedIds = (c.litigationMembers ?? []).map(String);

  const ok =
    session.role === "superadmin" ||
    session.role === "director" ||
    (session.role === "community" && communityId === session.id) ||
    (session.role === "litigation" && (lmId === session.id || sharedIds.includes(session.id))) ||
    (session.role === "socialworker" && swId === session.id);

  return ok ? c : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const c = await checkCaseAccess(caseId, session);
    if (!c) return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });

    const body = await request.json();
    const op = String(body.op ?? "").trim();
    if (!op) return NextResponse.json({ error: "op is required" }, { status: 400 });

    // Author display name — cached on the comment so deleted users still
    // render. Fetch once when the op writes a new author.
    let myName = session.name ?? "";
    if ((op === "add" || op === "reply") && !myName) {
      const u = await User.findById(session.id).select("name").lean();
      myName = u?.name ?? "Unknown";
    }

    if (op === "add") {
      const text = String(body.text ?? "").trim();
      if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
      const newComment = {
        _id: new mongoose.Types.ObjectId(),
        text: text.slice(0, 2000),
        by: new mongoose.Types.ObjectId(session.id),
        byName: myName,
        byRole: session.role,
        pinned: Boolean(body.pinned),
        createdAt: new Date(),
        replies: [],
      };
      await Case.updateOne({ _id: caseId }, { $push: { caseComments: newComment } });
      return NextResponse.json({ comment: newComment });
    }

    const commentId = String(body.commentId ?? "");
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    if (op === "edit" || op === "delete" || op === "togglePin") {
      // Author-only ops — load the comment, verify authorship, then mutate.
      const caseDoc = await Case.findOne(
        { _id: caseId, "caseComments._id": commentId },
        { "caseComments.$": 1 }
      ).lean();
      const comment = caseDoc?.caseComments?.[0];
      if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      if (String(comment.by) !== session.id) {
        return NextResponse.json({ error: "Only the author can edit / delete / pin this comment" }, { status: 403 });
      }

      if (op === "delete") {
        await Case.updateOne({ _id: caseId }, { $pull: { caseComments: { _id: commentId } } });
        return NextResponse.json({ ok: true });
      }
      if (op === "edit") {
        const text = String(body.text ?? "").trim();
        if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
        await Case.updateOne(
          { _id: caseId, "caseComments._id": commentId },
          { $set: {
            "caseComments.$.text": text.slice(0, 2000),
            "caseComments.$.editedAt": new Date(),
          }}
        );
        return NextResponse.json({ ok: true });
      }
      // togglePin
      await Case.updateOne(
        { _id: caseId, "caseComments._id": commentId },
        { $set: { "caseComments.$.pinned": !comment.pinned } }
      );
      return NextResponse.json({ ok: true, pinned: !comment.pinned });
    }

    if (op === "reply") {
      const text = String(body.text ?? "").trim();
      if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
      const reply = {
        _id: new mongoose.Types.ObjectId(),
        text: text.slice(0, 2000),
        by: new mongoose.Types.ObjectId(session.id),
        byName: myName,
        byRole: session.role,
        createdAt: new Date(),
      };
      await Case.updateOne(
        { _id: caseId, "caseComments._id": commentId },
        { $push: { "caseComments.$.replies": reply } }
      );
      return NextResponse.json({ reply });
    }

    if (op === "editReply" || op === "deleteReply") {
      const replyId = String(body.replyId ?? "");
      if (!replyId || !mongoose.Types.ObjectId.isValid(replyId)) {
        return NextResponse.json({ error: "replyId is required" }, { status: 400 });
      }
      // Author check on the reply itself.
      const caseDoc = await Case.findOne(
        { _id: caseId, "caseComments._id": commentId },
        { "caseComments.$": 1 }
      ).lean();
      const comment = caseDoc?.caseComments?.[0];
      const reply = comment?.replies?.find(r => String(r._id) === replyId);
      if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      if (String(reply.by) !== session.id) {
        return NextResponse.json({ error: "Only the reply author can edit / delete it" }, { status: 403 });
      }

      if (op === "deleteReply") {
        await Case.updateOne(
          { _id: caseId, "caseComments._id": commentId },
          { $pull: { "caseComments.$.replies": { _id: replyId } } }
        );
        return NextResponse.json({ ok: true });
      }
      // editReply
      const text = String(body.text ?? "").trim();
      if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
      await Case.updateOne(
        { _id: caseId, "caseComments._id": commentId, "caseComments.replies._id": replyId },
        { $set: {
          "caseComments.$[c].replies.$[r].text": text.slice(0, 2000),
          "caseComments.$[c].replies.$[r].editedAt": new Date(),
        }},
        { arrayFilters: [{ "c._id": new mongoose.Types.ObjectId(commentId) }, { "r._id": new mongoose.Types.ObjectId(replyId) }] }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PATCH /api/cases/[caseId]/comments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
