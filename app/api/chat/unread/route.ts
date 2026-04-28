import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

/** GET /api/chat/unread — { total: number, byConversation: { [convId]: count } } */
export async function GET() {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ total: 0, byConversation: {} });
    }
    await connectDB();
    const me = new mongoose.Types.ObjectId(session.id);

    const convs = await Conversation.find({ participants: me }).select("_id").lean();
    if (convs.length === 0) return NextResponse.json({ total: 0, byConversation: {} });

    const convIds = convs.map((c) => c._id);

    const grouped = await Message.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: {
        conversation: { $in: convIds },
        sender: { $ne: me },
        readBy: { $ne: me },
      }},
      { $group: { _id: "$conversation", count: { $sum: 1 } } },
    ]);

    const byConversation: Record<string, number> = {};
    let total = 0;
    for (const g of grouped) {
      byConversation[String(g._id)] = g.count;
      total += g.count;
    }

    return NextResponse.json({ total, byConversation });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
