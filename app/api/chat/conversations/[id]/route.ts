import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

/** DELETE /api/chat/conversations/[id] — destroy a conversation + all its
 *  messages.
 *
 *  Permission model:
 *   - DM (1:1):  any participant may delete (mutual blast — the other side
 *                only had access via the same Conversation row).
 *   - Group:     ONLY the creator may delete. Members can't wipe out
 *                everyone else's history; leaving a group is a separate op. */
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

    if (conv.type === "group" && String(conv.createdBy) !== session.id) {
      return NextResponse.json(
        { error: "Only the group creator can delete the group. Leave the group instead." },
        { status: 403 }
      );
    }

    // Cascade: messages first so we never end up with orphans.
    await Message.deleteMany({ conversation: conv._id });
    await conv.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("conversation delete error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
