import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { runDueAlerts } from "@/lib/insights/alerts";
import { runDueImportSyncs } from "@/lib/insights/imports";

export const maxDuration = 60;

/**
 * The daily Insights cron (vercel.json, 09:00 IST). First it refreshes the
 * imported datasets that are due, then it runs every enabled alert that is
 * due today, so alerts see the fresh figures. Authenticated with
 * `Authorization: Bearer <CRON_SECRET>`, like the other cron routes.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const imports = await runDueImportSyncs().catch((e) => {
      console.error("insights import refresh failed", e);
      return { ran: 0, failed: 0, skipped: 0 };
    });
    const alerts = await runDueAlerts();
    return NextResponse.json({ ok: true, ...alerts, imports });
  } catch (e) {
    console.error("GET /api/insights/alerts/run", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
