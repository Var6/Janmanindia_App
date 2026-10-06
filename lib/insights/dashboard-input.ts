import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { BadRequest, str } from "@/lib/insights/api";
import type { DashboardFilter, DashboardTab, DashboardTile } from "@/models/InsightDashboard";

/** Validates dashboard tabs / tiles / filters from request JSON. */
export function cleanTabs(raw: unknown): DashboardTab[] {
  if (!Array.isArray(raw)) throw new BadRequest("tabs must be a list");
  if (raw.length === 0) throw new BadRequest("A dashboard needs at least one tab");
  return raw.slice(0, 12).map((t) => {
    const tab = (t ?? {}) as Record<string, unknown>;
    const tiles = Array.isArray(tab.tiles) ? tab.tiles : [];
    return {
      id: str(tab.id, 60) ?? randomUUID(),
      title: str(tab.title, 60) ?? "Tab",
      tiles: tiles.slice(0, 40).map((x): DashboardTile => {
        const tile = (x ?? {}) as Record<string, unknown>;
        const kind = tile.kind;
        if (kind !== "chart" && kind !== "kpi" && kind !== "text") throw new BadRequest("Tile kind must be chart, kpi or text");
        const refId = kind === "text" ? undefined : String(tile.refId ?? "");
        if (refId !== undefined && !mongoose.Types.ObjectId.isValid(refId)) throw new BadRequest("Tile is missing its chart or KPI");
        return {
          id: str(tile.id, 60) ?? randomUUID(),
          kind,
          refId,
          text: kind === "text" ? (typeof tile.text === "string" ? tile.text.slice(0, 4000) : "") : undefined,
          w: clamp(Number(tile.w) || (kind === "kpi" ? 4 : 6), 2, 12),
          h: clamp(Number(tile.h) || (kind === "text" ? 1 : 3), 1, 6),
        };
      }),
    };
  });
}

export function cleanDashboardFilters(raw: unknown): DashboardFilter[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new BadRequest("filters must be a list");
  return raw.slice(0, 6).map((f) => {
    const x = (f ?? {}) as Record<string, unknown>;
    const field = str(x.field, 40);
    if (!field || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)) throw new BadRequest("Bad filter field");
    return { field, label: str(x.label, 60) ?? field };
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
