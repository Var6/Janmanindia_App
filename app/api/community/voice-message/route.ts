import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import VoiceMessage from "@/models/VoiceMessage";
import "@/models/User";

const STAFF_ROLES = ["socialworker", "hr", "director", "superadmin"];

/** POST /api/community/voice-message — community member submits a recording. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "community") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { audioUrl, durationSec, message } = await req.json() as {
      audioUrl?: string; durationSec?: number; message?: string;
    };
    if (!audioUrl) {
      return NextResponse.json({ error: "audioUrl is required" }, { status: 400 });
    }
    await connectDB();
    const vm = await VoiceMessage.create({
      from: session.id,
      fromName: session.name,
      audioUrl,
      durationSec: durationSec ?? undefined,
      message: message?.trim() || undefined,
    });
    return NextResponse.json({ voiceMessage: vm }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/community/voice-message", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET /api/community/voice-message
 *  - community: own messages only
 *  - staff: all messages (filter by ?status=new|heard|responded)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};

    if (session.role === "community") {
      filter.from = session.id;
    } else if (STAFF_ROLES.includes(session.role)) {
      const status = searchParams.get("status");
      if (status) filter.status = status;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await VoiceMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ messages });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
