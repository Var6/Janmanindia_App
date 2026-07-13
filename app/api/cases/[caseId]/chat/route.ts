import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import Message from "@/models/Message";

type Params = { params: Promise<{ caseId: string }> };

/**
 * GET /api/cases/[caseId]/chat
 *
 * Returns the chat messages that have attached this case (Message.caseRef),
 * so the case detail page can show the discussion happening about it. Same
 * read access as the case itself.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId)
      .select("community litigationMember litigationMembers socialWorker createdBy isPrivate")
      .lean();
    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mirror the access control from GET /api/cases/[caseId].
    const communityId = String(caseDoc.community ?? "");
    const lmId = String(caseDoc.litigationMember ?? "");
    const swId = String(caseDoc.socialWorker ?? "");
    const creatorId = String(caseDoc.createdBy ?? "");
    const sharedIds = (caseDoc.litigationMembers ?? []).map(String);
    const isAssignedLitigation = session.role === "litigation"
      && (lmId === session.id || sharedIds.includes(session.id));
    const isCreator = creatorId !== "" && creatorId === session.id;

    const allowed = (caseDoc as { isPrivate?: boolean }).isPrivate
      ? isCreator
      : session.role === "superadmin" ||
      session.role === "director" ||
      session.role === "administrator" ||
      isCreator ||
      (session.role === "community" && communityId === session.id) ||
      isAssignedLitigation ||
      (session.role === "socialworker" && swId === session.id);

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const messages = await Message.find({ "caseRef.case": caseId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("conversation sender text audioUrl createdAt")
      .populate("sender", "name role")
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/cases/[caseId]/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
