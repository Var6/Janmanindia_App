import { NextResponse } from "next/server";

/**
 * Daily-report reminders have been retired in favour of the monthly report
 * workflow. This endpoint is intentionally a no-op (kept so any stale cron or
 * bookmark resolves cleanly instead of 404-ing). It never creates notifications.
 */
export async function POST() {
  return NextResponse.json({ ok: true, disabled: "daily-report reminders retired" });
}

export async function GET() {
  return NextResponse.json({ ok: true, disabled: "daily-report reminders retired" });
}
