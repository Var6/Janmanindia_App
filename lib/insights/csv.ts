/** CSV parsing and column typing for imports (used in the browser for
 *  uploads and on the server for Google Sheets). */

export function parseCsv(text: string, maxRows = 50000): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > maxRows) break;
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

export type ColumnType = "string" | "number" | "date" | "boolean";
export type ImportColumn = { key: string; label: string; type: ColumnType; source: string };

/** Safe, unique column keys: lower-case letters, digits and underscores. */
export function columnKeys(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((h, i) => {
    let k = h.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36);
    if (!/^[a-z]/.test(k)) k = `c_${k || i + 1}`;
    let out = k, n = 2;
    while (used.has(out)) out = `${k}_${n++}`;
    used.add(out);
    return out;
  });
}

const NUM = /^[-+]?[₹$]?\s*\d[\d,]*(\.\d+)?$/;
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const ISO = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
const BOOL = new Set(["yes", "no", "true", "false", "y", "n", "हाँ", "नहीं"]);

export function inferType(values: string[]): ColumnType {
  const v = values.map((x) => x.trim()).filter(Boolean).slice(0, 500);
  if (!v.length) return "string";
  if (v.every((x) => NUM.test(x))) return "number";
  if (v.every((x) => ISO.test(x) || DMY.test(x))) return "date";
  if (v.every((x) => BOOL.has(x.toLowerCase()))) return "boolean";
  return "string";
}

/** Converts a raw cell to the column's type. Dates read as day/month/year
 *  (Indian order) unless they are ISO. */
export function convert(raw: unknown, type: ColumnType): string | number | boolean | Date | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  switch (type) {
    case "number": {
      const n = Number(s.replace(/[₹$,\s]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "date": {
      if (ISO.test(s)) { const d = new Date(s.length === 10 ? `${s}T00:00:00+05:30` : s); return isNaN(d.getTime()) ? null : d; }
      const m = s.match(DMY);
      if (m) {
        const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        const d = new Date(`${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00+05:30`);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    case "boolean":
      return ["yes", "true", "y", "हाँ", "1"].includes(s.toLowerCase());
    default:
      return s.slice(0, 500);
  }
}

/** Header row + data rows → typed column definitions (keys, labels, types). */
export function describeColumns(headers: string[], rows: Record<string, unknown>[]): ImportColumn[] {
  const keys = columnKeys(headers);
  return headers.map((h, i) => ({
    key: keys[i],
    label: h.trim().slice(0, 120) || keys[i],
    source: h,
    type: inferType(rows.map((r) => (r[h] == null ? "" : String(r[h])))),
  }));
}
