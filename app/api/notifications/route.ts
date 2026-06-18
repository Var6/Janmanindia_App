import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Notification from "@/models/Notification";
import { runReviewOverdueCheck } from "@/lib/review-reminders";

const DIRECTOR_ROLES = ["director", "superadmin", "administrator"];

// Throttle the opportunistic overdue check so it runs at most once every 6h
// per server process (the bell polls frequently). A Vercel cron is the
// authoritative trigger; this is a best-effort backstop so it works without one.
let lastCheckAt = 0;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    if (DIRECTOR_ROLES.includes(session.role) && Date.now() - lastCheckAt > CHECK_INTERVAL_MS) {
      lastCheckAt = Date.now();
      try { await runReviewOverdueCheck(); } catch { /* never block the fetch */ }
    }

    const notifications = await Notification.find({ recipient: session.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unread = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        _id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unread,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Mark notifications read. Body: { ids: string[] } or { all: true }. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const body = await request.json().catch(() => ({}));

    if (body.all) {
      await Notification.updateMany({ recipient: session.id, read: false }, { read: true });
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: body.ids }, recipient: session.id },
        { read: true }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
