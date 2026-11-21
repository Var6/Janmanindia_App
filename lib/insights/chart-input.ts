import { BadRequest, num, str } from "@/lib/insights/api";
import { assertRunnable, cleanChartType, cleanQuery } from "@/lib/insights/validate";
import type { NumberFormat } from "@/lib/insights/types";

const FORMATS: NumberFormat[] = ["plain", "indian", "compact_indian", "percent", "currency"];

export async function cleanChartInput(body: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  if (!partial || body.title !== undefined) {
    const title = str(body.title, 140);
    if (!title) throw new BadRequest("Title is required");
    out.title = title;
  }
  if (body.description !== undefined) out.description = str(body.description, 500);
  if (!partial || body.chartType !== undefined) out.chartType = cleanChartType(body.chartType);
  if (!partial || body.query !== undefined) {
    const q = cleanQuery(body.query);
    await assertRunnable(q);
    out.query = q;
  }
  if (body.display !== undefined) {
    const d = (body.display ?? {}) as Record<string, unknown>;
    const display: Record<string, unknown> = {
      horizontal: d.horizontal === true,
      stacked: d.stacked === true,
      showValues: d.showValues !== false,
    };
    if (FORMATS.includes(d.numberFormat as NumberFormat)) display.numberFormat = d.numberFormat;
    const topN = num(d.topN);
    if (topN !== undefined) display.topN = Math.min(50, Math.max(2, Math.round(topN)));
    if (d.mapArea === "india" || d.mapArea === "bihar") display.mapArea = d.mapArea;
    out.display = display;
  }
  const type = out.chartType as string | undefined;
  const q = out.query as { groupBy?: string[]; time?: unknown } | undefined;
  if (type && q) {
    if (type === "line" && !q.time) throw new BadRequest("A line chart needs a time column");
    if ((type === "bar" || type === "pie" || type === "map") && !q.time && !(q.groupBy?.length)) throw new BadRequest("Pick a field to group by");
    if (type === "pivot" && (q.groupBy?.length ?? 0) + (q.time ? 1 : 0) < 2) throw new BadRequest("A pivot table needs two fields (rows and columns)");
  }
  return out;
}
