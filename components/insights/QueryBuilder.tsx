"use client";

import { useEffect, useState } from "react";
import { api, useApi, type PublicDataset, type PublicField } from "@/lib/insights/client";
import type { FilterOp, FilterSpec, Grain, MeasureSpec, QuerySpec, RangePreset } from "@/lib/insights/types";

/** Shared form controls for building a query: dataset, measure, grouping,
 *  time grain, period and filters. Used by charts, metrics and Explore. */

export const inputCls =
  "w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)";
export const labelCls = "block text-xs font-medium text-(--muted) mb-1";

export function useDatasets(enabled = true) {
  const { data, error, loading } = useApi<{ datasets: PublicDataset[] }>(enabled ? "/api/insights/datasets" : null);
  return { datasets: data?.datasets ?? [], error, loading };
}

const PRESET_LABELS: Record<RangePreset, string> = {
  all: "All time",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  last_6_months: "Last 6 months",
  last_12_months: "Last 12 months",
  this_month: "This month",
  this_fy: "This financial year",
  last_fy: "Last financial year",
  custom: "Custom dates",
};

const GRAIN_LABELS: Record<Grain, string> = { day: "Day", week: "Week", month: "Month", quarter: "Quarter (FY)", year: "Year" };

type Props = {
  value: QuerySpec;
  onChange: (q: QuerySpec) => void;
  datasets: PublicDataset[];
  /** Hide grouping / time controls (metric form only needs measure + filters). */
  measureOnly?: boolean;
  maxGroups?: number;
};

export default function QueryBuilder({ value, onChange, datasets, measureOnly, maxGroups = 2 }: Props) {
  const ds = datasets.find((d) => d.key === value.dataset);
  const dims = ds?.fields.filter((f) => f.dimension) ?? [];
  const nums = ds?.fields.filter((f) => f.measurable) ?? [];
  const dates = ds?.fields.filter((f) => f.type === "date") ?? [];
  const set = (patch: Partial<QuerySpec>) => onChange({ ...value, ...patch });

  const measureKey = value.measure.agg === "count" ? "count" : `${value.measure.agg}:${value.measure.field}`;
  const measureOptions: { key: string; label: string; m: MeasureSpec }[] = ds ? [
    { key: "count", label: `Count of ${ds.unit.toLowerCase()}`, m: { agg: "count" } },
    ...nums.flatMap((f) => (["sum", "avg", "min", "max"] as const).map((agg) => ({
      key: `${agg}:${f.key}`,
      label: `${{ sum: "Total", avg: "Average", min: "Lowest", max: "Highest" }[agg]} ${f.label}`,
      m: { agg, field: f.key } as MeasureSpec,
    }))),
    ...dims.filter((f) => !f.multi).map((f) => ({
      key: `countDistinct:${f.key}`, label: `Number of different ${f.label.toLowerCase()}`, m: { agg: "countDistinct", field: f.key } as MeasureSpec,
    })),
  ] : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Data</label>
          <select className={inputCls} value={value.dataset}
            onChange={(e) => onChange({ dataset: e.target.value, measure: { agg: "count" }, filters: [], groupBy: [], range: { preset: "all" } })}>
            <option value="">Choose…</option>
            {datasets.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          {ds && <p className="text-[11px] text-(--muted) mt-1">{ds.description}</p>}
        </div>
        {ds && (
          <div>
            <label className={labelCls}>Measure</label>
            <select className={inputCls} value={measureKey}
              onChange={(e) => set({ measure: measureOptions.find((o) => o.key === e.target.value)?.m ?? { agg: "count" } })}>
              {measureOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {ds && !measureOnly && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: maxGroups }).map((_, i) => (
            <div key={i}>
              <label className={labelCls}>{i === 0 ? "Group by" : "Then split by"}</label>
              <select className={inputCls} value={value.groupBy?.[i] ?? ""}
                disabled={i > 0 && !value.groupBy?.[0]}
                onChange={(e) => {
                  const g = [...(value.groupBy ?? [])];
                  if (e.target.value) g[i] = e.target.value; else g.splice(i);
                  set({ groupBy: g.filter(Boolean) });
                }}>
                <option value="">None</option>
                {dims.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className={labelCls}>Over time</label>
            <div className="flex gap-2">
              <select className={inputCls} value={value.time?.field ?? ""}
                onChange={(e) => set({ time: e.target.value ? { field: e.target.value, grain: value.time?.grain ?? "month" } : undefined })}>
                <option value="">No time axis</option>
                {dates.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              {value.time && (
                <select className={inputCls} value={value.time.grain}
                  onChange={(e) => set({ time: { ...value.time!, grain: e.target.value as Grain } })}>
                  {(Object.keys(GRAIN_LABELS) as Grain[]).map((g) => <option key={g} value={g}>{GRAIN_LABELS[g]}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Period</label>
            <div className="flex gap-2">
              <select className={inputCls} value={value.range?.preset ?? "all"}
                onChange={(e) => set({ range: { ...value.range, preset: e.target.value as RangePreset } })}>
                {(Object.keys(PRESET_LABELS) as RangePreset[]).map((p) => <option key={p} value={p}>{PRESET_LABELS[p]}</option>)}
              </select>
              {value.range?.preset && value.range.preset !== "all" && !value.time && (
                <select className={inputCls} value={value.range.field ?? ds.defaultDate} title="Which date the period applies to"
                  onChange={(e) => set({ range: { ...value.range, field: e.target.value } })}>
                  {dates.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              )}
            </div>
            {value.range?.preset === "custom" && (
              <div className="flex gap-2 mt-2">
                <input type="date" className={inputCls} value={value.range.from ?? ""} onChange={(e) => set({ range: { ...value.range, from: e.target.value } })} />
                <input type="date" className={inputCls} value={value.range.to ?? ""} onChange={(e) => set({ range: { ...value.range, to: e.target.value } })} />
              </div>
            )}
          </div>
        </div>
      )}

      {ds && (
        <FilterEditor dataset={ds} filters={value.filters ?? []} onChange={(filters) => set({ filters })} />
      )}
    </div>
  );
}

/* ------------------------------- filters ------------------------------- */

const OPS_FOR: Record<PublicField["type"], { op: FilterOp; label: string }[]> = {
  string: [{ op: "in", label: "is any of" }, { op: "nin", label: "is none of" }, { op: "isSet", label: "is filled in" }, { op: "isNotSet", label: "is empty" }],
  boolean: [{ op: "isTrue", label: "is yes" }, { op: "isFalse", label: "is no" }],
  number: [{ op: "gte", label: "≥" }, { op: "lte", label: "≤" }, { op: "eq", label: "=" }],
  date: [{ op: "gte", label: "on or after" }, { op: "lte", label: "on or before" }, { op: "isSet", label: "is set" }, { op: "isNotSet", label: "is not set" }],
};

export function FilterEditor({ dataset, filters, onChange, title = "Filters" }: {
  dataset: PublicDataset; filters: FilterSpec[]; onChange: (f: FilterSpec[]) => void; title?: string;
}) {
  const filterable = dataset.fields.filter((f) => f.dimension || f.type === "date" || f.type === "number");
  const update = (i: number, patch: Partial<FilterSpec>) => onChange(filters.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={labelCls}>{title}</span>
        <button type="button" className="text-xs font-medium text-(--accent) hover:underline"
          onClick={() => {
            const f = filterable[0];
            if (f) onChange([...filters, { field: f.key, op: OPS_FOR[f.type][0].op, value: f.type === "string" ? [] : undefined }]);
          }}>
          + Add filter
        </button>
      </div>
      {filters.length === 0 && <p className="text-xs text-(--muted)">No filters: every record counts.</p>}
      <div className="space-y-2">
        {filters.map((flt, i) => {
          const field = dataset.fields.find((f) => f.key === flt.field) ?? filterable[0];
          if (!field) return null;
          const ops = OPS_FOR[field.type];
          const needsValue = !["isSet", "isNotSet", "isTrue", "isFalse"].includes(flt.op);
          return (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-(--border) p-2">
              <select className={`${inputCls} w-auto`} value={field.key}
                onChange={(e) => {
                  const nf = filterable.find((f) => f.key === e.target.value)!;
                  update(i, { field: nf.key, op: OPS_FOR[nf.type][0].op, value: nf.type === "string" ? [] : undefined });
                }}>
                {filterable.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select className={`${inputCls} w-auto`} value={flt.op} onChange={(e) => update(i, { op: e.target.value as FilterOp })}>
                {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
              </select>
              {needsValue && (
                <div className="flex-1 min-w-48">
                  <FilterValueInput dataset={dataset} field={field} value={flt.value} onChange={(v) => update(i, { value: v })} />
                </div>
              )}
              <button type="button" className="text-xs text-(--muted) hover:text-(--error) px-2 py-2" onClick={() => onChange(filters.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterValueInput({ dataset, field, value, onChange }: {
  dataset: PublicDataset; field: PublicField; value: FilterSpec["value"]; onChange: (v: FilterSpec["value"]) => void;
}) {
  if (field.type === "date") {
    return <input type="date" className={inputCls} value={typeof value === "string" ? value.slice(0, 10) : ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "number") {
    return <input type="number" className={inputCls} value={typeof value === "number" ? value : ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
  }
  return <MultiPick dataset={dataset.key} field={field} selected={Array.isArray(value) ? value.map(String) : []} onChange={onChange} />;
}

/** Tick-list of the values present in the data (or the field's known values). */
export function MultiPick({ dataset, field, selected, onChange, valuesUrl }: {
  dataset: string; field: PublicField; selected: string[]; onChange: (v: string[]) => void;
  /** Where to load the pick-list from (shared dashboards use their own route). */
  valuesUrl?: string;
}) {
  const [options, setOptions] = useState<{ id: string | null; label: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || options) return;
    api<{ values: { id: string | null; label: string }[] }>(valuesUrl ?? `/api/insights/datasets/values?dataset=${encodeURIComponent(dataset)}&field=${encodeURIComponent(field.key)}`)
      .then((d) => setOptions(d.values))
      .catch(() => setOptions((field.values ?? []).map((v) => ({ id: v, label: v }))));
  }, [open, options, dataset, field, valuesUrl]);

  // For lookup fields the stored value is the id; for the rest it is the raw value.
  const valueOf = (o: { id: string | null; label: string }) => (field.lookup ? o.id ?? "" : rawValue(field, o));
  const labelOf = (v: string) => options?.find((o) => valueOf(o) === v)?.label ?? (field.lookup ? "…" : v);

  return (
    <div className="relative">
      <button type="button" className={`${inputCls} text-left truncate`} onClick={() => setOpen((o) => !o)}>
        {selected.length ? selected.map(labelOf).join(", ") : "Choose values…"}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-(--border) p-1 shadow-lg" style={{ background: "var(--surface)" }}>
          {!options && <p className="text-xs text-(--muted) p-2">Loading…</p>}
          {options?.length === 0 && <p className="text-xs text-(--muted) p-2">No values in the data.</p>}
          {options?.map((o) => {
            const v = valueOf(o);
            if (!v) return null;
            const on = selected.includes(v);
            return (
              <label key={v} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-(--bg) text-sm text-(--text) cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== v) : [...selected, v])} />
                {o.label}
              </label>
            );
          })}
          <button type="button" className="w-full text-xs text-(--accent) py-1.5" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}

/** The values API returns display labels ("In progress"); filters need the
 *  stored value ("in_progress"). Known values are matched back here. */
function rawValue(field: PublicField, o: { id: string | null; label: string }): string {
  if (o.id) {
    const known = field.values?.find((v) => v === o.id);
    if (known) return known;
    if (field.type === "boolean") return o.id;
    return o.id;
  }
  return o.label;
}
