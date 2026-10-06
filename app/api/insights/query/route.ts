import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson } from "@/lib/insights/api";
import { runQuery } from "@/lib/insights/query";
import { cleanFilters, cleanQuery } from "@/lib/insights/validate";

/** POST /api/insights/query — run an unsaved query (chart builder preview,
 *  explore). Body: { query, filters? }. */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/query", async () => {
    const body = await readJson<{ query?: unknown; filters?: unknown }>(req);
    const result = await runQuery(cleanQuery(body.query), { extraFilters: cleanFilters(body.filters) });
    return NextResponse.json(result);
  });
}
