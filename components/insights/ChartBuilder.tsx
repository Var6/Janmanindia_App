"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/insights/client";
import type { ChartType, QueryResult, QuerySpec } from "@/lib/insights/types";
import ChartView, { type ChartDisplay } from "@/components/insights/charts/ChartView";
import QueryBuilder, { inputCls, labelCls, useDatasets } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

const TYPES: { key: ChartType; label: string; hint: string }[] = [
  { key: "bar", label: "Bar", hint: "Compare groups, or counts per month" },
  { key: "line", label: "Line", hint: "A trend over time" },
  { key: "pie", label: "Pie", hint: "Shares of a whole (few groups)" },
  { key: "number", label: "Number", hint: "One headline figure" },
  { key: "map", label: "District map", hint: "Group by district" },
  { key: "table", label: "Table", hint: "Exact figures" },
  { key: "pivot", label: "Pivot", hint: "Two fields, rows by columns" },
];

type Initial = { _id?: string; title: string; description?: string; chartType: ChartType; query: QuerySpec; display: ChartDisplay };

/** Build or edit a chart, with a live preview as you change it. */
export default function ChartBuilder({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const toast = useNotify();
  const { datasets } = useDatasets();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [chartType, setChartType] = useState<ChartType>(initial?.chartType ?? "bar");
  const [query, setQuery] = useState<QuerySpec>(initial?.query ?? { dataset: "cases", measure: { agg: "count" }, groupBy: ["district"], filters: [] });
  const [display, setDisplay] = useState<ChartDisplay>(initial?.display ?? { showValues: true });
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const queryKey = JSON.stringify(query);
  useEffect(() => {
    if (!query.dataset) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<QueryResult>("/api/insights/query", { body: { query: JSON.parse(queryKey) } })
        .then((r) => { if (!cancelled) { setPreview(r); setPreviewError(null); } })
        .catch((e: Error) => { if (!cancelled) setPreviewError(e.message); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [queryKey, query.dataset]);

  async function save() {
    setSaving(true);
    try {
      const body = { title, description, chartType, query, display };
      if (initial?._id) {
        await api(`/api/insights/charts/${initial._id}`, { method: "PATCH", body });
        toast.success("Chart saved");
      } else {
        const res = await api<{ chart: { _id: string } }>("/api/insights/charts", { body });
        toast.success("Chart created");
        router.replace(`/director/insights/charts/${res.chart._id}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial?._id || !window.confirm("Delete this chart? It will also be removed from dashboards.")) return;
    try {
      await api(`/api/insights/charts/${initial._id}`, { method: "DELETE" });
      toast.success("Chart deleted");
      router.push("/director/insights/charts");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4 rounded-2xl border border-(--border) p-4" style={{ background: "var(--surface)" }}>
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Live cases by district" />
        </div>
        <div>
          <label className={labelCls}>Description (optional)</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Chart type</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setChartType(t.key)} title={t.hint}
                className="rounded-lg border px-2.5 py-2 text-left"
                style={{ borderColor: chartType === t.key ? "var(--accent)" : "var(--border)", background: chartType === t.key ? "var(--accent-subtle)" : "transparent" }}>
                <span className="block text-sm font-medium text-(--text)">{t.label}</span>
                <span className="block text-[11px] text-(--muted)">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <QueryBuilder value={query} onChange={setQuery} datasets={datasets} />
        {(chartType === "bar" || chartType === "pie") && (
          <div className="space-y-2">
            <span className={labelCls}>Display</span>
            {chartType === "bar" && (
              <>
                <label className="flex items-center gap-2 text-sm text-(--text)"><input type="checkbox" checked={!!display.horizontal} onChange={(e) => setDisplay({ ...display, horizontal: e.target.checked })} /> Horizontal bars</label>
                <label className="flex items-center gap-2 text-sm text-(--text)"><input type="checkbox" checked={!!display.stacked} onChange={(e) => setDisplay({ ...display, stacked: e.target.checked })} /> Stack the split</label>
                <label className="flex items-center gap-2 text-sm text-(--text)"><input type="checkbox" checked={display.showValues !== false} onChange={(e) => setDisplay({ ...display, showValues: e.target.checked })} /> Show values</label>
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-(--text)">
              Show the top
              <input type="number" min={2} max={50} className={`${inputCls} w-20`} value={display.topN ?? (chartType === "pie" ? 8 : 12)}
                onChange={(e) => setDisplay({ ...display, topN: Number(e.target.value) })} />
              and group the rest as Other
            </label>
          </div>
        )}
        <div>
          <label className={labelCls}>Number format</label>
          <select className={inputCls} value={display.numberFormat ?? "indian"} onChange={(e) => setDisplay({ ...display, numberFormat: e.target.value as ChartDisplay["numberFormat"] })}>
            <option value="indian">Indian (12,34,567)</option>
            <option value="compact_indian">Short (12.35 L)</option>
            <option value="currency">Rupees (₹)</option>
            <option value="percent">Percentage</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="btn-primary" disabled={saving || !title.trim()} onClick={save}>{saving ? "Saving…" : initial?._id ? "Save chart" : "Create chart"}</button>
          {initial?._id && <button className="btn-secondary" style={{ color: "var(--error-text)" }} onClick={remove}>Delete</button>}
        </div>
      </div>

      <div className="rounded-2xl border border-(--border) p-5 min-h-80" style={{ background: "var(--surface)" }}>
        <h2 className="text-base font-semibold text-(--text) mb-1">{title || "Preview"}</h2>
        {description && <p className="text-xs text-(--muted) mb-3">{description}</p>}
        {previewError && <p className="text-sm text-(--error-text)">{previewError}</p>}
        {!previewError && preview && (
          <ChartView type={chartType} result={preview} grain={query.time?.grain} display={display} height={320} />
        )}
        {!previewError && !preview && <p className="text-sm text-(--muted)">Choose the data to see a preview.</p>}
        {preview?.truncated && <p className="text-xs text-(--muted) mt-2">Only the largest groups are shown.</p>}
      </div>
    </div>
  );
}
