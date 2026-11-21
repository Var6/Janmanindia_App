import type mongoose from "mongoose";
import InsightImport from "@/models/InsightImport";
import InsightImportRow from "@/models/InsightImportRow";
import { BadRequest } from "@/lib/insights/api";
import Notification from "@/models/Notification";
import { convert, describeColumns, parseCsv, type ImportColumn } from "@/lib/insights/csv";
import { getConnector } from "@/lib/insights/connectors";

export { sheetsCsvUrl } from "@/lib/insights/connectors";

/**
 * Bringing outside data into Insights: CSV or Excel uploads, and the
 * connected sources in connectors.ts (Google Sheets, KoboToolbox, SurveyCTO,
 * CommCare, Airtable, Avni, Salesforce, Postgres). Rows are stored typed, so
 * they can be charted like any other dataset. Connected sources can be
 * refreshed by hand or on a daily / weekly schedule.
 */

export const MAX_IMPORT_ROWS = 20000;

export type RawTable = { headers: string[]; rows: Record<string, unknown>[] };

export function tableFromCsv(text: string): RawTable {
  const grid = parseCsv(text, MAX_IMPORT_ROWS + 1);
  if (grid.length < 2) throw new BadRequest("The file needs a header row and at least one data row");
  const headers = grid[0].map((h, i) => h.trim() || `Column ${i + 1}`);
  const rows = grid.slice(1, MAX_IMPORT_ROWS + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { headers, rows };
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
    if (typeof csvText !== "string" || !csvText.trim()) throw new BadRequest("Upload a CSV or Excel file");
    if (csvText.length > 15_000_000) throw new BadRequest("That file is too large (15 MB limit)");
    return tableFromCsv(csvText);
  }
  const connector = getConnector(source);
  if (!connector) throw new BadRequest("Unknown source");
  const t = await connector.fetch(String(ref ?? ""));
  if (!t.rows.length) throw new BadRequest(`${connector.label} returned no rows for that reference.`);
  return { headers: t.headers, rows: t.rows.slice(0, MAX_IMPORT_ROWS) };
}

/* ------------------------------ refreshing ------------------------------ */

type ImportDoc = { _id: mongoose.Types.ObjectId | string; name: string; source: string; sourceRef?: string; columns: { key: string; label: string; type: ImportColumn["type"] }[] };

/** Re-read a connected source and replace the rows. Columns are matched by
 *  key; new columns in the source are ignored. */
export async function syncImport(imp: ImportDoc): Promise<{ rows: number; missingColumns: number }> {
  if (imp.source === "csv") throw new BadRequest("An uploaded file cannot be refreshed; upload the new file as a new dataset");
  const table = await loadTable(imp.source, imp.sourceRef, undefined);
  const fresh = describeColumns(table.headers, table.rows);
  const columns = imp.columns
    .map((c) => {
      const f = fresh.find((x) => x.key === c.key);
      return f ? { ...f, type: c.type, label: c.label } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  if (!columns.length) throw new BadRequest("None of this dataset's columns are in the source any more");
  const rows = await replaceRows(String(imp._id), columns, table);
  await InsightImport.updateOne({ _id: imp._id }, { $unset: { lastSyncError: 1 } });
  return { rows, missingColumns: imp.columns.length - columns.length };
}

const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/** Daily imports are due once per day (IST); weekly ones on Mondays. */
export function importIsDue(imp: { syncSchedule?: string; lastSyncedAt?: Date; lastSyncTriedAt?: Date }, now = new Date()): boolean {
  if (imp.syncSchedule !== "daily" && imp.syncSchedule !== "weekly") return false;
  const last = imp.lastSyncTriedAt ?? imp.lastSyncedAt;
  if (last && istDay(new Date(last)) === istDay(now)) return false;
  if (imp.syncSchedule === "daily") return true;
  return new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCDay() === 1;
}

/**
 * Called by the daily Insights cron, before the alerts run so they see fresh
 * figures. Stops starting new refreshes once `budgetMs` is used up (the
 * oldest go first, so none is starved); a failure is recorded on the import
 * and its owner is told through the notification bell.
 */
export async function runDueImportSyncs(now = new Date(), budgetMs = 40_000): Promise<{ ran: number; failed: number; skipped: number }> {
  const started = Date.now();
  const imports = await InsightImport.find({ syncSchedule: { $in: ["daily", "weekly"] }, source: { $ne: "csv" } }).sort({ lastSyncedAt: 1 }).lean();
  let ran = 0, failed = 0, skipped = 0;
  for (const imp of imports) {
    if (!importIsDue(imp, now)) continue;
    if (Date.now() - started > budgetMs) { skipped++; continue; }
    await InsightImport.updateOne({ _id: imp._id }, { $set: { lastSyncTriedAt: now } });
    try {
      await syncImport(imp);
      ran++;
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : "Refresh failed";
      await InsightImport.updateOne({ _id: imp._id }, { $set: { lastSyncError: message.slice(0, 500) } });
      await Notification.create({
        recipient: imp.createdBy, type: "insights_import_failed", title: `Could not refresh "${imp.name}"`,
        body: message.slice(0, 300), link: "/director/insights/data?tab=import",
      }).catch(() => undefined);
    }
  }
  return { ran, failed, skipped };
}
