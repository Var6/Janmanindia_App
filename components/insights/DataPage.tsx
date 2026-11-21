"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { ChartType, FilterSpec, MeasureSpec, QueryResult, QuerySpec } from "@/lib/insights/types";
import type { QualityResult } from "@/lib/insights/quality";
import PageHeader from "@/components/ui/PageHeader";
import ChartView from "@/components/insights/charts/ChartView";
import Modal from "@/components/insights/Modal";
import { downloadCsv } from "@/lib/insights/export";
import QueryBuilder, { inputCls, labelCls, useDatasets } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type Tab = "health" | "explore" | "metrics" | "import";
const TABS: { key: Tab; label: string }[] = [
  { key: "health", label: "Data health" },
  { key: "explore", label: "Explore" },
  { key: "metrics", label: "Metrics" },
  { key: "import", label: "Imported data" },
];

export default function DataPage() {
  return (
    <Suspense fallback={<p className="text-sm text-(--muted)">Loading…</p>}>
      <DataInner />
    </Suspense>
  );
}

function DataInner() {
  const router = useRouter();
  const params = useSearchParams();
  const check = params.get("check");
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "health") as Tab;
  const go = (t: Tab) => router.replace(`/director/insights/data?tab=${t}`);

  return (
    <div className="space-y-5">
      <PageHeader icon="🗂️" title="Data" subtitle="Check the records behind the numbers, explore them, and bring in data from outside the app" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => go(t.key)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium border"
            style={{
              borderColor: tab === t.key ? "var(--accent)" : "var(--border)",
              background: tab === t.key ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface)",
              color: tab === t.key ? "var(--accent)" : "var(--text)",
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "health" && <HealthTab focus={check} />}
      {tab === "explore" && <ExploreTab />}
      {tab === "metrics" && <MetricsTab />}
      {tab === "import" && <ImportTab />}
    </div>
  );
}

/* ------------------------------ data health ----------------------------- */

const SEVERITY: Record<QualityResult["severity"], { label: string; bg: string; text: string }> = {
  high: { label: "Fix first", bg: "var(--error-bg)", text: "var(--error-text)" },
  medium: { label: "Worth fixing", bg: "var(--warning-bg)", text: "var(--warning-text)" },
  low: { label: "Tidy-up", bg: "var(--info-bg)", text: "var(--info-text)" },
};

function HealthTab({ focus }: { focus: string | null }) {
  const toast = useNotify();
  const { data, error, loading, reload } = useApi<{ checks: QualityResult[] }>("/api/insights/quality");
  const [open, setOpen] = useState<Record<string, boolean>>(focus ? { [focus]: true } : {});
  const [fixing, setFixing] = useState(false);
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data && focusRef.current) focusRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  async function fix(key: string, count: number) {
    if (!window.confirm(`Rewrite ${count} district spelling${count === 1 ? "" : "s"} to the standard name? Each change is logged on the case.`)) return;
    setFixing(true);
    try {
      const r = await api<{ changed: number }>("/api/insights/quality/fix", { body: { check: key } });
      toast.success(`${r.changed} case${r.changed === 1 ? "" : "s"} updated`);
      reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setFixing(false); }
  }

  if (error) return <p className="text-sm text-(--error-text)">{error}</p>;
  if (!data) return <p className="text-sm text-(--muted)">Running the checks…</p>;

  const total = data.checks.reduce((s, c) => s + c.count, 0);
  const clean = data.checks.filter((c) => c.count === 0).length;
  const order = { high: 0, medium: 1, low: 2 };
  const checks = [...data.checks].sort((a, b) => (a.count === 0 ? 1 : 0) - (b.count === 0 ? 1 : 0) || order[a.severity] - order[b.severity] || b.count - a.count);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-(--border) p-4" style={{ background: "var(--surface)" }}>
        <div>
          <p className="text-3xl font-bold tabular-nums text-(--text)">{total.toLocaleString("en-IN")}</p>
          <p className="text-xs text-(--muted)">records to look at</p>
        </div>
        <p className="text-sm text-(--muted) flex-1 min-w-60">
          {`${clean} of ${data.checks.length} checks are clear.`} Every figure in Insights is only as good as these records, so the
          checks marked &ldquo;Fix first&rdquo; skew the dashboards most. Items show case numbers only, never party names.
        </p>
        <button className="btn-secondary" onClick={reload} disabled={loading}>{loading ? "Checking…" : "Run again"}</button>
      </div>

      {checks.map((c) => {
        const sev = SEVERITY[c.severity];
        const isOpen = !!open[c.key];
        return (
          <div key={c.key} ref={c.key === focus ? focusRef : undefined}
            className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: c.key === focus ? "var(--accent)" : "var(--border)" }}>
            <div className="flex flex-wrap items-start gap-3">
              <button className="flex-1 min-w-60 text-left" onClick={() => setOpen({ ...open, [c.key]: !isOpen })} aria-expanded={isOpen}>
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-(--text)">{c.label}</span>
                  {c.count > 0
                    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.text }}>{sev.label}</span>
                    : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Clear</span>}
                </span>
                <span className="block text-xs text-(--muted) mt-1">{c.description}</span>
              </button>
              <span className="text-2xl font-bold tabular-nums text-(--text)">{c.count.toLocaleString("en-IN")}</span>
            </div>
            {isOpen && c.count > 0 && (
              <div className="mt-3 border-t border-(--border) pt-3 space-y-2">
                {c.fixable && (
                  <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                    <p className="text-xs text-(--text) flex-1">These can be corrected in one go. Each case keeps a log entry of the old spelling.</p>
                    <button className="btn-primary" disabled={fixing} onClick={() => fix(c.key, c.count)}>{fixing ? "Fixing…" : "Fix all"}</button>
                  </div>
                )}
                <ul className="divide-y divide-(--border) max-h-96 overflow-auto">
                  {c.items.map((it) => (
                    <li key={it.id} className="py-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                      {it.link
                        ? <Link href={it.link} className="font-medium text-(--text) hover:text-(--accent)">{it.label}</Link>
                        : <span className="font-medium text-(--text)">{it.label}</span>}
                      {it.detail && <span className="text-xs text-(--muted)">{it.detail}</span>}
                    </li>
                  ))}
                </ul>
                {c.items.length < c.count && <p className="text-xs text-(--muted)">Showing the first {c.items.length} of {c.count}.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- explore ------------------------------- */

const VIEWS: { key: ChartType; label: string }[] = [
  { key: "table", label: "Table" },
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
  { key: "pivot", label: "Pivot" },
];


function ExploreTab() {
  const router = useRouter();
  const toast = useNotify();
  const { datasets } = useDatasets();
  const [query, setQuery] = useState<QuerySpec>({ dataset: "cases", measure: { agg: "count" }, groupBy: ["status"], filters: [] });
  const [view, setView] = useState<ChartType>("table");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saveAs, setSaveAs] = useState<"chart" | "metric" | null>(null);
  const [name, setName] = useState("");

  const queryKey = JSON.stringify(query);
  useEffect(() => {
    if (!query.dataset) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<QueryResult>("/api/insights/query", { body: { query: JSON.parse(queryKey) } })
        .then((r) => { if (!cancelled) { setResult(r); setErr(null); } })
        .catch((e: Error) => { if (!cancelled) setErr(e.message); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [queryKey, query.dataset]);

  function download() {
    if (result) downloadCsv(result, `janman-${query.dataset}`);
  }

  async function save() {
    try {
      if (saveAs === "chart") {
        const r = await api<{ chart: { _id: string } }>("/api/insights/charts", {
          body: { title: name, chartType: view, query, display: { showValues: true } },
        });
        toast.success("Chart saved");
        router.push(`/director/insights/charts/${r.chart._id}`);
      } else {
        await api("/api/insights/metrics", { body: { name, dataset: query.dataset, measure: query.measure, filters: query.filters ?? [] } });
        toast.success("Metric saved. You can now build a KPI or an alert on it.");
      }
      setSaveAs(null); setName("");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="rounded-2xl border border-(--border) p-4 space-y-4" style={{ background: "var(--surface)" }}>
        <p className="text-xs text-(--muted)">Ask a question of the data by choosing what to count and how to split it. Nothing here changes any record.</p>
        <QueryBuilder value={query} onChange={setQuery} datasets={datasets} />
      </div>
      <div className="rounded-2xl border border-(--border) p-5 space-y-3 min-h-80" style={{ background: "var(--surface)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-(--border) overflow-hidden">
            {VIEWS.map((v) => (
              <button key={v.key} onClick={() => setView(v.key)} className="px-3 py-1.5 text-xs font-medium"
                style={{ background: view === v.key ? "var(--accent)" : "transparent", color: view === v.key ? "#fff" : "var(--text)" }}>
                {v.label}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <button className="btn-secondary" onClick={download} disabled={!result}>Download CSV</button>
          <button className="btn-secondary" onClick={() => setSaveAs("metric")} disabled={!query.dataset}>Save as metric</button>
          <button className="btn-primary" onClick={() => setSaveAs("chart")} disabled={!result}>Save as chart</button>
        </div>
        {err && <p className="text-sm text-(--error-text)">{err}</p>}
        {!err && result && <ChartView type={view} result={result} grain={query.time?.grain} display={{ showValues: true }} height={340} />}
        {!err && !result && <p className="text-sm text-(--muted)">Choose the data to see results.</p>}
        {result?.truncated && <p className="text-xs text-(--muted)">Only the largest groups are shown.</p>}
      </div>

      {saveAs && (
        <Modal title={saveAs === "chart" ? "Save as chart" : "Save as metric"} onClose={() => setSaveAs(null)}>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus
                placeholder={saveAs === "chart" ? "e.g. Live cases by status" : "e.g. Hearings attended"} />
            </div>
            {saveAs === "metric" && (
              <p className="text-xs text-(--muted)">A metric keeps the measure and filters only (not the grouping), so KPIs and alerts can track it over time.</p>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setSaveAs(null)}>Cancel</button>
              <button className="btn-primary" disabled={!name.trim()} onClick={save}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------- metrics ------------------------------- */

type MetricRow = {
  _id: string; name: string; description?: string; dataset: string; measure: MeasureSpec; filters: FilterSpec[];
  createdBy?: { name?: string }; usedBy: { kind: "kpi" | "alert"; id: string; name: string }[];
};

function describeMeasure(m: MeasureSpec, unit: string, fieldLabel: (k: string) => string) {
  const f = m.field ? fieldLabel(m.field) : "";
  switch (m.agg) {
    case "count": return `Count of ${unit.toLowerCase()}`;
    case "countDistinct": return `Number of different ${f.toLowerCase()}`;
    case "sum": return `Total ${f}`;
    case "avg": return `Average ${f}`;
    case "min": return `Lowest ${f}`;
    case "max": return `Highest ${f}`;
    default: return m.agg;
  }
}

function MetricsTab() {
  const toast = useNotify();
  const { datasets } = useDatasets();
  const { data, error, loading, reload } = useApi<{ metrics: MetricRow[] }>("/api/insights/metrics");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; query: QuerySpec }>({
    name: "", description: "", query: { dataset: "cases", measure: { agg: "count" }, filters: [] },
  });

  async function create() {
    try {
      await api("/api/insights/metrics", {
        body: { name: form.name, description: form.description, dataset: form.query.dataset, measure: form.query.measure, filters: form.query.filters ?? [] },
      });
      toast.success("Metric created");
      setCreating(false);
      setForm({ name: "", description: "", query: { dataset: "cases", measure: { agg: "count" }, filters: [] } });
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(m: MetricRow) {
    if (!window.confirm(`Delete the metric "${m.name}"?`)) return;
    try {
      await api(`/api/insights/metrics/${m._id}`, { method: "DELETE" });
      toast.success("Metric deleted");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-(--muted) flex-1 min-w-60">
          A metric is a single defined number, such as &ldquo;hearings attended&rdquo; or &ldquo;expenses approved&rdquo;. KPIs and alerts are built on metrics,
          so the same definition is used everywhere.
        </p>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New metric</button>
      </div>
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="rounded-2xl border border-(--border) overflow-hidden" style={{ background: "var(--surface)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
              <th className="px-4 py-2.5 font-medium">Metric</th>
              <th className="px-4 py-2.5 font-medium">Counts</th>
              <th className="px-4 py-2.5 font-medium">Filters</th>
              <th className="px-4 py-2.5 font-medium">Used by</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {(data?.metrics ?? []).map((m) => {
              const ds = datasets.find((d) => d.key === m.dataset);
              const fieldLabel = (k: string) => ds?.fields.find((f) => f.key === k)?.label ?? k;
              return (
                <tr key={m._id} className="border-b border-(--border) last:border-0 align-top">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-(--text)">{m.name}</p>
                    {m.description && <p className="text-xs text-(--muted)">{m.description}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-(--muted)">{ds ? describeMeasure(m.measure, ds.unit, fieldLabel) : m.dataset}</td>
                  <td className="px-4 py-2.5 text-(--muted) text-xs">
                    {m.filters.length === 0 ? "None" : m.filters.map((f) => fieldLabel(f.field)).join(", ")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-(--muted)">
                    {m.usedBy.length === 0 ? "Nothing yet" : m.usedBy.map((u) => `${u.kind === "kpi" ? "KPI" : "Alert"}: ${u.name}`).join("; ")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="text-xs text-(--muted) hover:text-(--error) disabled:opacity-40 disabled:hover:text-(--muted)" disabled={m.usedBy.length > 0}
                      title={m.usedBy.length ? "Delete the KPIs and alerts that use it first" : "Delete"} onClick={() => remove(m)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && (data?.metrics ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-(--muted)">No metrics yet. Creating a KPI also creates one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New metric" onClose={() => setCreating(false)} wide>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bail applications filed" />
              </div>
              <div>
                <label className={labelCls}>Description (optional)</label>
                <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <QueryBuilder value={form.query} onChange={(query) => setForm({ ...form, query })} datasets={datasets} measureOnly />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn-primary" disabled={!form.name.trim() || !form.query.dataset} onClick={create}>Create metric</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------- imports ------------------------------- */

type Schedule = "none" | "daily" | "weekly";
type ImportRow = {
  _id: string; name: string; description?: string; source: string; sourceRef?: string;
  columns: { key: string; label: string; type: string }[]; rowCount: number; lastSyncedAt?: string; createdAt: string;
  syncSchedule?: Schedule; lastSyncError?: string;
  createdBy?: { name?: string };
};
type ConnectorInfo = {
  key: string; label: string; blurb: string; refLabel: string; refPlaceholder: string; refHelp: string;
  configured: boolean; missing: string[];
};
type PreviewColumn = { key: string; label: string; type: "string" | "number" | "date" | "boolean"; source: string };
type Preview = { columns: PreviewColumn[]; rowCount: number; sample: Record<string, unknown>[] };
type Pick = { on: boolean; label: string; type: PreviewColumn["type"] };

const SCHEDULE_LABEL: Record<Schedule, string> = { none: "Only when I click refresh", daily: "Every day at 9 am", weekly: "Every Monday at 9 am" };
/** Columns that usually identify a person; unticked by default. */
const PERSONAL = /(name|naam|father|husband|mother|phone|mobile|contact|aadha?ar|address|email|village|gps|location|photo|signature|_id$|^id$)/i;

function ImportTab() {
  const toast = useNotify();
  const { data, error, loading, reload } = useApi<{ imports: ImportRow[]; connectors: ConnectorInfo[] }>("/api/insights/imports");
  const [wizard, setWizard] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const connectors = data?.connectors ?? [];
  const sourceLabel = (key: string) => (key === "csv" ? "Uploaded file" : connectors.find((c) => c.key === key)?.label ?? key);

  async function sync(i: ImportRow) {
    setBusy(i._id);
    try {
      const r = await api<{ rows: number; missingColumns: number }>(`/api/insights/imports/${i._id}/sync`, { method: "POST" });
      toast.success(`${r.rows.toLocaleString("en-IN")} rows loaded${r.missingColumns ? `; ${r.missingColumns} column(s) no longer in the source` : ""}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); reload(); }
  }

  async function setSchedule(i: ImportRow, syncSchedule: Schedule) {
    try {
      await api(`/api/insights/imports/${i._id}`, { method: "PATCH", body: { syncSchedule } });
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(i: ImportRow) {
    if (!window.confirm(`Delete "${i.name}" and all its rows?`)) return;
    try {
      await api(`/api/insights/imports/${i._id}`, { method: "DELETE" });
      toast.success("Dataset deleted");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-(--muted) flex-1 min-w-60">
          Bring in survey results, training attendance or any other table kept outside the app. Imported data shows up as its own
          dataset in Explore, charts, metrics and KPIs. Connected sources can refresh themselves every day or every week. Copilot does
          not read imported data.
        </p>
        <button className="btn-primary" onClick={() => setWizard(true)}>+ Import data</button>
      </div>
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.imports ?? []).map((i) => (
          <div key={i._id} className="rounded-2xl border border-(--border) p-4 space-y-2" style={{ background: "var(--surface)" }}>
            <div className="min-w-0">
              <p className="font-semibold text-(--text) truncate">{i.name}</p>
              <p className="text-xs text-(--muted)">
                {sourceLabel(i.source)} · {i.rowCount.toLocaleString("en-IN")} rows · {i.columns.length} columns
              </p>
            </div>
            {i.description && <p className="text-sm text-(--text)">{i.description}</p>}
            <p className="text-xs text-(--muted)">
              {i.lastSyncedAt ? `Last loaded ${new Date(i.lastSyncedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "Not loaded yet"}
              {i.createdBy?.name ? ` · added by ${i.createdBy.name}` : ""}
            </p>
            {i.lastSyncError && (
              <p className="text-xs rounded-lg px-2 py-1.5" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                The last refresh failed: {i.lastSyncError}
              </p>
            )}
            <p className="text-xs text-(--muted) truncate" title={i.columns.map((c) => c.label).join(", ")}>
              {i.columns.map((c) => c.label).join(", ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {i.source !== "csv" && (
                <>
                  <button className="btn-secondary" disabled={busy === i._id} onClick={() => sync(i)}>{busy === i._id ? "Refreshing…" : "Refresh now"}</button>
                  <select className={`${inputCls} w-auto`} value={i.syncSchedule ?? "none"} aria-label={`How often to refresh ${i.name}`}
                    onChange={(e) => setSchedule(i, e.target.value as Schedule)}>
                    {(Object.keys(SCHEDULE_LABEL) as Schedule[]).map((k) => <option key={k} value={k}>{SCHEDULE_LABEL[k]}</option>)}
                  </select>
                </>
              )}
              <button className="btn-secondary" style={{ color: "var(--error-text)" }} onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && (data?.imports ?? []).length === 0 && (
        <p className="text-sm text-(--muted) rounded-2xl border border-dashed border-(--border) p-8 text-center">No imported data yet.</p>
      )}
      {wizard && <ImportWizard connectors={connectors} onClose={() => setWizard(false)} onDone={() => { setWizard(false); reload(); }} />}
    </div>
  );
}

function ImportWizard({ connectors, onClose, onDone }: { connectors: ConnectorInfo[]; onClose: () => void; onDone: () => void }) {
  const toast = useNotify();
  const [source, setSource] = useState("csv");
  const [ref, setRef] = useState("");
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<Schedule>("none");
  const [busy, setBusy] = useState(false);
  const connector = connectors.find((c) => c.key === source);

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 15_000_000) { toast.error("That file is too large (15 MB limit)"); return; }
    setPreview(null);
    try {
      if (/\.xlsx$/i.test(f.name)) {
        const { readXlsx, rowsToCsv } = await import("@/lib/insights/xlsx");
        setCsv(rowsToCsv(await readXlsx(await f.arrayBuffer())));
      } else if (/\.xls$/i.test(f.name)) {
        toast.error("Older .xls files cannot be read. Open it in Excel and save it as .xlsx or CSV.");
        return;
      } else {
        setCsv(await f.text());
      }
      setFileName(f.name);
      if (!name) setName(f.name.replace(/\.(csv|xlsx)$/i, ""));
    } catch (e) { toast.error((e as Error).message); }
  }

  async function load() {
    setBusy(true);
    try {
      const p = await api<Preview>("/api/insights/imports/preview", { body: { source, ref: source === "csv" ? undefined : ref, csv: source === "csv" ? csv : undefined } });
      setPreview(p);
      setPicks(Object.fromEntries(p.columns.map((c) => [c.source, { on: !PERSONAL.test(c.source), label: c.label, type: c.type }])));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    try {
      const columns = Object.entries(picks).filter(([, p]) => p.on).map(([src, p]) => ({ source: src, label: p.label, type: p.type }));
      const r = await api<{ import: { rows: number } }>("/api/insights/imports", {
        body: { name, description, source, ref: source === "csv" ? undefined : ref, csv: source === "csv" ? csv : undefined, columns, syncSchedule: schedule },
      });
      toast.success(`${r.import.rows.toLocaleString("en-IN")} rows imported`);
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const chosen = Object.values(picks).filter((p) => p.on).length;
  const ready = source === "csv" ? !!csv : !!ref.trim() && !!connector?.configured;

  return (
    <Modal title="Import data" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[{ key: "csv", label: "CSV or Excel file", blurb: "Upload from this computer", configured: true }, ...connectors].map((s) => (
            <button key={s.key} onClick={() => { setSource(s.key); setPreview(null); setRef(""); }} className="rounded-lg border px-3 py-2 text-left"
              style={{ borderColor: source === s.key ? "var(--accent)" : "var(--border)", opacity: s.configured ? 1 : 0.6 }}>
              <span className="block text-sm font-medium" style={{ color: source === s.key ? "var(--accent)" : "var(--text)" }}>{s.label}</span>
              <span className="block text-[11px] text-(--muted)">{s.configured ? s.blurb : "Not connected yet"}</span>
            </button>
          ))}
        </div>

        {source === "csv" && (
          <div>
            <label className={labelCls}>CSV or Excel (.xlsx) file</label>
            <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="text-sm text-(--text)"
              onChange={(e) => readFile(e.target.files?.[0])} />
            {fileName && <p className="text-xs text-(--muted) mt-1">{fileName}</p>}
            <p className="text-xs text-(--muted) mt-1">
              The first row must be the column headings. From Excel, the first sheet is read. In a CSV, dates are read as day/month/year.
              The file is read in your browser; only the columns you keep are stored.
            </p>
          </div>
        )}
        {connector && (
          <div>
            {!connector.configured && (
              <p className="text-sm rounded-lg p-3 mb-3" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                {connector.label} is not connected yet. Whoever runs the server needs to add {connector.missing.join(", ")} to the app&rsquo;s settings.
              </p>
            )}
            <label className={labelCls}>{connector.refLabel}</label>
            <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={connector.refPlaceholder} disabled={!connector.configured} />
            <p className="text-xs text-(--muted) mt-1">{connector.refHelp}</p>
          </div>
        )}

        <button className="btn-secondary" disabled={!ready || busy} onClick={load}>{busy && !preview ? "Reading…" : "Read the data"}</button>

        {preview && (
          <div className="space-y-4 border-t border-(--border) pt-4">
            <p className="text-sm text-(--text)">
              {preview.rowCount.toLocaleString("en-IN")} rows found. Tick the columns to keep. Columns that look like names, phone numbers,
              addresses or IDs start unticked; leave them out unless you need them, because anyone with Insights access can see imported values.
            </p>
            <div className="max-h-80 overflow-auto rounded-lg border border-(--border)">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
                    <th className="px-3 py-2 w-10" />
                    <th className="px-3 py-2 font-medium">Column</th>
                    <th className="px-3 py-2 font-medium">Show as</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((c) => {
                    const p = picks[c.source];
                    if (!p) return null;
                    const set = (patch: Partial<Pick>) => setPicks({ ...picks, [c.source]: { ...p, ...patch } });
                    const example = preview.sample.map((r) => r[c.source]).find((v) => v !== null && v !== undefined && v !== "");
                    return (
                      <tr key={c.source} className="border-b border-(--border) last:border-0" style={{ opacity: p.on ? 1 : 0.55 }}>
                        <td className="px-3 py-1.5"><input type="checkbox" checked={p.on} onChange={(e) => set({ on: e.target.checked })} aria-label={`Keep ${c.source}`} /></td>
                        <td className="px-3 py-1.5 text-xs text-(--muted)">{c.source}</td>
                        <td className="px-3 py-1.5"><input className={inputCls} value={p.label} onChange={(e) => set({ label: e.target.value })} disabled={!p.on} /></td>
                        <td className="px-3 py-1.5">
                          <select className={inputCls} value={p.type} onChange={(e) => set({ type: e.target.value as Pick["type"] })} disabled={!p.on}>
                            <option value="string">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Yes / no</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-(--muted) max-w-48 truncate">{p.on && example !== undefined ? String(example) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Dataset name</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Legal literacy camps 2026" />
              </div>
              <div>
                <label className={labelCls}>Description (optional)</label>
                <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {source !== "csv" && (
                <div>
                  <label className={labelCls}>Refresh from the source</label>
                  <select className={inputCls} value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)}>
                    {(Object.keys(SCHEDULE_LABEL) as Schedule[]).map((k) => <option key={k} value={k}>{SCHEDULE_LABEL[k]}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={busy || !name.trim() || chosen === 0} onClick={save}>
                {busy ? "Importing…" : `Import ${chosen} column${chosen === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
