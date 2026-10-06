import InsightImport from "@/models/InsightImport";
import InsightImportRow from "@/models/InsightImportRow";
import { BadRequest } from "@/lib/insights/api";
import { convert, describeColumns, parseCsv, type ImportColumn } from "@/lib/insights/csv";

/**
 * Bringing outside data into Insights: CSV uploads, Google Sheets shared as
 * "anyone with the link", and KoboToolbox forms (token in KOBO_API_TOKEN).
 * Rows are stored typed, so they can be charted like any other dataset.
 */

export const MAX_IMPORT_ROWS = 20000;

export type RawTable = { headers: string[]; rows: Record<string, unknown>[] };

/** https://docs.google.com/spreadsheets/d/<id>/edit#gid=<gid> → CSV export URL. */
export function sheetsCsvUrl(link: string): string {
  let u: URL;
  try { u = new URL(link); } catch { throw new BadRequest("That is not a valid link"); }
  if (u.hostname !== "docs.google.com") throw new BadRequest("Only docs.google.com sheet links are accepted");
  const m = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) throw new BadRequest("Paste the link of a Google Sheet");
  const gid = (u.hash.match(/gid=(\d+)/) ?? u.search.match(/gid=(\d+)/))?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

export async function fetchSheet(link: string): Promise<RawTable> {
  const res = await fetch(sheetsCsvUrl(link), { redirect: "follow", cache: "no-store" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("text/csv")) {
    throw new BadRequest("Could not read the sheet. Share it as \"Anyone with the link can view\" and try again.");
  }
  return tableFromCsv(await res.text());
}

export function tableFromCsv(text: string): RawTable {
  const grid = parseCsv(text, MAX_IMPORT_ROWS + 1);
  if (grid.length < 2) throw new BadRequest("The file needs a header row and at least one data row");
  const headers = grid[0].map((h, i) => h.trim() || `Column ${i + 1}`);
  const rows = grid.slice(1, MAX_IMPORT_ROWS + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { headers, rows };
}

export async function fetchKobo(assetUid: string): Promise<RawTable> {
  if (!/^[a-zA-Z0-9]{10,40}$/.test(assetUid)) throw new BadRequest("That does not look like a Kobo form id (asset uid)");
  const token = process.env.KOBO_API_TOKEN;
  if (!token) throw new BadRequest("KoboToolbox is not connected: set KOBO_API_TOKEN (and KOBO_SERVER if not kf.kobotoolbox.org) in the app's environment");
  const server = (process.env.KOBO_SERVER ?? "https://kf.kobotoolbox.org").replace(/\/+$/, "");
  const rows: Record<string, unknown>[] = [];
  let next: string | null = `${server}/api/v2/assets/${assetUid}/data.json?limit=1000`;
  while (next && rows.length < MAX_IMPORT_ROWS) {
    const res: Response = await fetch(next, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
    if (!res.ok) throw new BadRequest(`KoboToolbox said ${res.status}. Check the form id and that the token can see this form.`);
    const page = (await res.json()) as { results?: Record<string, unknown>[]; next?: string | null };
    for (const r of page.results ?? []) rows.push(flattenKobo(r));
    next = page.next ?? null;
    if (next && !next.startsWith(server)) next = null; // never follow a link off the Kobo server
  }
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return { headers, rows };
}

/** Kobo rows use "group/question" keys and internal "_" fields. Keep the
 *  answers and the submission time; drop the rest (ids, geolocation,
 *  attachments, submitter). */
function flattenKobo(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === "_submission_time") { out["Submitted"] = v; continue; }
    if (k.startsWith("_") || k.startsWith("formhub") || k.startsWith("meta/") || k === "__version__") continue;
    if (v !== null && typeof v === "object") continue;
    out[k.split("/").pop() ?? k] = v;
  }
  return out;
}

export function preview(table: RawTable) {
  return { columns: describeColumns(table.headers, table.rows), rowCount: table.rows.length, sample: table.rows.slice(0, 8) };
}

/** Keep only the chosen columns (by source header) with their chosen types. */
export function chooseColumns(all: ImportColumn[], chosen: unknown): ImportColumn[] {
  if (!Array.isArray(chosen) || !chosen.length) throw new BadRequest("Choose at least one column to import");
  const picks = new Map(chosen.map((c) => {
    const x = (c ?? {}) as Record<string, unknown>;
    return [String(x.source ?? ""), x] as const;
  }));
  const out = all.filter((c) => picks.has(c.source)).map((c) => {
    const p = picks.get(c.source)!;
    const type = ["string", "number", "date", "boolean"].includes(String(p.type)) ? (p.type as ImportColumn["type"]) : c.type;
    const label = typeof p.label === "string" && p.label.trim() ? p.label.trim().slice(0, 120) : c.label;
    return { ...c, type, label };
  });
  if (!out.length) throw new BadRequest("None of the chosen columns are in the data");
  return out;
}

export async function replaceRows(importId: string, columns: ImportColumn[], table: RawTable): Promise<number> {
  await InsightImportRow.deleteMany({ importId });
  const docs = table.rows.slice(0, MAX_IMPORT_ROWS).map((r) => ({
    importId,
    data: Object.fromEntries(columns.map((c) => [c.key, convert(r[c.source], c.type)])),
  }));
  for (let i = 0; i < docs.length; i += 1000) await InsightImportRow.insertMany(docs.slice(i, i + 1000), { ordered: false });
  await InsightImport.updateOne({ _id: importId }, { $set: { rowCount: docs.length, lastSyncedAt: new Date() } });
  return docs.length;
}

export async function loadTable(source: string, ref: string | undefined, csvText: unknown): Promise<RawTable> {
  if (source === "csv") {
    if (typeof csvText !== "string" || !csvText.trim()) throw new BadRequest("Upload a CSV file");
    if (csvText.length > 15_000_000) throw new BadRequest("That file is too large (15 MB limit)");
    return tableFromCsv(csvText);
  }
  if (source === "sheets") return fetchSheet(String(ref ?? ""));
  if (source === "kobo") return fetchKobo(String(ref ?? ""));
  throw new BadRequest("Source must be csv, sheets or kobo");
}
