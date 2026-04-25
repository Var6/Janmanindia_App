import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import TrainingSession from "@/models/TrainingSession";
import mongoose from "mongoose";

const SW_ROLES = ["socialworker", "director", "superadmin", "hr"];

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();

    const body = await request.json();
    const { action, status, highlights, attended } = body as {
      action?: "enroll" | "unenroll" | "update";
      status?: "scheduled" | "ongoing" | "completed" | "cancelled";
      highlights?: string;
      attended?: { userId: string; attended: boolean };
    };

    const trainingSession = await TrainingSession.findById(id);
    if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Enroll / unenroll — anyone signed in (community + staff)
    if (action === "enroll") {
      const already = trainingSession.enrollments.find(e => String(e.user) === session.id);
      if (!already) {
        if (trainingSession.enrollments.length >= trainingSession.capacity) {
          return NextResponse.json({ error: "Session is full" }, { status: 400 });
        }
        trainingSession.enrollments.push({
          user: new mongoose.Types.ObjectId(session.id),
          enrolledAt: new Date(),
        });
      }
      await trainingSession.save();
      return NextResponse.json({ ok: true, enrolled: true, count: trainingSession.enrollments.length });
    }
    if (action === "unenroll") {
      trainingSession.enrollments = trainingSession.enrollments.filter(e => String(e.user) !== session.id);
      await trainingSession.save();
      return NextResponse.json({ ok: true, enrolled: false, count: trainingSession.enrollments.length });
    }

    // SW-only mutations
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (status) trainingSession.status = status;
    if (typeof highlights === "string") trainingSession.highlights = highlights.trim();
    if (attended) {
      const enr = trainingSession.enrollments.find(e => String(e.user) === attended.userId);
      if (enr) enr.attended = attended.attended;
    }
    await trainingSession.save();
    return NextResponse.json({ session: trainingSession });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/training-sessions/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
