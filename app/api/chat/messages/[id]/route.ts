import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Message from "@/models/Message";

/** PATCH /api/chat/messages/[id] — edit own message. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Too long" }, { status: 400 });

    await connectDB();
    const msg = await Message.findById(id);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.sender) !== session.id) {
      return NextResponse.json({ error: "Only the sender can edit" }, { status: 403 });
    }

    msg.text = text;
    msg.editedAt = new Date();
    await msg.save();

    const populated = await msg.populate("sender", "name role");
    return NextResponse.json({ message: populated });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/chat/messages/[id] — sender removes their own message. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const msg = await Message.findById(id);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.sender) !== session.id) {
      return NextResponse.json({ error: "Only the sender can delete" }, { status: 403 });
    }
    await msg.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
