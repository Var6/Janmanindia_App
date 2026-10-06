"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { TileData } from "@/lib/insights/tiles";
import PageHeader from "@/components/ui/PageHeader";
import { Modal } from "@/components/insights/DashboardView";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type Ref = { _id: string; name: string } | null;
type Alert = {
  _id: string; name: string; kind: "kpi_rag" | "metric_threshold" | "data_quality"; enabled: boolean;
  kpi?: Ref; ragStates?: string[]; metric?: Ref; comparator?: string; threshold?: number; rangePreset?: string; qualityCheck?: string;
  frequency: "daily" | "weekly" | "monthly"; dayOf?: number; recipients: { _id: string; name: string }[];
  lastRunAt?: string; lastFiredAt?: string; fireStreak: number; log: { at: string; fired: boolean; message: string }[];
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RAGS = [{ k: "off_track", l: "Off track" }, { k: "attention", l: "Needs attention" }, { k: "on_track", l: "On track" }, { k: "no_data", l: "No data" }];
const CMPS = [{ k: "gt", l: "above" }, { k: "gte", l: "at or above" }, { k: "lt", l: "below" }, { k: "lte", l: "at or below" }];
const PRESETS = [
  { k: "all", l: "all time" }, { k: "this_month", l: "this month" }, { k: "last_30_days", l: "the last 30 days" },
  { k: "last_90_days", l: "the last 90 days" }, { k: "this_fy", l: "this financial year" },
];

function schedule(a: Pick<Alert, "frequency" | "dayOf">) {
  if (a.frequency === "daily") return "Every day, 9 am";
  if (a.frequency === "weekly") return `Every ${WEEKDAYS[(a.dayOf ?? 1) - 1]}, 9 am`;
  return `Monthly on the ${a.dayOf ?? 1}${a.dayOf === 31 ? " (or last day)" : ""}, 9 am`;
}

export default function AlertsPage() {
  const toast = useNotify();
  const { data, loading, error, reload } = useApi<{ alerts: Alert[] }>("/api/insights/alerts");
  const [editing, setEditing] = useState<Alert | "new" | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; fired: boolean; message: string } | null>(null);

  async function toggle(a: Alert) {
    try { await api(`/api/insights/alerts/${a._id}`, { method: "PATCH", body: { enabled: !a.enabled } }); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function test(a: Alert) {
    try {
      const r = await api<{ fired: boolean; message: string }>(`/api/insights/alerts/${a._id}/run?notify=0`, { method: "POST" });
      setTestResult({ id: a._id, ...r }); reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(a: Alert) {
    if (!window.confirm(`Delete the alert "${a.name}"?`)) return;
    try { await api(`/api/insights/alerts/${a._id}`, { method: "DELETE" }); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="🔔" title="Alerts" subtitle="Checks that run on a schedule and notify people in the app when something needs attention">
        <button className="btn-primary" onClick={() => setEditing("new")}>+ New alert</button>
      </PageHeader>
      {loading && <p className="text-sm text-(--muted)">Loading…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="space-y-3">
        {(data?.alerts ?? []).map((a) => (
          <div key={a._id} className="rounded-2xl border border-(--border) p-4" style={{ background: "var(--surface)", opacity: a.enabled ? 1 : 0.65 }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-(--text)">{a.name}</p>
                <p className="text-xs text-(--muted) mt-0.5">
                  {a.kind === "kpi_rag" && `KPI “${a.kpi?.name ?? "deleted"}” is ${(a.ragStates ?? []).map((s) => RAGS.find((r) => r.k === s)?.l.toLowerCase()).join(" or ")}`}
                  {a.kind === "metric_threshold" && `“${a.metric?.name ?? "deleted"}” over ${PRESETS.find((p) => p.k === a.rangePreset)?.l ?? "all time"} is ${CMPS.find((c) => c.k === a.comparator)?.l} ${a.threshold}`}
                  {a.kind === "data_quality" && `Data health: ${a.qualityCheck?.replace(/_/g, " ")} finds anything`}
                  {" · "}{schedule(a)} · to {a.recipients.map((r) => r.name).join(", ")}
                </p>
                <p className="text-xs text-(--muted) mt-0.5">
                  {a.lastRunAt ? `Last checked ${new Date(a.lastRunAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "Not run yet"}
                  {a.fireStreak > 0 ? ` · fired ${a.fireStreak} time${a.fireStreak > 1 ? "s" : ""} in a row` : ""}
                </p>
                {testResult?.id === a._id && (
                  <p className="text-xs mt-2 rounded-lg px-2 py-1 inline-block" style={{ background: testResult.fired ? "var(--warning-bg)" : "var(--success-bg)", color: testResult.fired ? "var(--warning-text)" : "var(--success-text)" }}>
                    {testResult.fired ? "Would fire: " : "Would not fire: "}{testResult.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-(--text)"><input type="checkbox" checked={a.enabled} onChange={() => toggle(a)} /> On</label>
                <button className="btn-secondary" onClick={() => test(a)}>Test now</button>
                <button className="btn-secondary" onClick={() => setEditing(a)}>Edit</button>
                <button className="text-xs text-(--muted) hover:text-(--error)" onClick={() => remove(a)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && (data?.alerts ?? []).length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-(--border)">
            <p className="text-sm text-(--muted)">No alerts yet. A good first one: tell the litigation lead every Monday when live cases have past hearing dates.</p>
          </div>
        )}
      </div>
      {editing && <AlertForm alert={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function AlertForm({ alert, onClose, onSaved }: { alert?: Alert; onClose: () => void; onSaved: () => void }) {
  const toast = useNotify();
  const kpis = useApi<{ kpis: TileData[] }>("/api/insights/kpis");
  const metrics = useApi<{ metrics: { _id: string; name: string }[] }>("/api/insights/metrics");
  const checks = useApi<{ checks: { key: string; label: string }[] }>("/api/insights/quality?list=1");
  const users = useApi<{ users: { _id: string; name: string; role: string; isActive?: boolean }[] }>("/api/users");
  const [f, setF] = useState({
    name: alert?.name ?? "",
    kind: alert?.kind ?? "data_quality",
    kpi: alert?.kpi?._id ?? "",
    ragStates: alert?.ragStates ?? ["off_track"],
    metric: alert?.metric?._id ?? "",
    comparator: alert?.comparator ?? "gt",
    threshold: alert?.threshold ?? 0,
    rangePreset: alert?.rangePreset ?? "all",
    qualityCheck: alert?.qualityCheck ?? "stale_hearings",
    frequency: alert?.frequency ?? "weekly",
    dayOf: alert?.dayOf ?? 1,
    recipients: alert?.recipients.map((r) => r._id) ?? [],
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const staff = (users.data?.users ?? []).filter((u) => u.role !== "community" && u.isActive !== false);

  async function save() {
    try {
      if (alert) await api(`/api/insights/alerts/${alert._id}`, { method: "PATCH", body: f });
      else await api("/api/insights/alerts", { body: f });
      toast.success("Alert saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Modal title={alert ? "Edit alert" : "New alert"} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={labelCls}>Name</label>
          <input className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Stale hearing dates – weekly" /></div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Watch</label>
          <div className="flex flex-wrap gap-2">
            {([["data_quality", "A data-health check"], ["kpi_rag", "A KPI's status"], ["metric_threshold", "A metric crossing a number"]] as const).map(([k, l]) => (
              <button key={k} className={f.kind === k ? "btn-primary" : "btn-secondary"} onClick={() => set({ kind: k })}>{l}</button>
            ))}
          </div>
        </div>

        {f.kind === "data_quality" && (
          <div className="sm:col-span-2"><label className={labelCls}>Check</label>
            <select className={inputCls} value={f.qualityCheck} onChange={(e) => set({ qualityCheck: e.target.value })}>
              {checks.data?.checks.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <p className="text-[11px] text-(--muted) mt-1">Fires when the check finds one or more records.</p>
          </div>
        )}
        {f.kind === "kpi_rag" && (
          <>
            <div><label className={labelCls}>KPI</label>
              <select className={inputCls} value={f.kpi} onChange={(e) => set({ kpi: e.target.value })}>
                <option value="">Choose…</option>
                {kpis.data?.kpis.map((k) => k.kind === "kpi" && <option key={k.kpi.id} value={k.kpi.id}>{k.kpi.name}</option>)}
              </select></div>
            <div><label className={labelCls}>Alert when it is</label>
              <div className="flex flex-wrap gap-3 pt-2">
                {RAGS.map((r) => (
                  <label key={r.k} className="inline-flex items-center gap-1.5 text-sm text-(--text)">
                    <input type="checkbox" checked={f.ragStates.includes(r.k)}
                      onChange={() => set({ ragStates: f.ragStates.includes(r.k) ? f.ragStates.filter((x) => x !== r.k) : [...f.ragStates, r.k] })} />
                    {r.l}
                  </label>
                ))}
              </div></div>
          </>
        )}
        {f.kind === "metric_threshold" && (
          <>
            <div><label className={labelCls}>Metric</label>
              <select className={inputCls} value={f.metric} onChange={(e) => set({ metric: e.target.value })}>
                <option value="">Choose…</option>
                {metrics.data?.metrics.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select></div>
            <div><label className={labelCls}>Counted over</label>
              <select className={inputCls} value={f.rangePreset} onChange={(e) => set({ rangePreset: e.target.value })}>
                {PRESETS.map((p) => <option key={p.k} value={p.k}>{p.l}</option>)}
              </select></div>
            <div><label className={labelCls}>Alert when it is</label>
              <select className={inputCls} value={f.comparator} onChange={(e) => set({ comparator: e.target.value })}>
                {CMPS.map((c) => <option key={c.k} value={c.k}>{c.l}</option>)}
              </select></div>
            <div><label className={labelCls}>This number</label>
              <input type="number" className={inputCls} value={f.threshold} onChange={(e) => set({ threshold: Number(e.target.value) })} /></div>
          </>
        )}

        <div><label className={labelCls}>How often</label>
          <select className={inputCls} value={f.frequency} onChange={(e) => set({ frequency: e.target.value as Alert["frequency"] })}>
            <option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
          </select></div>
        {f.frequency === "weekly" && (
          <div><label className={labelCls}>On</label>
            <select className={inputCls} value={f.dayOf} onChange={(e) => set({ dayOf: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select></div>
        )}
        {f.frequency === "monthly" && (
          <div><label className={labelCls}>Day of the month</label>
            <input type="number" min={1} max={31} className={inputCls} value={f.dayOf} onChange={(e) => set({ dayOf: Number(e.target.value) })} /></div>
        )}
        <div className="sm:col-span-2"><label className={labelCls}>Notify (in the app&apos;s notification bell)</label>
          <div className="max-h-48 overflow-auto rounded-lg border border-(--border) p-2 grid sm:grid-cols-2 gap-1">
            {staff.map((u) => (
              <label key={u._id} className="inline-flex items-center gap-1.5 text-sm text-(--text)">
                <input type="checkbox" checked={f.recipients.includes(u._id)}
                  onChange={() => set({ recipients: f.recipients.includes(u._id) ? f.recipients.filter((x) => x !== u._id) : [...f.recipients, u._id] })} />
                {u.name} <span className="text-xs text-(--muted)">{u.role}</span>
              </label>
            ))}
          </div></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save}>{alert ? "Save alert" : "Create alert"}</button>
      </div>
    </Modal>
  );
}
