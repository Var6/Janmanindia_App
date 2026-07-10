import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { runDailyReportReminders, ESCALATION_ROLES } from "@/lib/daily-report";

/**
 * Trigger the daily-report reminder sweep (6pm "report due" + 3-day-miss
 * escalations). Two callers:
 *  - Vercel Cron at 18:00 IST — authenticates via `Authorization: Bearer <CRON_SECRET>`.
 *  - A logged-in director+ who wants to run it on demand.
 * Safe to call repeatedly — notifications are deduped per person per day.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  const session = await getSessionFromCookies();
  return Boolean(session && ESCALATION_ROLES.includes(session.role));
}

export async function POST(request: NextRequest) {
  try {
    if (!(await authorize(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const result = await runDailyReportReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Vercel cron uses GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
