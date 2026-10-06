import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson } from "@/lib/insights/api";
import { loadTable, preview } from "@/lib/insights/imports";

/** POST { source, ref?, csv? } — read the data and suggest columns and types,
 *  without saving anything. */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/imports/preview", async () => {
    const body = await readJson(req);
    const table = await loadTable(String(body.source ?? ""), typeof body.ref === "string" ? body.ref : undefined, body.csv);
    return NextResponse.json(preview(table));
  });
}
