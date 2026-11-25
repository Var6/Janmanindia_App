import type { NumberFormat } from "@/lib/insights/types";

/** Number formatting used by KPI cards and charts (Indian grouping). */
export function formatNumber(
  n: number | null | undefined,
  fmt: NumberFormat = "indian",
  decimals = 0,
  prefix = "",
  suffix = "",
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const fixed = (v: number, d = decimals) =>
    v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
  let body: string;
  switch (fmt) {
    case "plain":
      body = n.toFixed(decimals);
      break;
    case "percent":
      body = `${fixed(n)}%`;
      break;
    case "currency":
      body = `₹${fixed(n)}`;
      break;
    case "compact_indian": {
      const a = Math.abs(n);
      if (a >= 1e7) body = `${fixed(n / 1e7, Math.max(decimals, 2))} Cr`;
      else if (a >= 1e5) body = `${fixed(n / 1e5, Math.max(decimals, 2))} L`;
      else if (a >= 1e3) body = `${fixed(n / 1e3, Math.max(decimals, 1))}K`;
      else body = fixed(n);
      break;
    }
    default:
      body = fixed(n);
  }
  return `${prefix}${body}${suffix}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Period label in IST for a period-start ISO string. */
export function periodLabel(iso: string, grain: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (grain) {
    case "year": return String(y);
    case "quarter": {
      // Indian financial-year quarters: Apr–Jun = Q1.
      const fyStartYear = m >= 3 ? y : y - 1;
      const q = Math.floor(((m + 9) % 12) / 3) + 1;
      return `Q${q} FY${String(fyStartYear + 1).slice(2)}`;
    }
    case "month": return `${MONTHS[m]} ${y}`;
    default: return `${d.getUTCDate()} ${MONTHS[m]} ${String(y).slice(2)}`;
  }
}
