import { resolveDataset } from "@/lib/insights/query";
import type { FilterSpec, QuerySpec } from "@/lib/insights/types";

const PRESET: Record<string, string> = {
  last_30_days: "in the last 30 days", last_90_days: "in the last 90 days", last_6_months: "in the last 6 months",
  last_12_months: "in the last 12 months", this_month: "this month", this_fy: "this financial year", last_fy: "last financial year",
};

/** A query in plain words: "Count of cases by District, where Status is
 *  Pending, this financial year". Shown before Copilot runs a query and on
 *  custom-query alerts. Falls back gracefully on unknown fields. */
export async function describeQuery(spec: QuerySpec): Promise<string> {
  let ds;
  try { ds = await resolveDataset(spec.dataset); } catch { return `A query on "${spec.dataset}"`; }
  const label = (k: string) => ds.fields.find((f) => f.key === k)?.label ?? k;
  const unit = ds.unit.toLowerCase();
  const m = spec.measure;
  const measure =
    m.agg === "count" ? `Count of ${unit}`
    : m.agg === "countDistinct" ? `Number of different ${label(m.field ?? "").toLowerCase()}`
    : `${{ sum: "Total", avg: "Average", min: "Lowest", max: "Highest" }[m.agg] ?? m.agg} ${label(m.field ?? "").toLowerCase()}`;

  const parts = [measure];
  if (spec.groupBy?.length) parts.push(`by ${spec.groupBy.map(label).join(" and ")}`);
  if (spec.time) parts.push(`per ${spec.time.grain} of ${label(spec.time.field).toLowerCase()}`);
  const filters = (spec.filters ?? []).map((f) => describeFilter(f, label(f.field)));
  if (filters.length) parts.push(`where ${filters.join(", and ")}`);
  const r = spec.range;
  if (r?.preset && r.preset !== "all") {
    parts.push(r.preset === "custom" ? `from ${r.from?.slice(0, 10) ?? "the start"} to ${r.to?.slice(0, 10) ?? "today"}` : PRESET[r.preset] ?? r.preset);
  }
  return parts.join(", ").replace(", by ", " by ").replace(", per ", " per ");
}

function describeFilter(f: FilterSpec, label: string): string {
  const v = Array.isArray(f.value) ? f.value.map(String) : f.value === undefined || f.value === null ? [] : [String(f.value)];
  const day = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s);
  switch (f.op) {
    case "in": return `${label} is ${v.join(" or ")}`;
    case "nin": return `${label} is not ${v.join(" or ")}`;
    case "eq": return `${label} is ${v[0]}`;
    case "neq": return `${label} is not ${v[0]}`;
    case "gt": return `${label} is above ${day(v[0] ?? "")}`;
    case "gte": return `${label} is at least ${day(v[0] ?? "")}`;
    case "lt": return `${label} is below ${day(v[0] ?? "")}`;
    case "lte": return `${label} is at most ${day(v[0] ?? "")}`;
    case "isTrue": return `${label}: yes`;
    case "isFalse": return `${label}: no`;
    case "isSet": return `${label} is filled in`;
    case "isNotSet": return `${label} is empty`;
    default: return label;
  }
}
