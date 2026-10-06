import { randomUUID } from "crypto";
import InsightChart from "@/models/InsightChart";
import InsightDashboard from "@/models/InsightDashboard";
import InsightKpi from "@/models/InsightKpi";
import InsightMetric from "@/models/InsightMetric";
import type { ChartType, FilterSpec, Grain, KpiType, MeasureSpec, QuerySpec } from "@/lib/insights/types";

/**
 * The Janman starter set: metrics, KPIs, charts and a five-tab dashboard
 * built on data the app already holds. Targets are placeholders to edit.
 */

export const STARTER_TITLE = "Janman Impact";

type KpiSeed = {
  name: string; description: string; dataset: string; measure?: MeasureSpec; filters?: FilterSpec[];
  timeField: string; grain: Grain; target: number; direction?: "higher" | "lower"; kpiType: KpiType; tags: string[];
  numberFormat?: "indian" | "currency" | "compact_indian";
};

const KPIS: KpiSeed[] = [
  { name: "Cases taken up", description: "New cases Janman took up (excludes imported existing cases).", dataset: "cases",
    filters: [{ field: "origin", op: "in", value: ["Taken up by Janman"] }], timeField: "createdAt", grain: "month", target: 10, kpiType: "output", tags: ["Litigation"] },
  { name: "Hearings attended", description: "Hearings logged on cases.", dataset: "hearings", timeField: "date", grain: "month", target: 40, kpiType: "output", tags: ["Litigation"] },
  { name: "Cases disposed", description: "Cases marked disposed, by the date of disposal.", dataset: "cases",
    filters: [{ field: "status", op: "in", value: ["Disposal"] }], timeField: "disposedAt", grain: "quarter", target: 15, kpiType: "outcome", tags: ["Litigation"] },
  { name: "Camps, trainings and outreach done", description: "Activities in the training or outreach category marked done.", dataset: "activities",
    filters: [{ field: "category", op: "in", value: ["training", "outreach"] }, { field: "status", op: "in", value: ["done"] }],
    timeField: "completedAt", grain: "month", target: 4, kpiType: "output", tags: ["Outreach"] },
  { name: "Care plans opened", description: "New psychosocial care plans for clients.", dataset: "carePlans", timeField: "createdAt", grain: "month", target: 5, kpiType: "output", tags: ["Psychosocial"] },
  { name: "Daily reports filed", description: "Staff daily reports filed per week.", dataset: "dailyReports", timeField: "day", grain: "week", target: 100, kpiType: "input", tags: ["Team"] },
  { name: "Money paid out", description: "Expense claims paid, by payment date.", dataset: "expenses", measure: { agg: "sum", field: "amount" },
    filters: [{ field: "status", op: "in", value: ["paid"] }], timeField: "paidAt", grain: "month", target: 100000, kpiType: "input", tags: ["Finance"], numberFormat: "currency" },
];

type ChartSeed = { key: string; title: string; description?: string; chartType: ChartType; query: QuerySpec; display?: Record<string, unknown> };

const LIVE: FilterSpec = { field: "live", op: "in", value: ["Live"] };

const CHARTS: ChartSeed[] = [
  { key: "liveTotal", title: "Live cases", chartType: "number", query: { dataset: "cases", measure: { agg: "count" }, filters: [LIVE] } },
  { key: "staleTotal", title: "Live cases with a past hearing date", description: "Next hearing date has passed and nothing newer is recorded.",
    chartType: "number", query: { dataset: "cases", measure: { agg: "count" }, filters: [{ field: "hearingOverdue", op: "isTrue" }] } },
  { key: "noHearingTotal", title: "Live cases with no next hearing", chartType: "number",
    query: { dataset: "cases", measure: { agg: "count" }, filters: [LIVE, { field: "hasNextHearing", op: "isFalse" }] } },
  { key: "map", title: "Live cases by district", chartType: "map", query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["district"], filters: [LIVE] } },
  { key: "byStatus", title: "All cases by status", chartType: "pie", query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["status"] } },
  { key: "byLawyer", title: "Live cases per lawyer", description: "A case with two lawyers counts for both.", chartType: "bar",
    query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["lawyer"], filters: [LIVE] }, display: { horizontal: true, topN: 20 } },
  { key: "intake", title: "Cases added each month", chartType: "bar",
    query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["forum"], time: { field: "createdAt", grain: "month" }, range: { preset: "last_12_months" } },
    display: { stacked: true } },
  { key: "typeByDistrict", title: "Live cases: type by district", chartType: "pivot",
    query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["district", "caseType"], filters: [LIVE] } },
  { key: "hearings", title: "Hearings logged each month", chartType: "line",
    query: { dataset: "hearings", measure: { agg: "count" }, time: { field: "date", grain: "month" }, range: { preset: "last_12_months" } } },
  { key: "staleByLawyer", title: "Past hearing dates, by lawyer", description: "Live cases whose next hearing date has passed.", chartType: "bar",
    query: { dataset: "cases", measure: { agg: "count" }, groupBy: ["lawyer"], filters: [{ field: "hearingOverdue", op: "isTrue" }] }, display: { horizontal: true } },
  { key: "spend", title: "Money paid, by category", chartType: "bar",
    query: { dataset: "expenses", measure: { agg: "sum", field: "amount" }, groupBy: ["category"], filters: [{ field: "status", op: "in", value: ["paid"] }] },
    display: { numberFormat: "currency" } },
  { key: "activities", title: "Activities by status", chartType: "pie", query: { dataset: "activities", measure: { agg: "count" }, groupBy: ["status"] } },
  { key: "unspecified", title: "Cases with no usable district", description: "District blank or just \"Bihar\", and no district in the court name.",
    chartType: "number", query: { dataset: "cases", measure: { agg: "count" }, filters: [{ field: "district", op: "in", value: ["Unspecified"] }] } },
  { key: "selfVerified", title: "Expense claims verified by the person who filed them", chartType: "number",
    query: { dataset: "expenses", measure: { agg: "count" }, filters: [{ field: "selfVerified", op: "isTrue" }] } },
  { key: "noClient", title: "Live cases with no client linked", chartType: "number",
    query: { dataset: "cases", measure: { agg: "count" }, filters: [LIVE, { field: "hasClient", op: "isFalse" }] } },
];

export async function buildStarter(userId: string, makeDefault: boolean) {
  const kpiIds: string[] = [];
  for (const k of KPIS) {
    const metric = await InsightMetric.create({
      name: k.name, description: k.description, dataset: k.dataset,
      measure: k.measure ?? { agg: "count" }, filters: k.filters ?? [], createdBy: userId,
    });
    const kpi = await InsightKpi.create({
      name: k.name, description: k.description, metric: metric._id, timeField: k.timeField, grain: k.grain,
      target: k.target, direction: k.direction ?? "higher", kpiType: k.kpiType, programTags: k.tags,
      numberFormat: k.numberFormat ?? "indian", onTrackPct: 90, attentionPct: 70, createdBy: userId,
    });
    kpiIds.push(String(kpi._id));
  }

  const chart: Record<string, string> = {};
  for (const c of CHARTS) {
    const doc = await InsightChart.create({
      title: c.title, description: c.description, chartType: c.chartType, query: c.query,
      display: { showValues: true, ...(c.display ?? {}) }, createdBy: userId,
    });
    chart[c.key] = String(doc._id);
  }

  const t = (kind: "chart" | "kpi" | "text", w: number, h: number, refId?: string, text?: string) => ({ id: randomUUID(), kind, refId, text, w, h });
  const tabs = [
    {
      id: "overview", title: "Overview",
      tiles: [
        t("text", 12, 1, undefined, "# Janman at a glance\nCases, hearings and outreach this period. Targets are placeholders: open a KPI to set the real one."),
        t("chart", 4, 1, chart.liveTotal), t("chart", 4, 1, chart.staleTotal), t("chart", 4, 1, chart.noHearingTotal),
        t("kpi", 4, 2, kpiIds[0]), t("kpi", 4, 2, kpiIds[1]), t("kpi", 4, 2, kpiIds[2]),
        t("kpi", 4, 2, kpiIds[3]), t("kpi", 4, 2, kpiIds[4]), t("kpi", 4, 2, kpiIds[6]),
      ],
    },
    {
      id: "reach", title: "Reach",
      tiles: [t("chart", 7, 4, chart.map), t("chart", 5, 4, chart.byStatus), t("chart", 12, 4, chart.typeByDistrict)],
    },
    {
      id: "litigation", title: "Litigation",
      tiles: [t("chart", 6, 4, chart.byLawyer), t("chart", 6, 4, chart.staleByLawyer), t("chart", 6, 3, chart.intake), t("chart", 6, 3, chart.hearings)],
    },
    {
      id: "ops", title: "Team and money",
      tiles: [t("kpi", 4, 2, kpiIds[5]), t("chart", 8, 3, chart.spend), t("chart", 6, 3, chart.activities)],
    },
    {
      id: "health", title: "Data health",
      tiles: [
        t("text", 12, 1, undefined, "# Data health\nThese should all be zero. The Data tab lists the records behind each number so they can be fixed."),
        t("chart", 3, 1, chart.unspecified), t("chart", 3, 1, chart.noHearingTotal), t("chart", 3, 1, chart.noClient), t("chart", 3, 1, chart.selfVerified),
      ],
    },
  ];

  const dashboard = await InsightDashboard.create({
    title: STARTER_TITLE,
    description: "Reach, litigation, outreach and money, from the cases and records in this app.",
    tabs,
    filters: [{ field: "district", label: "District" }, { field: "lawyer", label: "Lawyer" }],
    isOrgDefault: makeDefault,
    createdBy: userId,
  });
  return { dashboardId: String(dashboard._id), kpis: kpiIds.length, charts: CHARTS.length };
}
