import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";

/** POST /api/chat/conversations/[id]/read — mark all messages in a conversation as read. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);

    const conv = await Conversation.findOne({ _id: id, participants: me }).select("_id").lean();
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await Message.updateMany(
      { conversation: id, sender: { $ne: me }, readBy: { $ne: me } },
      { $addToSet: { readBy: me } }
    );

    return NextResponse.json({ marked: result.modifiedCount });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
