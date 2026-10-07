import { getStaticDataset, publicDataset } from "@/lib/insights/datasets";
import type { IInsightDashboard } from "@/models/InsightDashboard";

/** The filter fields a shared dashboard exposes, with their definitions
 *  (dashboard filters are fields of the case data). */
export function filterDefs(d: Pick<IInsightDashboard, "filters">) {
  const cases = getStaticDataset("cases");
  const pub = cases ? publicDataset(cases) : null;
  return (d.filters ?? []).flatMap((f) => {
    const def = pub?.fields.find((x) => x.key === f.field && x.dimension);
    return def ? [{ field: f.field, label: f.label, dataset: "cases", def }] : [];
  });
}
