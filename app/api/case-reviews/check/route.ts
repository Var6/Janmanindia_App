import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { runReviewOverdueCheck } from "@/lib/review-reminders";

const DIRECTOR_ROLES = ["director", "superadmin", "administrator"];

/**
 * Trigger the review-overdue check. Two callers:
 *  - Vercel Cron (daily) — authenticates via `Authorization: Bearer <CRON_SECRET>`.
 *  - A logged-in director/superadmin who wants to run it on demand.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  const session = await getSessionFromCookies();
  return Boolean(session && DIRECTOR_ROLES.includes(session.role));
}

export async function POST(request: NextRequest) {
  try {
    if (!(await authorize(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const created = await runReviewOverdueCheck();
    return NextResponse.json({ ok: true, notificationsCreated: created });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Vercel Cron issues GET requests — support both.
export async function GET(request: NextRequest) {
  return POST(request);
}
