"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/insights/Modal";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type Row = { _id: string; title: string; dashboardTitle: string; periodStart: string; periodEnd: string; createdAt: string; createdBy?: { name?: string } };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Indian financial year / quarter shortcuts for the report period. */
function presets(now = new Date()) {
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const q = Math.floor(((now.getMonth() + 9) % 12) / 3); // 0 = Apr–Jun
  const qStart = (fy: number, qi: number) => new Date(Date.UTC(fy + Math.floor((3 + qi * 3) / 12), (3 + qi * 3) % 12, 1));
  const prevQ = q === 0 ? { fy: y - 1, qi: 3 } : { fy: y, qi: q - 1 };
  const pqStart = qStart(prevQ.fy, prevQ.qi);
  const pqEnd = new Date(Date.UTC(pqStart.getUTCFullYear(), pqStart.getUTCMonth() + 3, 0));
  return [
    { label: `Last quarter (Q${prevQ.qi + 1} FY${String(prevQ.fy + 1).slice(2)})`, from: iso(pqStart), to: iso(pqEnd) },
    { label: `Last financial year (FY${String(y).slice(2)})`, from: `${y - 1}-04-01`, to: `${y}-03-31` },
    { label: `This financial year so far`, from: `${y}-04-01`, to: iso(now) },
  ];
}

function ReportsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useNotify();
  const { data, loading, error, reload } = useApi<{ reports: Row[] }>("/api/insights/reports");
  const dashboards = useApi<{ dashboards: { _id: string; title: string }[] }>("/api/insights/dashboards");
  const preset = params.get("new");
  const [open, setOpen] = useState(!!preset);
  const [form, setForm] = useState({ title: "", dashboardId: preset ?? "", periodStart: "", periodEnd: "", summary: "" });
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await api<{ report: { _id: string } }>("/api/insights/reports", { body: form });
      router.push(`/director/insights/reports/${res.report._id}`);
    } catch (e) { toast.error((e as Error).message); setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this report?")) return;
    try { await api(`/api/insights/reports/${id}`, { method: "DELETE" }); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="🧾" title="Reports" subtitle="A dashboard frozen for a period, for funders and the board. Comment on it, print it or save it as PDF.">
        <button className="btn-primary" onClick={() => setOpen(true)}>+ New report</button>
      </PageHeader>
      {loading && <p className="text-sm text-(--muted)">Loading…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="rounded-2xl border border-(--border) overflow-hidden" style={{ background: "var(--surface)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
              <th className="px-4 py-2.5 font-medium">Report</th>
              <th className="px-4 py-2.5 font-medium">Period</th>
              <th className="px-4 py-2.5 font-medium">From dashboard</th>
              <th className="px-4 py-2.5 font-medium">Made by</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {(data?.reports ?? []).map((r) => (
              <tr key={r._id} className="border-b border-(--border) last:border-0">
                <td className="px-4 py-2.5"><Link className="font-medium text-(--text) hover:text-(--accent)" href={`/director/insights/reports/${r._id}`}>{r.title}</Link></td>
                <td className="px-4 py-2.5 text-(--muted)">{fmtDay(r.periodStart)} – {fmtDay(r.periodEnd)}</td>
                <td className="px-4 py-2.5 text-(--muted)">{r.dashboardTitle}</td>
                <td className="px-4 py-2.5 text-(--muted)">{r.createdBy?.name ?? "—"} · {fmtDay(r.createdAt)}</td>
                <td className="px-4 py-2.5 text-right"><button className="text-xs text-(--muted) hover:text-(--error)" onClick={() => remove(r._id)}>Delete</button></td>
              </tr>
            ))}
            {!loading && (data?.reports ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-(--muted)">No reports yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="New report" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <div><label className={labelCls}>Title</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q2 FY27 report to the board" /></div>
            <div><label className={labelCls}>Dashboard</label>
              <select className={inputCls} value={form.dashboardId} onChange={(e) => setForm({ ...form, dashboardId: e.target.value })}>
                <option value="">Choose…</option>
                {dashboards.data?.dashboards.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select></div>
            <div>
              <label className={labelCls}>Period</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {presets().map((p) => (
                  <button key={p.label} type="button" className="text-xs px-2 py-1 rounded-full border border-(--border) text-(--text) hover:border-(--accent)"
                    onClick={() => setForm({ ...form, periodStart: p.from, periodEnd: p.to })}>{p.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="date" className={inputCls} value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
                <input type="date" className={inputCls} value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
              </div>
              <p className="text-[11px] text-(--muted) mt-1">Charts count records in this period; KPIs are judged as at the last day.</p>
            </div>
            <div><label className={labelCls}>Executive summary (you can edit it later)</label>
              <textarea className={`${inputCls} min-h-24`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <button className="btn-primary" disabled={saving || !form.title || !form.dashboardId || !form.periodStart || !form.periodEnd} onClick={create}>
              {saving ? "Building the snapshot…" : "Create report"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={null}><ReportsInner /></Suspense>;
}
