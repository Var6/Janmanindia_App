import mongoose from "mongoose";
import User from "@/models/User";
import Project from "@/models/Project";
import InsightImport from "@/models/InsightImport";
import InsightImportRow from "@/models/InsightImportRow";
import { DATASETS, getStaticDataset, type DatasetDef, type FieldDef } from "@/lib/insights/datasets";
import {
  AGGS, FILTER_OPS, GRAINS,
  type FilterSpec, type FilterValue, type QueryResult, type QueryRow, type QuerySpec, type RangeSpec,
} from "@/lib/insights/types";

/**
 * Turns a QuerySpec (dataset + measure + filters + group-by + time grain) into
 * a MongoDB aggregation and runs it.
 *
 * Every name in the spec is checked against the dataset registry, and every
 * filter value is coerced to a plain string / number / boolean / Date /
 * ObjectId, so a spec sent from the browser cannot inject operators or reach
 * fields that are not registered.
 */

export class InsightQueryError extends Error {}

const TZ = "Asia/Kolkata";
const MAX_GROUPS = 1000;
const DEFAULT_LIMIT = 200;

/* ------------------------------------------------------------------ */
/* Dataset resolution (static registry + imported datasets)            */
/* ------------------------------------------------------------------ */

export const IMPORT_PREFIX = "import:";

export async function resolveDataset(key: string): Promise<DatasetDef> {
  const found = getStaticDataset(key);
  if (found) return found;
  if (key.startsWith(IMPORT_PREFIX)) {
    const id = key.slice(IMPORT_PREFIX.length);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new InsightQueryError("Unknown dataset");
    const imp = await InsightImport.findById(id).lean();
    if (!imp) throw new InsightQueryError("Unknown dataset");
    return importDataset(imp);
  }
  throw new InsightQueryError(`Unknown dataset "${key}"`);
}

type ImportLike = {
  _id: unknown;
  name: string;
  description?: string;
  columns: { key: string; label: string; type: "string" | "number" | "date" | "boolean"; isDistrict?: boolean }[];
};

export function importDataset(imp: ImportLike): DatasetDef {
  const firstDate = imp.columns.find((c) => c.type === "date");
  const importId = new mongoose.Types.ObjectId(String(imp._id));
  return {
    key: `${IMPORT_PREFIX}${String(imp._id)}`,
    label: imp.name,
    description: imp.description ?? "Imported data",
    unit: "Rows",
    model: () => InsightImportRow,
    baseMatch: { importId },
    defaultDate: firstDate?.key ?? "importedAt",
    fields: [
      ...imp.columns.map<FieldDef>((c) => ({
        key: c.key,
        label: c.label,
        type: c.type,
        expr: `$data.${c.key}`,
        dimension: c.type !== "number" && c.type !== "date",
        measurable: c.type === "number",
      })),
      { key: "importedAt", label: "Imported", type: "date", expr: "$createdAt" },
    ],
  };
}

export async function listDatasets(): Promise<DatasetDef[]> {
  const imports = await InsightImport.find({}).sort({ createdAt: -1 }).lean();
  return [...DATASETS, ...imports.map((i) => importDataset(i as unknown as ImportLike))];
}

/* ------------------------------------------------------------------ */
/* Date ranges                                                         */
/* ------------------------------------------------------------------ */

/** Start of the Indian financial year (1 April) that contains `d`. */
function fyStart(d: Date): Date {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(Date.UTC(y, 3, 1) - 5.5 * 3600 * 1000); // 00:00 IST
}

export function resolveRange(range: RangeSpec | undefined, now = new Date()): { from?: Date; to?: Date } {
  if (!range || !range.preset || range.preset === "all") {
    if (range?.from || range?.to) return customRange(range);
    return {};
  }
  const day = 24 * 3600 * 1000;
  switch (range.preset) {
    case "last_30_days": return { from: new Date(now.getTime() - 30 * day), to: now };
    case "last_90_days": return { from: new Date(now.getTime() - 90 * day), to: now };
    case "last_6_months": { const f = new Date(now); f.setMonth(f.getMonth() - 6); return { from: f, to: now }; }
    case "last_12_months": { const f = new Date(now); f.setMonth(f.getMonth() - 12); return { from: f, to: now }; }
    case "this_month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "this_fy": return { from: fyStart(now), to: now };
    case "last_fy": {
      const thisStart = fyStart(now);
      const lastStart = fyStart(new Date(thisStart.getTime() - day));
      return { from: lastStart, to: new Date(thisStart.getTime() - 1) };
    }
    case "custom": return customRange(range);
    default: return {};
  }
}

function customRange(range: RangeSpec): { from?: Date; to?: Date } {
  const out: { from?: Date; to?: Date } = {};
  if (range.from) { const d = new Date(range.from); if (!isNaN(d.getTime())) out.from = d; }
  if (range.to) {
    const d = new Date(range.to);
    if (!isNaN(d.getTime())) {
      // A bare date ("2026-07-23") means the whole of that day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(range.to)) d.setUTCHours(23, 59, 59, 999);
      out.to = d;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function fieldOf(ds: DatasetDef, key: unknown, what: string): FieldDef {
  if (typeof key !== "string") throw new InsightQueryError(`${what}: field missing`);
  const f = ds.fields.find((x) => x.key === key);
  if (!f) throw new InsightQueryError(`${what}: "${key}" is not a field of ${ds.label}`);
  return f;
}

function coerce(field: FieldDef, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") throw new InsightQueryError(`Bad filter value for ${field.label}`);
  if (field.lookup) {
    const s = String(v);
    if (!mongoose.Types.ObjectId.isValid(s)) throw new InsightQueryError(`Bad id in filter on ${field.label}`);
    return new mongoose.Types.ObjectId(s);
  }
  switch (field.type) {
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new InsightQueryError(`${field.label} needs a number`);
      return n;
    }
    case "date": {
      const d = new Date(String(v));
      if (isNaN(d.getTime())) throw new InsightQueryError(`${field.label} needs a date`);
      return d;
    }
    case "boolean":
      return v === true || v === "true" || v === "Yes";
    default:
      return String(v).slice(0, 200);
  }
}

/** Filter → aggregation expression over the projected `f_<key>` field. */
function filterExpr(ds: DatasetDef, f: FilterSpec): Record<string, unknown> {
  if (!FILTER_OPS.includes(f.op)) throw new InsightQueryError(`Unknown filter operator "${String(f.op)}"`);
  const field = fieldOf(ds, f.field, "Filter");
  const ref = `$f_${field.key}`;

  if (f.op === "isTrue") return { $eq: [ref, true] };
  if (f.op === "isFalse") return { $ne: [ref, true] };
  if (f.op === "isSet") return field.multi ? { $gt: [{ $size: { $ifNull: [ref, []] } }, 0] } : { $ne: [{ $ifNull: [ref, null] }, null] };
  if (f.op === "isNotSet") return field.multi ? { $eq: [{ $size: { $ifNull: [ref, []] } }, 0] } : { $eq: [{ $ifNull: [ref, null] }, null] };

  if (f.op === "in" || f.op === "nin") {
    const raw = Array.isArray(f.value) ? f.value : [f.value as FilterValue];
    if (raw.length === 0) return { $literal: f.op === "nin" };
    const vals = raw.slice(0, 200).map((v) => coerce(field, v));
    const inExpr = field.multi
      ? { $gt: [{ $size: { $setIntersection: [{ $ifNull: [ref, []] }, vals] } }, 0] }
      : { $in: [ref, vals] };
    return f.op === "in" ? inExpr : { $not: [inExpr] };
  }

  const value = coerce(field, Array.isArray(f.value) ? f.value[0] : f.value);
  if (field.multi) {
    const has = { $in: [value, { $ifNull: [ref, []] }] };
    if (f.op === "eq") return has;
    if (f.op === "neq") return { $not: [has] };
    throw new InsightQueryError(`${field.label} only supports is / is not / in`);
  }
  const op = { eq: "$eq", neq: "$ne", gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte" }[f.op];
  const cmp = { [op]: [ref, value] };
  // null compares below every value in MongoDB; keep empty values out of < / <=.
  if (f.op === "lt" || f.op === "lte") return { $and: [{ $ne: [{ $ifNull: [ref, null] }, null] }, cmp] };
  return cmp;
}

/* ------------------------------------------------------------------ */
/* Running a query                                                     */
/* ------------------------------------------------------------------ */

export async function runQuery(spec: QuerySpec, opts: { extraFilters?: FilterSpec[]; now?: Date } = {}): Promise<QueryResult> {
  if (!spec || typeof spec !== "object") throw new InsightQueryError("Missing query");
  const ds = await resolveDataset(String(spec.dataset ?? ""));

  // Measure
  const agg = spec.measure?.agg ?? "count";
  if (!AGGS.includes(agg)) throw new InsightQueryError(`Unknown aggregation "${String(agg)}"`);
  let measureField: FieldDef | undefined;
  if (agg !== "count") {
    measureField = fieldOf(ds, spec.measure.field, "Measure");
    if (agg !== "countDistinct" && !measureField.measurable && measureField.type !== "number") {
      throw new InsightQueryError(`${measureField.label} is not a number, so it cannot be ${agg === "avg" ? "averaged" : "added up"}`);
    }
  }

  // Group-by and time
  const groupBy = (spec.groupBy ?? []).slice(0, 2).map((k) => {
    const f = fieldOf(ds, k, "Group by");
    if (!f.dimension) throw new InsightQueryError(`${f.label} cannot be used to group`);
    return f;
  });
  let timeField: FieldDef | undefined;
  if (spec.time) {
    if (!GRAINS.includes(spec.time.grain)) throw new InsightQueryError("Unknown time grain");
    timeField = fieldOf(ds, spec.time.field, "Time");
    if (timeField.type !== "date") throw new InsightQueryError(`${timeField.label} is not a date`);
  }

  // Filters and range
  const filterFields = [
    ...(spec.filters ?? []),
    // Dashboard-wide filters may name a field this dataset doesn't have
    // (e.g. a district filter over a chart of expenses). Those are skipped;
    // the chart's own filters must all be valid.
    ...(opts.extraFilters ?? []).filter((f) => ds.fields.some((x) => x.key === f.field)),
  ].slice(0, 30);
  const rangeFieldKey = spec.range?.field ?? spec.time?.field ?? ds.defaultDate;
  const { from, to } = resolveRange(spec.range, opts.now);
  const rangeField = (from || to) ? fieldOf(ds, rangeFieldKey, "Period") : undefined;
  if (rangeField && rangeField.type !== "date") throw new InsightQueryError(`${rangeField.label} is not a date`);

  // Which fields need projecting
  const needed = new Map<string, FieldDef>();
  for (const f of [measureField, timeField, rangeField, ...groupBy]) if (f) needed.set(f.key, f);
  for (const f of filterFields) needed.set(f.field, fieldOf(ds, f.field, "Filter"));

  const pipeline: Record<string, unknown>[] = [];
  if (ds.baseMatch) pipeline.push({ $match: ds.baseMatch });
  if (ds.unwind) pipeline.push({ $unwind: ds.unwind });
  const project: Record<string, unknown> = { _id: 1 };
  for (const f of needed.values()) project[`f_${f.key}`] = f.expr;
  pipeline.push({ $project: project });

  const conds: Record<string, unknown>[] = filterFields.map((f) => filterExpr(ds, f));
  if (rangeField) {
    const ref = `$f_${rangeField.key}`;
    conds.push({ $ne: [{ $ifNull: [ref, null] }, null] });
    if (from) conds.push({ $gte: [ref, from] });
    if (to) conds.push({ $lte: [ref, to] });
  }
  if (timeField) conds.push({ $ne: [{ $ifNull: [`$f_${timeField.key}`, null] }, null] });
  if (conds.length) pipeline.push({ $match: { $expr: { $and: conds } } });

  for (const g of groupBy) {
    if (g.multi) pipeline.push({ $unwind: { path: `$f_${g.key}`, preserveNullAndEmptyArrays: true } });
  }

  const groupId: Record<string, unknown> = {};
  groupBy.forEach((g, i) => { groupId[`g${i}`] = `$f_${g.key}`; });
  if (timeField) {
    groupId.p = {
      $dateTrunc: { date: `$f_${timeField.key}`, unit: spec.time!.grain, timezone: TZ, ...(spec.time!.grain === "week" ? { startOfWeek: "monday" } : {}) },
    };
  }

  const accumulator: Record<string, unknown> =
    agg === "count" ? { $sum: 1 }
    : agg === "countDistinct" ? { $addToSet: `$f_${measureField!.key}` }
    : { [`$${agg}`]: `$f_${measureField!.key}` };

  pipeline.push({ $group: { _id: groupId, v: accumulator } });
  if (agg === "countDistinct") pipeline.push({ $set: { v: { $size: { $setDifference: ["$v", [null]] } } } });

  const limit = Math.min(Math.max(1, Number(spec.limit) || DEFAULT_LIMIT), MAX_GROUPS);
  if (timeField) pipeline.push({ $sort: { "_id.p": 1 } });
  else if (spec.sort === "value_asc") pipeline.push({ $sort: { v: 1 } });
  else if (spec.sort !== "label") pipeline.push({ $sort: { v: -1 } });
  pipeline.push({ $limit: (timeField ? MAX_GROUPS : limit) + 1 });

  const raw = await ds.model()
    .aggregate<{ _id: Record<string, unknown>; v: number | null }>(pipeline as unknown as mongoose.PipelineStage[])
    .allowDiskUse(true);
  const truncated = raw.length > (timeField ? MAX_GROUPS : limit);
  const trimmed = raw.slice(0, timeField ? MAX_GROUPS : limit);

  // Resolve ids → names for user / project dimensions.
  const names = await lookupNames(groupBy, trimmed.map((r) => r._id));

  let rows: QueryRow[] = trimmed.map((r) => {
    const keys: string[] = [];
    const ids: (string | null)[] = [];
    groupBy.forEach((g, i) => {
      const val = r._id[`g${i}`];
      const id = val == null ? null : String(val);
      ids.push(id);
      keys.push(labelFor(g, val, names));
    });
    const value = typeof r.v === "number" ? (agg === "avg" ? Math.round(r.v * 100) / 100 : r.v) : 0;
    return { keys, ids, period: r._id.p instanceof Date ? r._id.p.toISOString() : undefined, value };
  });

  if (spec.sort === "label" && !timeField) rows = rows.sort((a, b) => a.keys.join("|").localeCompare(b.keys.join("|")));

  return {
    rows,
    measureLabel: measureLabel(ds, agg, measureField),
    groupLabels: groupBy.map((g) => g.label),
    truncated,
  };
}

function measureLabel(ds: DatasetDef, agg: string, f?: FieldDef): string {
  if (agg === "count") return ds.unit;
  const name = f?.label ?? "";
  return {
    countDistinct: `Distinct ${name}`,
    sum: `Total ${name}`,
    avg: `Average ${name}`,
    min: `Lowest ${name}`,
    max: `Highest ${name}`,
  }[agg] ?? name;
}

function labelFor(f: FieldDef, val: unknown, names: Map<string, string>): string {
  if (val === null || val === undefined || val === "") {
    if (f.lookup === "user") return f.multi ? "Not assigned" : "Not set";
    return "Not set";
  }
  if (f.type === "boolean") return val === true ? "Yes" : "No";
  if (f.lookup) return names.get(String(val)) ?? "Unknown";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return humanise(String(val));
}

/** "in_progress" → "In progress"; leaves already-readable values alone. */
export function humanise(v: string): string {
  if (!/^[a-z0-9_]+$/.test(v)) return v;
  const s = v.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function lookupNames(groupBy: FieldDef[], ids: Record<string, unknown>[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const userIds = new Set<string>();
  const projectIds = new Set<string>();
  groupBy.forEach((g, i) => {
    if (!g.lookup) return;
    for (const id of ids) {
      const v = id[`g${i}`];
      if (v && mongoose.Types.ObjectId.isValid(String(v))) (g.lookup === "user" ? userIds : projectIds).add(String(v));
    }
  });
  if (userIds.size) {
    const users = await User.find({ _id: { $in: [...userIds] } }).select("name").lean();
    for (const u of users) out.set(String(u._id), u.name ?? "Unknown");
  }
  if (projectIds.size) {
    const projects = await Project.find({ _id: { $in: [...projectIds] } }).select("name code").lean();
    for (const p of projects) out.set(String(p._id), p.code ? `${p.code} · ${p.name}` : p.name);
  }
  return out;
}

/** Distinct values of a dimension, for filter pick-lists. Lookup fields come
 *  back as { id, label } pairs. */
export async function fieldValues(datasetKey: string, fieldKey: string): Promise<{ id: string | null; label: string }[]> {
  const res = await runQuery({ dataset: datasetKey, measure: { agg: "count" }, groupBy: [fieldKey], sort: "label", limit: 500 });
  return res.rows.map((r) => ({ id: r.ids[0], label: r.keys[0] }));
}
