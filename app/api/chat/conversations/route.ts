import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { canDirectMessage } from "@/lib/chat-permissions";

/** GET /api/chat/conversations — list all conversations the user participates in. */
export async function GET() {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ conversations: [] });
    }
    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);
    const conversations = await Conversation.find({ participants: me })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate("participants", "name role employeeId avatarUrl")
      .lean();
    return NextResponse.json({ conversations });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/chat/conversations — open or create a conversation.
 *  DM:    { peerId }
 *  Group: { participantIds: string[], title?: string }
 *  Groups always include the caller, ignore duplicates, and allow 2+
 *  total members (3+ recommended). Each pairwise role combo must be a
 *  legal DM under canDirectMessage so we don't bypass the role gating
 *  the DM endpoint enforces today. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    const body = await req.json();
    const { peerId, participantIds, title } = body as {
      peerId?: string;
      participantIds?: string[];
      title?: string;
    };

    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);

    // Group path. Must precede DM path because a group payload could also
    // include a single participantId; only fall back to DM when no
    // participantIds[] was sent at all. Community accounts can never
    // create groups — they're DM-only with their assigned social worker.
    if (Array.isArray(participantIds)) {
      if (session.role === "community") {
        return NextResponse.json({ error: "Community accounts cannot create group chats" }, { status: 403 });
      }
      const cleaned = Array.from(new Set(
        participantIds
          .filter((id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
          .filter((id) => id !== session.id)
      ));
      if (cleaned.length === 0) {
        return NextResponse.json({ error: "Pick at least one other person" }, { status: 400 });
      }

      const peers = await User.find({ _id: { $in: cleaned }, isActive: true }).select("role").lean();
      if (peers.length !== cleaned.length) {
        return NextResponse.json({ error: "One or more selected users are inactive or missing" }, { status: 400 });
      }
      for (const p of peers) {
        if (!canDirectMessage(session.role, p.role)) {
          return NextResponse.json({
            error: `Group chat not permitted with role "${p.role}".`,
          }, { status: 403 });
        }
      }

      const trimmedTitle = (title ?? "").trim().slice(0, 80);

      // 2-person groups still go through the group path (different surface
      // semantics from a DM): we don't reuse the DM dedupe lookup here.
      // Larger groups likewise always create a fresh conversation —
      // duplicate "groups" between the same set of people are intentional
      // (e.g. case-X group vs case-Y group with overlapping members).
      const allParticipants = [me, ...cleaned.map((id) => new mongoose.Types.ObjectId(id))];

      const conversation = await Conversation.create({
        type: "group",
        participants: allParticipants,
        title: trimmedTitle || undefined,
        createdBy: me,
      });
      const populated = await conversation.populate("participants", "name role employeeId");
      return NextResponse.json({ conversation: populated });
    }

    // DM path (legacy single-peer body).
    if (!peerId || !mongoose.Types.ObjectId.isValid(peerId)) {
      return NextResponse.json({ error: "Valid peerId required" }, { status: 400 });
    }
    if (peerId === session.id) {
      return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
    }

    const peer = await User.findById(peerId).select("role isActive").lean();
    if (!peer || !peer.isActive) {
      return NextResponse.json({ error: "Peer not found or inactive" }, { status: 404 });
    }
    if (!canDirectMessage(session.role, peer.role)) {
      return NextResponse.json({
        error: "Direct chat not permitted between these roles. Community members can only DM their social worker.",
      }, { status: 403 });
    }

    const them = new mongoose.Types.ObjectId(peerId);
    const sortedPair = [me, them].sort((a, b) => a.toString().localeCompare(b.toString()));

    let conversation = await Conversation.findOne({
      type: "dm",
      participants: { $all: sortedPair, $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        type: "dm",
        participants: sortedPair,
        createdBy: me,
      });
    }

    const populated = await conversation.populate("participants", "name role employeeId");
    return NextResponse.json({ conversation: populated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("conversation create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
