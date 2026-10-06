"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { FilterSpec, Grain, KpiType, MeasureSpec, NumberFormat, QuerySpec } from "@/lib/insights/types";
import QueryBuilder, { FilterEditor, inputCls, labelCls, useDatasets } from "@/components/insights/QueryBuilder";
import { Modal } from "@/components/insights/DashboardView";
import { useNotify } from "@/components/insights/useNotify";

export type KpiFormValue = {
  name: string;
  description?: string;
  target: number | "";
  direction: "higher" | "lower";
  timeField: string;
  grain: Grain;
  cumulative: boolean;
  onTrackPct: number;
  attentionPct: number;
  kpiType: KpiType;
  programTags: string[];
  numberFormat: NumberFormat;
  decimals: number;
  prefix?: string;
  suffix?: string;
};

type Metric = { _id: string; name: string; dataset: string; measure: MeasureSpec; filters: FilterSpec[] };

const TYPE_HELP: Record<KpiType, string> = {
  input: "Resources put in: staff time, money, trainings held",
  output: "Direct results: cases taken up, hearings attended, camps run",
  outcome: "Change for people: cases disposed, relief or compensation won",
  impact: "Long-term change: fewer violations, rights secured at scale",
};

/**
 * Three-step KPI editor: 1 the metric (what is counted), 2 the target and
 * time column, 3 thresholds and display. In edit mode the metric's dataset
 * and the time column are fixed so the trend keeps meaning the same thing;
 * the metric's filters can still change.
 */
export default function KpiForm({ editId, initial, initialMetric, onClose, onSaved }: {
  editId?: string;
  initial?: KpiFormValue;
  initialMetric?: Metric;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useNotify();
  const { datasets } = useDatasets();
  const metrics = useApi<{ metrics: Metric[] }>(editId ? null : "/api/insights/metrics");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [metricMode, setMetricMode] = useState<"new" | "existing">(editId ? "existing" : "new");
  const [metricId, setMetricId] = useState(initialMetric?._id ?? "");
  const [metricName, setMetricName] = useState("");
  const [query, setQuery] = useState<QuerySpec>({ dataset: "cases", measure: { agg: "count" }, filters: [] });
  const [metricFilters, setMetricFilters] = useState<FilterSpec[]>(initialMetric?.filters ?? []);
  const [v, setV] = useState<KpiFormValue>(initial ?? {
    name: "", target: "", direction: "higher", timeField: "", grain: "month", cumulative: false,
    onTrackPct: 90, attentionPct: 70, kpiType: "output", programTags: [], numberFormat: "indian", decimals: 0,
  });
  const [tagDraft, setTagDraft] = useState("");

  const chosenMetric = metricMode === "existing" ? (initialMetric ?? metrics.data?.metrics.find((m) => m._id === metricId)) : undefined;
  const datasetKey = metricMode === "existing" ? chosenMetric?.dataset ?? "" : query.dataset;
  const ds = datasets.find((d) => d.key === datasetKey);
  const dateFields = ds?.fields.filter((f) => f.type === "date") ?? [];
  const set = (p: Partial<KpiFormValue>) => setV((x) => ({ ...x, ...p }));

  const step1Ok = metricMode === "existing" ? !!chosenMetric : !!query.dataset;
  const step2Ok = v.name.trim() && v.target !== "" && (editId || v.timeField);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...v, target: Number(v.target) };
      if (editId) {
        delete body.timeField;
        body.metricFilters = metricFilters;
        await api(`/api/insights/kpis/${editId}`, { method: "PATCH", body });
      } else if (metricMode === "existing") {
        await api("/api/insights/kpis", { body: { ...body, metricId } });
      } else {
        await api("/api/insights/kpis", {
          body: { ...body, metric: { name: metricName || v.name, dataset: query.dataset, measure: query.measure, filters: query.filters } },
        });
      }
      toast.success(editId ? "KPI updated" : "KPI created");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editId ? "Edit KPI" : "New KPI"} onClose={onClose} wide>
      <ol className="flex gap-2 mb-5 text-xs">
        {["Metric", "Target & time", "Status & display"].map((s, i) => (
          <li key={s} className="flex-1 rounded-lg px-3 py-2 font-medium"
            style={{ background: step === i + 1 ? "var(--accent-subtle)" : "var(--bg-secondary)", color: step === i + 1 ? "var(--accent)" : "var(--muted)" }}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          {editId ? (
            <>
              <p className="text-sm text-(--text)">Metric: <strong>{initialMetric?.name}</strong> on {datasets.find((d) => d.key === initialMetric?.dataset)?.label ?? initialMetric?.dataset}</p>
              <p className="text-xs text-(--muted)">The data source and the time column stay fixed after creation. You can change the filters.</p>
              {ds && <FilterEditor dataset={ds} filters={metricFilters} onChange={setMetricFilters} title="Which records count" />}
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button className={metricMode === "new" ? "btn-primary" : "btn-secondary"} onClick={() => setMetricMode("new")}>Define what to count</button>
                <button className={metricMode === "existing" ? "btn-primary" : "btn-secondary"} onClick={() => setMetricMode("existing")}>Use a saved metric</button>
              </div>
              {metricMode === "new" ? (
                <>
                  <QueryBuilder value={query} onChange={setQuery} datasets={datasets} measureOnly />
                  <div>
                    <label className={labelCls}>Save this metric as (optional)</label>
                    <input className={inputCls} value={metricName} onChange={(e) => setMetricName(e.target.value)} placeholder="e.g. POCSO cases taken up" />
                  </div>
                </>
              ) : (
                <select className={inputCls} value={metricId} onChange={(e) => setMetricId(e.target.value)}>
                  <option value="">Choose a metric…</option>
                  {metrics.data?.metrics.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              )}
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>KPI name</label>
            <input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Cases taken up each month" />
          </div>
          <div>
            <label className={labelCls}>Target per {v.cumulative ? "total" : v.grain}</label>
            <input type="number" className={inputCls} value={v.target} onChange={(e) => set({ target: e.target.value === "" ? "" : Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>Direction</label>
            <select className={inputCls} value={v.direction} onChange={(e) => set({ direction: e.target.value as "higher" | "lower" })}>
              <option value="higher">Higher is better</option>
              <option value="lower">Lower is better</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Time column</label>
            <select className={inputCls} value={v.timeField} disabled={!!editId} onChange={(e) => set({ timeField: e.target.value })}>
              <option value="">Choose…</option>
              {dateFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Measured every</label>
            <select className={inputCls} value={v.grain} onChange={(e) => set({ grain: e.target.value as Grain })}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter (financial year)</option>
              <option value="year">Year</option>
            </select>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-(--text)">
            <input type="checkbox" checked={v.cumulative} onChange={(e) => set({ cumulative: e.target.checked })} />
            Running total (count everything up to each period, not each period on its own)
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>On track at or above (% of target)</label>
            <input type="number" className={inputCls} value={v.onTrackPct} onChange={(e) => set({ onTrackPct: Number(e.target.value) })} />
            <p className="text-[11px] text-(--muted) mt-1">{v.target !== "" ? `${v.direction === "higher" ? "≥" : "≤"} ${v.direction === "higher" ? Math.round(Number(v.target) * v.onTrackPct / 100) : Math.round(Number(v.target) * 100 / Math.max(v.onTrackPct, 1))}` : ""}</p>
          </div>
          <div>
            <label className={labelCls}>Needs attention at or above (% of target)</label>
            <input type="number" className={inputCls} value={v.attentionPct} onChange={(e) => set({ attentionPct: Number(e.target.value) })} />
            <p className="text-[11px] text-(--muted) mt-1">Below this it shows as off track.</p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Where this sits on the logframe</label>
            <div className="grid gap-2 sm:grid-cols-4">
              {(Object.keys(TYPE_HELP) as KpiType[]).map((t) => (
                <button key={t} type="button" onClick={() => set({ kpiType: t })}
                  className="rounded-lg border p-2 text-left"
                  style={{ borderColor: v.kpiType === t ? "var(--accent)" : "var(--border)", background: v.kpiType === t ? "var(--accent-subtle)" : "transparent" }}>
                  <span className="block text-sm font-semibold capitalize text-(--text)">{t}</span>
                  <span className="block text-[11px] text-(--muted)">{TYPE_HELP[t]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Programme tags</label>
            <div className="flex flex-wrap gap-2 items-center">
              {v.programTags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-secondary)" }}>
                  {t} <button className="text-(--muted)" onClick={() => set({ programTags: v.programTags.filter((x) => x !== t) })}>×</button>
                </span>
              ))}
              <input className={`${inputCls} w-48`} value={tagDraft} placeholder="Type and press Enter"
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagDraft.trim()) { e.preventDefault(); set({ programTags: [...new Set([...v.programTags, tagDraft.trim()])] }); setTagDraft(""); }
                }} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Number format</label>
            <select className={inputCls} value={v.numberFormat} onChange={(e) => set({ numberFormat: e.target.value as NumberFormat })}>
              <option value="indian">Indian (12,34,567)</option>
              <option value="compact_indian">Short (12.35 L, 1.2 Cr)</option>
              <option value="currency">Rupees (₹)</option>
              <option value="percent">Percentage</option>
              <option value="plain">Plain</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Decimal places</label>
            <input type="number" min={0} max={4} className={inputCls} value={v.decimals} onChange={(e) => set({ decimals: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description (optional)</label>
            <input className={inputCls} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="How it is counted, and why the target is what it is" />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button className="btn-secondary" onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>{step === 1 ? "Cancel" : "Back"}</button>
        {step < 3 ? (
          <button className="btn-primary" disabled={step === 1 ? !step1Ok : !step2Ok} onClick={() => setStep(step + 1)}>Continue</button>
        ) : (
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : editId ? "Save changes" : "Create KPI"}</button>
        )}
      </div>
    </Modal>
  );
}
