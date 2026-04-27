import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import VoiceMessage from "@/models/VoiceMessage";
import mongoose from "mongoose";

const STAFF_ROLES = ["socialworker", "hr", "director", "superadmin"];

/** PATCH /api/community/voice-message/[id] — staff marks heard or adds response. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!STAFF_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const { action, responseNote } = await req.json() as {
      action: "heard" | "responded";
      responseNote?: string;
    };
    await connectDB();
    const vm = await VoiceMessage.findById(id);
    if (!vm) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "heard") {
      vm.status   = "heard";
      vm.heardBy  = new mongoose.Types.ObjectId(session.id);
      vm.heardAt  = new Date();
    } else if (action === "responded") {
      vm.status       = "responded";
      vm.heardBy      = vm.heardBy ?? new mongoose.Types.ObjectId(session.id);
      vm.heardAt      = vm.heardAt ?? new Date();
      vm.responseNote = responseNote?.trim() || vm.responseNote;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    await vm.save();
    return NextResponse.json({ voiceMessage: vm });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/community/voice-message/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
