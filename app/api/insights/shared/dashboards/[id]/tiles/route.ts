import { NextRequest, NextResponse } from "next/server";
import { viewerRoute, oid, notFound, readJson } from "@/lib/insights/api";
import { canSee } from "@/lib/insights/access";
import { computeTiles } from "@/lib/insights/tiles";
import { cleanFilters, cleanRange } from "@/lib/insights/validate";
import InsightDashboard from "@/models/InsightDashboard";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST { tabId, filters?, range? } — the data for one tab of a shared
 * dashboard. The tiles come from the saved dashboard, never from the
 * request, and only the dashboard's own filters can be used (each in its own
 * way: picked values, or a range), so a viewer cannot run any other query
 * through this route.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  return viewerRoute("POST /api/insights/shared/dashboards/[id]/tiles", async (session) => {
    const d = await InsightDashboard.findById(oid((await ctx.params).id)).lean();
    if (!d || !canSee(d, session)) return notFound();
    const body = await readJson<{ tabId?: unknown; filters?: unknown; range?: unknown }>(req);
    const tab = (d.tabs ?? []).find((t) => t.id === body.tabId) ?? d.tabs?.[0];
    if (!tab) return NextResponse.json({ tiles: {} });
    // Each dashboard filter allows one kind of condition on its own field:
    // picked values, or a from / to range for numbers and dates.
    const kinds = new Map((d.filters ?? []).map((f) => [f.field, f.type ?? "value"]));
    const filters = cleanFilters(body.filters).filter((f) => {
      const kind = kinds.get(f.field);
      return kind === "value" ? f.op === "in" : kind ? f.op === "gte" || f.op === "lte" : false;
    });
    const range = cleanRange(body.range);
    const tiles = await computeTiles(tab.tiles ?? [], { filters, range: range?.preset && range.preset !== "custom" ? { preset: range.preset } : undefined });
    return NextResponse.json({ tiles });
  });
}
