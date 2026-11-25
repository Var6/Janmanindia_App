/** Shared shapes for the Insights module (server and browser). */

export type Grain = "day" | "week" | "month" | "quarter" | "year";
export const GRAINS: Grain[] = ["day", "week", "month", "quarter", "year"];

export type Agg = "count" | "countDistinct" | "sum" | "avg" | "min" | "max";
export const AGGS: Agg[] = ["count", "countDistinct", "sum", "avg", "min", "max"];

export type MeasureSpec = { agg: Agg; field?: string };

export type FilterOp =
  | "eq" | "neq" | "in" | "nin"
  | "gt" | "gte" | "lt" | "lte"
  | "isTrue" | "isFalse" | "isSet" | "isNotSet";
export const FILTER_OPS: FilterOp[] = ["eq", "neq", "in", "nin", "gt", "gte", "lt", "lte", "isTrue", "isFalse", "isSet", "isNotSet"];

export type FilterValue = string | number | boolean | null;
export type FilterSpec = { field: string; op: FilterOp; value?: FilterValue | FilterValue[] };

export type RangePreset =
  | "all" | "last_30_days" | "last_90_days" | "last_6_months" | "last_12_months"
  | "this_month" | "this_fy" | "last_fy" | "custom";

export type RangeSpec = {
  /** Date field the range applies to; defaults to the dataset's default date. */
  field?: string;
  preset?: RangePreset;
  /** ISO dates, used when preset is "custom" (or absent). */
  from?: string;
  to?: string;
};

export type QuerySpec = {
  dataset: string;
  measure: MeasureSpec;
  filters?: FilterSpec[];
  /** Up to two dimension fields. */
  groupBy?: string[];
  /** Turns the result into a time series on this date field. */
  time?: { field: string; grain: Grain };
  range?: RangeSpec;
  sort?: "value_desc" | "value_asc" | "label";
  limit?: number;
};

export type QueryRow = {
  /** Display label per groupBy field, in order. */
  keys: string[];
  /** Raw id per groupBy field (ObjectIds as strings), for drill-down filters. */
  ids: (string | null)[];
  /** Period start (ISO) when the query has a time grain. */
  period?: string;
  value: number;
};

export type QueryResult = {
  rows: QueryRow[];
  /** Label for the measure, e.g. "Cases" or "Sum of Amount (₹)". */
  measureLabel: string;
  groupLabels: string[];
  truncated: boolean;
};

export type ChartType = "bar" | "line" | "pie" | "number" | "table" | "pivot" | "map";
export const CHART_TYPES: ChartType[] = ["bar", "line", "pie", "number", "table", "pivot", "map"];

export type KpiType = "input" | "output" | "outcome" | "impact";
export const KPI_TYPES: KpiType[] = ["input", "output", "outcome", "impact"];

export type Direction = "higher" | "lower";
export type Rag = "on_track" | "attention" | "off_track" | "no_data";

/** Indian number formats offered on KPIs and charts. */
export type NumberFormat = "plain" | "indian" | "compact_indian" | "percent" | "currency";
