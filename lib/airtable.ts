import Airtable, { type FieldSet } from "airtable";

/**
 * Optional Airtable integration. Configure via env:
 *   AIRTABLE_API_KEY=patxxxxxxxxxx
 *   AIRTABLE_BASE_ID=appXXXXXXXXXX
 *   AIRTABLE_TABLE_ACTIVITIES=Activities    (default)
 *   AIRTABLE_TABLE_TICKETS=Logistics        (default)
 *   AIRTABLE_TABLE_GRIEVANCES=Grievances    (default)
 *
 * If env is missing, helpers return false instead of throwing — call sites can
 * keep working without Airtable.
 */

let cachedBase: ReturnType<Airtable["base"]> | null = null;

export function isAirtableConfigured(): boolean {
  return !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

function getBase(): ReturnType<Airtable["base"]> | null {
  if (!isAirtableConfigured()) return null;
  if (cachedBase) return cachedBase;
  const at = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
  cachedBase = at.base(process.env.AIRTABLE_BASE_ID!);
  return cachedBase;
}

export const TABLES = {
  activities: process.env.AIRTABLE_TABLE_ACTIVITIES ?? "Activities",
  tickets:    process.env.AIRTABLE_TABLE_TICKETS    ?? "Logistics",
  grievances: process.env.AIRTABLE_TABLE_GRIEVANCES ?? "Grievances",
};

/** Push one record. Returns Airtable record id, or null when not configured / on error. */
export async function pushRecord(table: keyof typeof TABLES, fields: Partial<FieldSet>): Promise<string | null> {
  const base = getBase();
  if (!base) return null;
  try {
    const created = await base(TABLES[table]).create([{ fields }]);
    return created[0]?.id ?? null;
  } catch (err) {
    console.error(`Airtable pushRecord(${table}) failed:`, err);
    return null;
  }
}

/** Bulk push (Airtable's create accepts up to 10 per call — chunk longer arrays). */
export async function pushRecords(table: keyof typeof TABLES, rows: Partial<FieldSet>[]): Promise<number> {
  const base = getBase();
  if (!base || rows.length === 0) return 0;
  let pushed = 0;
  try {
    for (let i = 0; i < rows.length; i += 10) {
      const chunk = rows.slice(i, i + 10).map((fields) => ({ fields }));
      const created = await base(TABLES[table]).create(chunk);
      pushed += created.length;
    }
  } catch (err) {
    console.error(`Airtable pushRecords(${table}) failed:`, err);
  }
  return pushed;
}
