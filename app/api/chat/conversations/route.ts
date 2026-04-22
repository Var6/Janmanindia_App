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

/** POST /api/chat/conversations — open or create a DM with another user.
 *  Body: { peerId } */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    const body = await req.json();
    const { peerId } = body as { peerId?: string };
    if (!peerId || !mongoose.Types.ObjectId.isValid(peerId)) {
      return NextResponse.json({ error: "Valid peerId required" }, { status: 400 });
    }
    if (peerId === session.id) {
      return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
    }

    await connectDB();
    const peer = await User.findById(peerId).select("role isActive").lean();
    if (!peer || !peer.isActive) {
      return NextResponse.json({ error: "Peer not found or inactive" }, { status: 404 });
    }
    if (!canDirectMessage(session.role, peer.role)) {
      return NextResponse.json({
        error: "Direct chat not permitted between these roles. Community members can only DM their social worker.",
      }, { status: 403 });
    }

    const me = new mongoose.Types.ObjectId(session.id);
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
