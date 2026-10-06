import { BadRequest, num, str } from "@/lib/insights/api";
import { resolveDataset } from "@/lib/insights/query";
import { GRAINS, KPI_TYPES, type Grain, type KpiType, type NumberFormat } from "@/lib/insights/types";

const FORMATS: NumberFormat[] = ["plain", "indian", "compact_indian", "percent", "currency"];

/** Validates the editable KPI fields from a request body. `partial` = PATCH. */
export async function cleanKpiInput(body: Record<string, unknown>, datasetKey: string, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = str(body.name, 120);
    if (!name) throw new BadRequest("Name is required");
    out.name = name;
  }
  if (has("description")) out.description = str(body.description, 500);

  if (!partial || has("timeField")) {
    const ds = await resolveDataset(datasetKey);
    const f = ds.fields.find((x) => x.key === body.timeField);
    if (!f || f.type !== "date") throw new BadRequest("Pick a date field for the KPI's time column");
    out.timeField = f.key;
  }
  if (!partial || has("grain")) {
    const g = (body.grain ?? "month") as Grain;
    if (!GRAINS.includes(g)) throw new BadRequest("Unknown time grain");
    out.grain = g;
  }
  if (has("cumulative")) out.cumulative = body.cumulative === true;

  if (!partial || has("target")) {
    const t = num(body.target);
    if (t === undefined) throw new BadRequest("Target must be a number");
    out.target = t;
  }
  if (has("direction")) {
    if (body.direction !== "higher" && body.direction !== "lower") throw new BadRequest("Direction must be higher or lower");
    out.direction = body.direction;
  }
  for (const k of ["onTrackPct", "attentionPct"] as const) {
    if (has(k)) {
      const v = num(body[k]);
      if (v === undefined || v < 0 || v > 1000) throw new BadRequest(`${k} must be between 0 and 1000`);
      out[k] = v;
    }
  }
  const onTrack = (out.onTrackPct ?? body.onTrackPct) as number | undefined;
  const attention = (out.attentionPct ?? body.attentionPct) as number | undefined;
  if (onTrack !== undefined && attention !== undefined && attention > onTrack) {
    throw new BadRequest("The 'needs attention' threshold must be below the 'on track' threshold");
  }
  if (has("kpiType")) {
    if (!KPI_TYPES.includes(body.kpiType as KpiType)) throw new BadRequest("KPI type must be input, output, outcome or impact");
    out.kpiType = body.kpiType;
  }
  if (has("programTags")) {
    if (!Array.isArray(body.programTags)) throw new BadRequest("programTags must be a list");
    out.programTags = [...new Set(body.programTags.map((t) => String(t).trim()).filter(Boolean).map((t) => t.slice(0, 40)))].slice(0, 10);
  }
  if (has("numberFormat")) {
    if (!FORMATS.includes(body.numberFormat as NumberFormat)) throw new BadRequest("Unknown number format");
    out.numberFormat = body.numberFormat;
  }
  if (has("decimals")) out.decimals = Math.min(4, Math.max(0, Math.round(num(body.decimals) ?? 0)));
  if (has("prefix")) out.prefix = str(body.prefix, 8);
  if (has("suffix")) out.suffix = str(body.suffix, 12);
  return out;
}
