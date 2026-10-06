"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";
import { Modal } from "@/components/insights/DashboardView";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type Row = { _id: string; title: string; description?: string; isOrgDefault: boolean; pinnedByMe: boolean; tileCount: number; tabCount: number; updatedAt: string; createdBy?: { name?: string } };

export default function DashboardsPage() {
  const router = useRouter();
  const toast = useNotify();
  const { data, loading, error, reload } = useApi<{ dashboards: Row[] }>("/api/insights/dashboards");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function create() {
    try {
      const res = await api<{ dashboard: { _id: string } }>("/api/insights/dashboards", { body: { title, description } });
      router.push(`/director/insights/dashboards/${res.dashboard._id}`);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this dashboard? Reports made from it keep their snapshot.")) return;
    try { await api(`/api/insights/dashboards/${id}`, { method: "DELETE" }); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="🗂️" title="Dashboards" subtitle="Charts and KPIs together, with tabs and filters">
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New dashboard</button>
      </PageHeader>
      {loading && <p className="text-sm text-(--muted)">Loading…</p>}
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.dashboards ?? []).map((d) => (
          <div key={d._id} className="rounded-2xl border border-(--border) p-4 card-lift flex flex-col gap-2" style={{ background: "var(--surface)" }}>
            <Link href={`/director/insights/dashboards/${d._id}`} className="text-base font-semibold text-(--text) hover:text-(--accent)">{d.title}</Link>
            {d.description && <p className="text-sm text-(--muted)">{d.description}</p>}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {d.isOrgDefault && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Org default</span>}
              {d.pinnedByMe && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>Your Impact page</span>}
              <span className="px-2 py-0.5 rounded-full text-(--muted)" style={{ background: "var(--bg-secondary)" }}>{d.tabCount} tabs · {d.tileCount} tiles</span>
            </div>
            <div className="flex items-center justify-between mt-auto pt-2 text-xs text-(--muted)">
              <span>{d.createdBy?.name ?? ""} · {new Date(d.updatedAt).toLocaleDateString("en-IN")}</span>
              <button className="hover:text-(--error)" onClick={() => remove(d._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && (data?.dashboards ?? []).length === 0 && (
        <div className="py-12 text-center rounded-2xl border border-dashed border-(--border)">
          <p className="text-sm text-(--muted)">No dashboards yet. The Impact tab can build a starter one for you.</p>
        </div>
      )}
      {creating && (
        <Modal title="New dashboard" onClose={() => setCreating(false)}>
          <div className="space-y-3">
            <div><label className={labelCls}>Title</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className={labelCls}>What it is for (optional)</label><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <button className="btn-primary" disabled={!title.trim()} onClick={create}>Create and add tiles</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
