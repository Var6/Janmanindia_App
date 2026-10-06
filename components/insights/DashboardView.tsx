"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, useApi, type PublicDataset } from "@/lib/insights/client";
import type { FilterSpec, RangePreset, RangeSpec } from "@/lib/insights/types";
import type { TileData } from "@/lib/insights/tiles";
import ChartView, { type ChartDisplay } from "@/components/insights/charts/ChartView";
import KpiCard from "@/components/insights/KpiCard";
import KpiDrawer from "@/components/insights/KpiDrawer";
import { MultiPick, inputCls, labelCls, useDatasets } from "@/components/insights/QueryBuilder";
import RichText from "@/components/insights/RichText";
import { useNotify } from "@/components/insights/useNotify";

type Tile = { id: string; kind: "chart" | "kpi" | "text"; refId?: string; text?: string; w: number; h: number };
type Tab = { id: string; title: string; tiles: Tile[] };
type Dashboard = {
  _id: string; title: string; description?: string; tabs: Tab[];
  filters: { field: string; label: string }[]; isOrgDefault: boolean; pinnedByMe: boolean;
};

const ROW_PX = 110;

const PERIODS: { key: RangePreset | "own"; label: string }[] = [
  { key: "own", label: "Each chart's own period" },
  { key: "this_month", label: "This month" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "this_fy", label: "This financial year" },
  { key: "last_fy", label: "Last financial year" },
  { key: "last_12_months", label: "Last 12 months" },
  { key: "all", label: "All time" },
];

export default function DashboardView({ id, landing = false }: { id: string; landing?: boolean }) {
  const toast = useNotify();
  const { data, error, reload } = useApi<{ dashboard: Dashboard }>(`/api/insights/dashboards/${id}`);
  const { datasets } = useDatasets();
  const [tabId, setTabId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Dashboard | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [period, setPeriod] = useState<RangePreset | "own">("own");
  const [tiles, setTiles] = useState<Record<string, TileData>>({});
  const [loadingTiles, setLoadingTiles] = useState(false);
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const dash = editing ? draft : data?.dashboard ?? null;
  const tab = dash?.tabs.find((t) => t.id === tabId) ?? dash?.tabs[0];

  const filters: FilterSpec[] = useMemo(
    () => Object.entries(filterValues).filter(([, v]) => v.length).map(([field, value]) => ({ field, op: "in", value })),
    [filterValues],
  );
  const range: RangeSpec | undefined = period === "own" ? undefined : { preset: period };

  const loadTiles = useCallback(async () => {
    if (!tab) return;
    setLoadingTiles(true);
    try {
      const res = await api<{ tiles: Record<string, TileData> }>("/api/insights/tiles", {
        body: { tiles: tab.tiles, filters, range },
      });
      setTiles((prev) => ({ ...prev, ...res.tiles }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingTiles(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tab?.tiles.map((t) => [t.id, t.refId, t.text])), JSON.stringify(filters), period]);

  useEffect(() => { loadTiles(); }, [loadTiles]);

  if (error) return <p className="text-sm text-(--error-text)">{error}</p>;
  if (!dash || !tab) return <p className="text-sm text-(--muted)">Loading dashboard…</p>;

  const setTab = (patch: (t: Tab) => Tab) => {
    if (!draft) return;
    setDraft({ ...draft, tabs: draft.tabs.map((t) => (t.id === tab.id ? patch(t) : t)) });
  };

  async function save() {
    if (!draft) return;
    try {
      await api(`/api/insights/dashboards/${id}`, { method: "PATCH", body: { title: draft.title, description: draft.description, tabs: draft.tabs, filters: draft.filters } });
      toast.success("Dashboard saved");
      setEditing(false);
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function act(path: string, method: "POST" | "DELETE", msg: string) {
    try { await api(`/api/insights/dashboards/${id}/${path}`, { method }); toast.success(msg); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input className={`${inputCls} text-lg font-bold`} value={draft!.title} onChange={(e) => setDraft({ ...draft!, title: e.target.value })} />
              <input className={inputCls} placeholder="One line on what this dashboard is for" value={draft!.description ?? ""} onChange={(e) => setDraft({ ...draft!, description: e.target.value })} />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-(--text)">{dash.title}</h1>
              {dash.description && <p className="text-sm text-(--muted) mt-0.5">{dash.description}</p>}
              <p className="text-xs text-(--muted) mt-1">
                {dash.isOrgDefault ? "Organisation default Impact page" : ""}
                {dash.isOrgDefault && dash.pinnedByMe ? " · " : ""}
                {dash.pinnedByMe ? "Pinned as your Impact page" : ""}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {editing ? (
            <>
              <button className="btn-secondary" onClick={() => { setEditing(false); setDraft(null); }}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save dashboard</button>
            </>
          ) : (
            <>
              {landing && <Link href={`/director/insights/dashboards/${id}`} className="btn-secondary">Open dashboard</Link>}
              {!landing && (
                <>
                  <button className="btn-secondary" onClick={() => act("pin", dash.pinnedByMe ? "DELETE" : "POST", dash.pinnedByMe ? "Unpinned" : "Pinned as your Impact page")}>
                    {dash.pinnedByMe ? "Unpin from my Impact page" : "Pin as my Impact page"}
                  </button>
                  <button className="btn-secondary" onClick={() => act("default", dash.isOrgDefault ? "DELETE" : "POST", dash.isOrgDefault ? "No longer the default" : "Set as the organisation default")}>
                    {dash.isOrgDefault ? "Remove as org default" : "Make org default"}
                  </button>
                  <Link href={`/director/insights/reports?new=${id}`} className="btn-secondary">Create report</Link>
                  <button className="btn-primary" onClick={() => { setDraft(structuredClone(dash)); setEditing(true); }}>Edit</button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters + period */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-(--border) p-3 print:hidden" style={{ background: "var(--surface)" }}>
        {dash.filters.map((f) => {
          const ds = datasets.find((d) => d.fields.some((x) => x.key === f.field && x.dimension));
          const field = ds?.fields.find((x) => x.key === f.field);
          if (!ds || !field) return null;
          return (
            <div key={f.field} className="w-56">
              <label className={labelCls}>{f.label}</label>
              <MultiPick dataset={ds.key} field={field} selected={filterValues[f.field] ?? []}
                onChange={(v) => setFilterValues((p) => ({ ...p, [f.field]: v }))} />
            </div>
          );
        })}
        <div className="w-56">
          <label className={labelCls}>Period</label>
          <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value as RangePreset | "own")}>
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        {(filters.length > 0 || period !== "own") && (
          <button className="text-xs text-(--accent) hover:underline pb-2" onClick={() => { setFilterValues({}); setPeriod("own"); }}>Clear</button>
        )}
        {editing && <DashboardFilterEditor datasets={datasets} value={draft!.filters} onChange={(f) => setDraft({ ...draft!, filters: f })} />}
        {loadingTiles && <span className="text-xs text-(--muted) pb-2 ml-auto">Updating…</span>}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-(--border)">
        {dash.tabs.map((t) => (
          <button key={t.id} onClick={() => setTabId(t.id)}
            className="px-3 py-2 text-sm font-medium border-b-2 -mb-px"
            style={{ borderColor: t.id === tab.id ? "var(--accent)" : "transparent", color: t.id === tab.id ? "var(--accent)" : "var(--muted)" }}>
            {editing && t.id === tab.id ? (
              <input className="bg-transparent outline-none w-32" value={t.title}
                onChange={(e) => setDraft({ ...draft!, tabs: draft!.tabs.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)) })} />
            ) : t.title}
          </button>
        ))}
        {editing && (
          <>
            <button className="px-3 py-2 text-sm text-(--accent)" onClick={() => {
              const nt = { id: crypto.randomUUID(), title: "New tab", tiles: [] };
              setDraft({ ...draft!, tabs: [...draft!.tabs, nt] }); setTabId(nt.id);
            }}>+ Tab</button>
            {draft!.tabs.length > 1 && (
              <button className="px-3 py-2 text-sm text-(--muted) hover:text-(--error)" onClick={() => {
                setDraft({ ...draft!, tabs: draft!.tabs.filter((x) => x.id !== tab.id) }); setTabId(null);
              }}>Delete this tab</button>
            )}
          </>
        )}
      </div>

      {/* Tiles */}
      {tab.tiles.length === 0 && (
        <div className="py-12 text-center rounded-2xl border border-dashed border-(--border)">
          <p className="text-sm text-(--muted)">{editing ? "Add charts, KPIs or text to this tab." : "This tab is empty."}</p>
        </div>
      )}
      <div className="grid grid-cols-12 gap-4">
        {tab.tiles.map((tile, i) => (
          <div key={tile.id}
            className="col-span-12 rounded-2xl border border-(--border) p-4 flex flex-col overflow-hidden break-inside-avoid"
            style={{ gridColumn: `span ${tile.w} / span ${tile.w}`, minHeight: tile.h * ROW_PX, background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}
            draggable={editing}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => editing && e.preventDefault()}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData("text/plain"));
              setTab((t) => { const arr = [...t.tiles]; const [m] = arr.splice(from, 1); arr.splice(i, 0, m); return { ...t, tiles: arr }; });
            }}>
            {editing && (
              <TileControls tile={tile}
                onChange={(patch) => setTab((t) => ({ ...t, tiles: t.tiles.map((x) => (x.id === tile.id ? { ...x, ...patch } : x)) }))}
                onRemove={() => setTab((t) => ({ ...t, tiles: t.tiles.filter((x) => x.id !== tile.id) }))} />
            )}
            <TileBody tile={tile} data={tiles[tile.id]} editing={editing}
              onText={(text) => setTab((t) => ({ ...t, tiles: t.tiles.map((x) => (x.id === tile.id ? { ...x, text } : x)) }))}
              onOpenKpi={(kid) => setOpenKpi(kid)} />
          </div>
        ))}
      </div>
      {editing && (
        <button className="btn-secondary w-full" onClick={() => setAdding(true)}>+ Add a chart, KPI or text block</button>
      )}

      {adding && (
        <AddTileDialog onClose={() => setAdding(false)}
          onAdd={(t) => { setTab((x) => ({ ...x, tiles: [...x.tiles, t] })); setAdding(false); }} />
      )}
      {openKpi && <KpiDrawer id={openKpi} onClose={() => setOpenKpi(null)} onChanged={loadTiles} />}
    </div>
  );
}

function TileBody({ tile, data, editing, onText, onOpenKpi }: {
  tile: Tile; data?: TileData; editing: boolean; onText: (t: string) => void; onOpenKpi: (id: string) => void;
}) {
  if (tile.kind === "text") {
    return editing
      ? <textarea className={`${inputCls} flex-1 min-h-20`} value={tile.text ?? ""} onChange={(e) => onText(e.target.value)}
          placeholder="Text for this dashboard. Start a line with # for a heading." />
      : <RichText text={tile.text ?? ""} />;
  }
  if (!data) return <div className="flex-1 animate-pulse rounded-lg" style={{ background: "var(--bg-secondary)" }} />;
  if (data.kind === "error") return <p className="text-sm text-(--error-text)">{data.error}</p>;
  if (data.kind === "kpi") return <KpiCard data={data} onOpen={editing ? undefined : () => onOpenKpi(data.kpi.id)} />;
  if (data.kind === "chart") {
    return (
      <div className="flex-1 flex flex-col">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-(--text)">{data.chart.title}</h3>
            {data.chart.description && <p className="text-xs text-(--muted)">{data.chart.description}</p>}
          </div>
          {!editing && <Link href={`/director/insights/charts/${data.chart.id}`} className="text-[11px] text-(--muted) hover:text-(--accent) print:hidden">Open</Link>}
        </div>
        <div className="flex-1">
          <ChartView type={data.chart.chartType as never} result={data.result} grain={data.chart.grain}
            display={data.chart.display as ChartDisplay} height={Math.max(200, tile.h * ROW_PX - 90)} />
        </div>
      </div>
    );
  }
  return null;
}

function TileControls({ tile, onChange, onRemove }: { tile: Tile; onChange: (p: Partial<Tile>) => void; onRemove: () => void }) {
  const btn = "px-1.5 py-0.5 rounded border border-(--border) text-xs text-(--muted) hover:text-(--text)";
  return (
    <div className="flex items-center gap-1 mb-2 text-xs text-(--muted) cursor-move">
      <span title="Drag to move">⠿</span>
      <span className="ml-1">Width</span>
      <button className={btn} onClick={() => onChange({ w: Math.max(2, tile.w - 1) })}>−</button>
      <span className="w-5 text-center">{tile.w}</span>
      <button className={btn} onClick={() => onChange({ w: Math.min(12, tile.w + 1) })}>+</button>
      <span className="ml-2">Height</span>
      <button className={btn} onClick={() => onChange({ h: Math.max(1, tile.h - 1) })}>−</button>
      <span className="w-5 text-center">{tile.h}</span>
      <button className={btn} onClick={() => onChange({ h: Math.min(6, tile.h + 1) })}>+</button>
      <button className="ml-auto text-xs hover:text-(--error)" onClick={onRemove}>Remove</button>
    </div>
  );
}

function AddTileDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Tile) => void }) {
  const charts = useApi<{ charts: { _id: string; title: string; chartType: string; datasetLabel: string }[] }>("/api/insights/charts");
  const kpis = useApi<{ kpis: TileData[] }>("/api/insights/kpis");
  const [kind, setKind] = useState<"chart" | "kpi" | "text">("chart");
  return (
    <Modal title="Add to dashboard" onClose={onClose}>
      <div className="flex gap-2 mb-3">
        {(["chart", "kpi", "text"] as const).map((k) => (
          <button key={k} className={kind === k ? "btn-primary" : "btn-secondary"} onClick={() => setKind(k)}>
            {k === "kpi" ? "KPI" : k === "chart" ? "Chart" : "Text"}
          </button>
        ))}
      </div>
      {kind === "chart" && (
        <div className="space-y-1 max-h-80 overflow-auto">
          {charts.data?.charts.length === 0 && <p className="text-sm text-(--muted)">No charts yet. <Link className="text-(--accent)" href="/director/insights/charts/new">Make one</Link>.</p>}
          {charts.data?.charts.map((c) => (
            <button key={c._id} className="w-full text-left px-3 py-2 rounded-lg hover:bg-(--bg) text-sm text-(--text)"
              onClick={() => onAdd({ id: crypto.randomUUID(), kind: "chart", refId: c._id, w: c.chartType === "number" ? 3 : 6, h: c.chartType === "number" ? 1 : 3 })}>
              {c.title} <span className="text-xs text-(--muted)">· {c.chartType} · {c.datasetLabel}</span>
            </button>
          ))}
        </div>
      )}
      {kind === "kpi" && (
        <div className="space-y-1 max-h-80 overflow-auto">
          {kpis.data?.kpis.length === 0 && <p className="text-sm text-(--muted)">No KPIs yet. <Link className="text-(--accent)" href="/director/insights/kpis">Create one</Link>.</p>}
          {kpis.data?.kpis.map((k) => k.kind === "kpi" && (
            <button key={k.kpi.id} className="w-full text-left px-3 py-2 rounded-lg hover:bg-(--bg) text-sm text-(--text)"
              onClick={() => onAdd({ id: crypto.randomUUID(), kind: "kpi", refId: k.kpi.id, w: 4, h: 2 })}>
              {k.kpi.name}
            </button>
          ))}
        </div>
      )}
      {kind === "text" && (
        <button className="btn-primary" onClick={() => onAdd({ id: crypto.randomUUID(), kind: "text", text: "# Heading\nA line explaining this section.", w: 12, h: 1 })}>
          Add a text block
        </button>
      )}
    </Modal>
  );
}

function DashboardFilterEditor({ datasets, value, onChange }: {
  datasets: PublicDataset[]; value: { field: string; label: string }[]; onChange: (v: { field: string; label: string }[]) => void;
}) {
  // Offer the dimensions that exist on the case data (they also apply to
  // hearings and any other dataset with the same field key).
  const cases = datasets.find((d) => d.key === "cases");
  const options = (cases?.fields ?? []).filter((f) => f.dimension && f.type === "string");
  return (
    <div className="w-full border-t border-(--border) pt-3 mt-1">
      <p className={labelCls}>Dashboard filters (shown above every tab)</p>
      <div className="flex flex-wrap gap-2">
        {options.map((f) => {
          const on = value.some((v) => v.field === f.key);
          return (
            <label key={f.key} className="inline-flex items-center gap-1.5 text-sm text-(--text)">
              <input type="checkbox" checked={on}
                onChange={() => onChange(on ? value.filter((v) => v.field !== f.key) : [...value, { field: f.key, label: f.label }])} />
              {f.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-2xl border border-(--border) p-5 my-8`} style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-(--text)">{title}</h2>
          <button className="text-(--muted) hover:text-(--text) text-xl leading-none" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
