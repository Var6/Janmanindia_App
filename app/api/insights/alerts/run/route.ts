import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { runDueAlerts } from "@/lib/insights/alerts";

/**
 * Daily cron (vercel.json): runs every enabled alert that is due today.
 * Authenticated with `Authorization: Bearer <CRON_SECRET>`, like the other
 * cron routes in this app.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const result = await runDueAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("GET /api/insights/alerts/run", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
