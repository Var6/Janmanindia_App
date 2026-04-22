import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

/** DELETE /api/chat/conversations/[id] — participant deletes the whole conversation + all its messages. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);
    const conv = await Conversation.findOne({ _id: id, participants: me });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await Message.deleteMany({ conversation: conv._id });
    await conv.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("conversation delete error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
