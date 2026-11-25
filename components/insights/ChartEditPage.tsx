"use client";

import Link from "next/link";
import { useApi } from "@/lib/insights/client";
import ChartBuilder from "@/components/insights/ChartBuilder";
import type { ChartType, QuerySpec } from "@/lib/insights/types";
import type { ChartDisplay } from "@/components/insights/charts/ChartView";

type Chart = { _id: string; title: string; description?: string; chartType: ChartType; query: QuerySpec; display: ChartDisplay };

export default function ChartEditPage({ id }: { id: string }) {
  const isNew = id === "new";
  const { data, error } = useApi<{ chart: Chart }>(isNew ? null : `/api/insights/charts/${id}`);
  return (
    <div className="space-y-4">
      <Link href="/director/insights/charts" className="text-sm text-(--muted) hover:text-(--accent)">← All charts</Link>
      {error && <p className="text-sm text-(--error-text)">{error}</p>}
      {isNew ? <ChartBuilder /> : data ? <ChartBuilder key={data.chart._id} initial={data.chart} /> : !error && <p className="text-sm text-(--muted)">Loading…</p>}
    </div>
  );
}
