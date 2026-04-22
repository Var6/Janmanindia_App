import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

/** GET /api/chat/conversations/[id]/messages?after=<iso>&limit=200
 *  Returns messages newer than `after` (for polling) or the most recent N if no after. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ messages: [] });
    }
    await connectDB();

    const me = new mongoose.Types.ObjectId(session.id);
    const conv = await Conversation.findOne({ _id: id, participants: me }).lean();
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const after = searchParams.get("after");
    const limitRaw = parseInt(searchParams.get("limit") ?? "200", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 500);

    const filter: Record<string, unknown> = { conversation: new mongoose.Types.ObjectId(id) };
    if (after) {
      const dt = new Date(after);
      if (!isNaN(dt.getTime())) filter.createdAt = { $gt: dt };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: after ? 1 : -1 })
      .limit(limit)
      .populate("sender", "name role")
      .lean();

    // When loading initial page (no `after`), return chronological for easy render
    const ordered = after ? messages : messages.reverse();
    return NextResponse.json({ messages: ordered });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/chat/conversations/[id]/messages — send a message. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Too long" }, { status: 400 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);
    const conv = await Conversation.findOne({ _id: id, participants: me });
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const msg = await Message.create({
      conversation: conv._id,
      sender: me,
      text,
      readBy: [me],
    });

    conv.lastMessageAt = new Date();
    conv.lastMessagePreview = text.slice(0, 200);
    await conv.save();

    const populated = await msg.populate("sender", "name role");
    return NextResponse.json({ message: populated }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("message send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
