import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, BadRequest } from "@/lib/insights/api";
import { computeTiles, type TileRequest } from "@/lib/insights/tiles";
import { cleanFilters, cleanRange } from "@/lib/insights/validate";

/** POST /api/insights/tiles — { tiles, filters?, range? } → data per tile id. */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/tiles", async () => {
    const body = await readJson<{ tiles?: unknown; filters?: unknown; range?: unknown }>(req);
    if (!Array.isArray(body.tiles)) throw new BadRequest("tiles must be a list");
    const tiles: TileRequest[] = body.tiles.slice(0, 60).map((t) => {
      const x = (t ?? {}) as Record<string, unknown>;
      const kind = x.kind === "kpi" || x.kind === "text" ? x.kind : "chart";
      return { id: String(x.id ?? ""), kind, refId: typeof x.refId === "string" ? x.refId : undefined, text: typeof x.text === "string" ? x.text : undefined };
    });
    const data = await computeTiles(tiles, { filters: cleanFilters(body.filters), range: cleanRange(body.range) });
    return NextResponse.json({ tiles: data });
  });
}
