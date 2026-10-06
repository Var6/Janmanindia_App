import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, BadRequest } from "@/lib/insights/api";
import { fixDistrictSpelling } from "@/lib/insights/quality";

/** POST { check: "district_spelling" } — apply the one safe bulk fix:
 *  rewrite district spellings to the standard name (logged on each case). */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/quality/fix", async (session) => {
    const body = await readJson(req);
    if (body.check !== "district_spelling") throw new BadRequest("Only the district spelling fix can be applied in bulk");
    const changed = await fixDistrictSpelling({ id: session.id, role: session.role });
    return NextResponse.json({ ok: true, changed });
  });
}
