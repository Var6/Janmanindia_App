import { getStaticDataset, publicDataset } from "@/lib/insights/datasets";
import type { DashboardFilterType, IInsightDashboard } from "@/models/InsightDashboard";

type PublicField = ReturnType<typeof publicDataset>["fields"][number];
export type SharedFilterDef = { field: string; label: string; type: DashboardFilterType; dataset?: string; def?: PublicField };

/** The filters a shared dashboard exposes. Pick-a-value filters carry the
 *  field's definition (they are fields of the case data); number and date
 *  ranges need only their label. */
export function filterDefs(d: Pick<IInsightDashboard, "filters">): SharedFilterDef[] {
  const cases = getStaticDataset("cases");
  const pub = cases ? publicDataset(cases) : null;
  const out: SharedFilterDef[] = [];
  for (const f of d.filters ?? []) {
    const type = f.type ?? "value";
    if (type !== "value") { out.push({ field: f.field, label: f.label, type }); continue; }
    const def = pub?.fields.find((x) => x.key === f.field && x.dimension);
    if (def) out.push({ field: f.field, label: f.label, type, dataset: "cases", def });
  }
  return out;
}
