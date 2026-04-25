import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import TrainingSession from "@/models/TrainingSession";

const SW_ROLES = ["socialworker", "director", "superadmin", "hr"];

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get("upcoming") === "true";
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (upcoming) {
      filter.date = { $gte: new Date() };
      filter.status = filter.status ?? { $in: ["scheduled", "ongoing"] };
    }

    const sessions = await TrainingSession.find(filter)
      .sort({ date: 1 })
      .populate("conductedBy", "name email")
      .populate("enrollments.user", "name email")
      .lean();

    return NextResponse.json({ sessions });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/training-sessions", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers / HR / director can create offline sessions" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { title, description, topics, venue, district, date, endDate, capacity, facilitators, targetAudience, language } = body as {
      title: string;
      description: string;
      topics?: string[] | string;
      venue: string;
      district?: string;
      date: string;
      endDate?: string;
      capacity?: number;
      facilitators?: string;
      targetAudience?: string;
      language?: string;
    };

    if (!title || !description || !venue || !date) {
      return NextResponse.json({ error: "title, description, venue, and date are required" }, { status: 400 });
    }

    const created = await TrainingSession.create({
      title: title.trim(),
      description: description.trim(),
      topics: Array.isArray(topics) ? topics : (topics ?? "").split(",").map(t => t.trim()).filter(Boolean),
      venue: venue.trim(),
      district: district?.trim(),
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      capacity: capacity ?? 30,
      conductedBy: session.id,
      facilitators: facilitators?.trim(),
      targetAudience: targetAudience?.trim(),
      language: language?.trim() || undefined,
    });

    return NextResponse.json({ session: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/training-sessions", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
