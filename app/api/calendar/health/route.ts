import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { checkCalendarHealth } from "@/lib/gcal";

/** GET /api/calendar/health — director / superadmin only. Verifies that the
 *  Google Calendar service account is configured and can actually write to the
 *  configured calendar (creates + deletes a throwaway event). */
export async function GET() {
  try {
    const session = await requireSession();
    if (!["director", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await checkCalendarHealth();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, configured: false, detail: "Server error" }, { status: 500 });
  }
}
