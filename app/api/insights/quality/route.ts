import { NextRequest, NextResponse } from "next/server";
import { insightsRoute } from "@/lib/insights/api";
import { QUALITY_CHECKS, runAllQualityChecks, runQualityCheck } from "@/lib/insights/quality";

/** GET — every data-health check with counts and items;
 *  GET ?check=key — one check; GET ?list=1 — just the names. */
export async function GET(req: NextRequest) {
  return insightsRoute("GET /api/insights/quality", async () => {
    if (req.nextUrl.searchParams.get("list") === "1") {
      return NextResponse.json({ checks: QUALITY_CHECKS.map((c) => ({ key: c.key, label: c.label, description: c.description, severity: c.severity })) });
    }
    const key = req.nextUrl.searchParams.get("check");
    if (key) {
      if (!QUALITY_CHECKS.some((c) => c.key === key)) return NextResponse.json({ error: "Unknown check" }, { status: 400 });
      return NextResponse.json({ check: await runQualityCheck(key) });
    }
    return NextResponse.json({ checks: await runAllQualityChecks() });
  });
}
