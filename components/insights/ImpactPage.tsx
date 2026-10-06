"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import DashboardView from "@/components/insights/DashboardView";
import { useNotify } from "@/components/insights/useNotify";

/** The Impact page: whichever dashboard the user pinned, else the
 *  organisation default, else a starting point. */
export default function ImpactPage() {
  const toast = useNotify();
  const { data, error, loading, reload } = useApi<{ dashboardId: string | null; source: string }>("/api/insights/landing");
  const [building, setBuilding] = useState(false);

  if (loading) return <p className="text-sm text-(--muted)">Loading…</p>;
  if (error) return <p className="text-sm text-(--error-text)">{error}</p>;
  if (data?.dashboardId) return <DashboardView id={data.dashboardId} landing />;

  async function starter() {
    setBuilding(true);
    try {
      const res = await api<{ created: { kpis: number; charts: number } }>("/api/insights/starter", { method: "POST" });
      toast.success(`Starter dashboard ready: ${res.created.kpis} KPIs and ${res.created.charts} charts`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-(--border) p-8 text-center max-w-2xl mx-auto" style={{ background: "var(--surface)" }}>
      <p className="text-3xl mb-3">📊</p>
      <h1 className="text-xl font-bold text-(--text)">No Impact page set yet</h1>
      <p className="text-sm text-(--muted) mt-2">
        The Impact page shows one dashboard: the one you pin, or the one set as the organisation default.
        Start with the Janman starter set, built on the cases, hearings, activities and expenses already in the app,
        and change it to suit.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <button className="btn-primary" disabled={building} onClick={starter}>{building ? "Building…" : "Create the starter dashboard"}</button>
        <Link href="/director/insights/dashboards" className="btn-secondary">Choose a dashboard</Link>
      </div>
    </div>
  );
}
