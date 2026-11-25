import { BadRequest } from "@/lib/insights/api";
import { MAX_IMPORT_ROWS, tableFromCsv, type RawTable } from "@/lib/insights/imports";

/**
 * Sources that Insights can pull a table from on demand (and so can refresh
 * on a schedule). Each one reads its credentials from the app's environment,
 * never from the browser, and only ever talks to its own fixed host, so a
 * reference typed into the import form cannot point the server elsewhere.
 *
 * `ref` is what the person types to say which table: a sheet link, a form
 * id, "base/table" and so on. It is validated strictly before any request.
 */

export type Connector = {
  key: string;
  label: string;
  /** One line under the name in the import form. */
  blurb: string;
  refLabel: string;
  refPlaceholder: string;
  refHelp: string;
  /** Environment variables that must be set for it to work. */
  env: string[];
  fetch: (ref: string) => Promise<RawTable>;
};

type Row = Record<string, unknown>;

const isScalar = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v);

/** Scalar leaves of a nested record, keyed by the leaf path joined with "_".
 *  Arrays of scalars are joined with ", "; anything deeper is dropped. */
export function flatten(obj: unknown, opts: { depth?: number; skip?: (key: string) => boolean } = {}, prefix = "", out: Row = {}, level = 0): Row {
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj as Row)) {
    if (opts.skip?.(k)) continue;
    const key = prefix ? `${prefix}_${k}` : k;
    if (isScalar(v)) out[key] = v;
    else if (v instanceof Date) out[key] = v.toISOString();
    else if (Array.isArray(v)) { if (v.every(isScalar)) out[key] = v.join(", "); }
    else if (level < (opts.depth ?? 2)) flatten(v, opts, key, out, level + 1);
  }
  return out;
}

function table(rows: Row[]): RawTable {
  return { headers: [...new Set(rows.flatMap((r) => Object.keys(r)))], rows };
}

function need(...names: string[]): string[] {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new BadRequest(`Not connected yet: ${missing.join(", ")} must be set in the app's environment.`);
  return names.map((n) => process.env[n]!);
}

async function getJson<T>(url: string, headers: Record<string, string>, service: string): Promise<T> {
  const res = await fetch(url, { headers, cache: "no-store", redirect: "error" });
  if (res.status === 401 || res.status === 403) throw new BadRequest(`${service} refused the app's credentials (${res.status}).`);
  if (res.status === 404) throw new BadRequest(`${service} could not find that. Check the reference.`);
  if (!res.ok) throw new BadRequest(`${service} said ${res.status}.`);
  return (await res.json()) as T;
}

/* ----------------------------- Google Sheets ---------------------------- */

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

/* ------------------------------ KoboToolbox ----------------------------- */

function flattenKobo(r: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) {
    if (k.startsWith("_") || k.startsWith("formhub") || k.startsWith("meta/") || k === "__version__") continue;
    if (v !== null && typeof v === "object") continue;
    out[k.split("/").pop() ?? k] = v;
  }
  return out;
}

export async function fetchKobo(assetUid: string): Promise<RawTable> {
  if (!/^[a-zA-Z0-9]{10,40}$/.test(assetUid)) throw new BadRequest("That does not look like a Kobo form id (asset uid)");
  const [token] = need("KOBO_API_TOKEN");
  const server = (process.env.KOBO_SERVER ?? "https://kf.kobotoolbox.org").replace(/\/+$/, "");
  const rows: Row[] = [];
  let next: string | null = `${server}/api/v2/assets/${assetUid}/data.json?limit=1000`;
  while (next && rows.length < MAX_IMPORT_ROWS) {
    const res: Response = await fetch(next, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
    if (!res.ok) throw new BadRequest(`KoboToolbox said ${res.status}. Check the form id and that the token can see this form.`);
    const page = (await res.json()) as { results?: Row[]; next?: string | null };
    for (const r of page.results ?? []) rows.push(flattenKobo(r));
    next = page.next ?? null;
    if (next && !next.startsWith(server)) next = null; // never follow a link off the Kobo server
  }
  return table(rows);
}

/* -------------------------------- Airtable ------------------------------ */

export async function fetchAirtable(ref: string): Promise<RawTable> {
  const m = ref.trim().match(/^(app[A-Za-z0-9]{14})\/([^/?#]{1,100})$/);
  if (!m) throw new BadRequest("Give the Airtable base and table as appXXXXXXXXXXXXXX/Table name");
  const [token] = need("AIRTABLE_API_KEY");
  const rows: Row[] = [];
  let offset: string | undefined;
  do {
    const url = `https://api.airtable.com/v0/${m[1]}/${encodeURIComponent(m[2])}?pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ""}`;
    const page = await getJson<{ records?: { id: string; createdTime?: string; fields?: Row }[]; offset?: string }>(url, { Authorization: `Bearer ${token}` }, "Airtable");
    for (const r of page.records ?? []) rows.push({ ...flatten(r.fields ?? {}, { depth: 0 }), "Created time": r.createdTime });
    offset = page.offset;
  } while (offset && rows.length < MAX_IMPORT_ROWS);
  return table(rows);
}

/* ------------------------------- SurveyCTO ------------------------------ */

export async function fetchSurveyCto(formId: string): Promise<RawTable> {
  const id = formId.trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new BadRequest("That does not look like a SurveyCTO form ID");
  const [server, user, pass] = need("SURVEYCTO_SERVER", "SURVEYCTO_USER", "SURVEYCTO_PASSWORD");
  if (!/^[a-z0-9-]{1,60}$/i.test(server)) throw new BadRequest("SURVEYCTO_SERVER should be the server name only, e.g. janman for janman.surveycto.com");
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  const res = await fetch(`https://${server}.surveycto.com/api/v2/forms/data/wide/json/${id}?date=0`, { headers: { Authorization: auth }, cache: "no-store", redirect: "error" });
  if (res.status === 417) throw new BadRequest("SurveyCTO only allows a full download of a form once every five minutes. Try again shortly.");
  if (res.status === 401 || res.status === 403) throw new BadRequest("SurveyCTO refused the app's login. The user needs the \"Allow server API access\" permission.");
  if (res.status === 404) throw new BadRequest("SurveyCTO could not find that form ID.");
  if (!res.ok) throw new BadRequest(`SurveyCTO said ${res.status}.`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new BadRequest("SurveyCTO did not return a list of submissions. Encrypted forms cannot be imported.");
  return table(data.slice(0, MAX_IMPORT_ROWS).map((r) => flatten(r, { depth: 0 })));
}

/* -------------------------------- CommCare ------------------------------ */

export async function fetchCommCare(ref: string): Promise<RawTable> {
  const m = ref.trim().match(/^([a-z0-9][a-z0-9-]{0,80}):(case|form):(\S{1,300})$/);
  if (!m) throw new BadRequest("Give it as project:case:case_type or project:form:<the form's xmlns>");
  const [, domain, kind, what] = m;
  if (kind === "case" && !/^[A-Za-z0-9_-]+$/.test(what)) throw new BadRequest("That does not look like a CommCare case type");
  const [user, key] = need("COMMCARE_USERNAME", "COMMCARE_API_KEY");
  const host = process.env.COMMCARE_HOST ?? "www.commcarehq.org";
  if (!/^([a-z0-9-]+\.)?commcarehq\.org$/.test(host)) throw new BadRequest("COMMCARE_HOST must be www.commcarehq.org, india.commcarehq.org or eu.commcarehq.org");
  const headers = { Authorization: `ApiKey ${user}:${key}` };
  const base = `https://${host}/a/${domain}/api/v0.5/${kind}/`;
  const param = kind === "case" ? `type=${encodeURIComponent(what)}` : `xmlns=${encodeURIComponent(what)}`;
  const rows: Row[] = [];
  for (let offset = 0; rows.length < MAX_IMPORT_ROWS; offset += 1000) {
    const page = await getJson<{ meta?: { next?: string | null }; objects?: Row[] }>(`${base}?${param}&limit=1000&offset=${offset}`, headers, "CommCare");
    for (const o of page.objects ?? []) {
      if (kind === "case") {
        rows.push({ case_id: o.case_id, closed: o.closed, date_modified: o.date_modified, date_closed: o.date_closed, ...flatten(o.properties, { depth: 0 }) });
      } else {
        rows.push({
          received_on: o.received_on,
          ...flatten(o.form, { depth: 3, skip: (k) => k.startsWith("@") || k.startsWith("#") || k === "meta" || k === "case" }),
        });
      }
    }
    if (!page.meta?.next || !(page.objects ?? []).length) break;
  }
  return table(rows);
}

/* ---------------------------------- Avni -------------------------------- */

const AVNI_PATH: Record<string, { path: string; param: string }> = {
  subjects: { path: "subjects", param: "subjectType" },
  encounters: { path: "encounters", param: "encounterType" },
  programEncounters: { path: "programEncounters", param: "encounterType" },
};

export async function fetchAvni(ref: string): Promise<RawTable> {
  const m = ref.trim().match(/^(subjects|encounters|programEncounters):([^:/?#&]{1,100})$/);
  if (!m) throw new BadRequest("Give it as subjects:<subject type>, encounters:<encounter type> or programEncounters:<encounter type>");
  const [token] = need("AVNI_AUTH_TOKEN");
  const server = (process.env.AVNI_SERVER ?? "https://app.avniproject.org").replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/.test(server)) throw new BadRequest("AVNI_SERVER must be an https address");
  const { path, param } = AVNI_PATH[m[1]];
  const rows: Row[] = [];
  for (let page = 0; rows.length < MAX_IMPORT_ROWS; page++) {
    const url = `${server}/api/${path}?lastModifiedDateTime=2000-01-01T00:00:00.000Z&${param}=${encodeURIComponent(m[2])}&size=500&page=${page}`;
    const res = await fetch(url, { headers: { "auth-token": token }, cache: "no-store", redirect: "error" });
    if (res.status === 401 || res.status === 403) throw new BadRequest("Avni refused the token. Avni tokens expire; put a fresh one in AVNI_AUTH_TOKEN.");
    if (!res.ok) throw new BadRequest(`Avni said ${res.status}.`);
    const body = (await res.json()) as { content?: Row[]; totalPages?: number };
    for (const r of body.content ?? []) {
      const { observations, location, audit, ...rest } = r as { observations?: unknown; location?: unknown; audit?: unknown } & Row;
      void audit;
      rows.push({ ...flatten(rest, { depth: 0 }), ...flatten(location, { depth: 0 }), ...flatten(observations, { depth: 0 }) });
    }
    if (!(body.content ?? []).length || page + 1 >= (body.totalPages ?? 0)) break;
  }
  return table(rows);
}

/* ------------------------------- Salesforce ----------------------------- */

const SF_API = "v61.0";

export async function fetchSalesforce(objectName: string): Promise<RawTable> {
  const obj = objectName.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(obj)) throw new BadRequest("Give the object's API name, e.g. Contact or Beneficiary__c");
  const [instance, id, secret] = need("SALESFORCE_INSTANCE_URL", "SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET");
  const base = instance.replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+\.salesforce\.com$/i.test(base)) throw new BadRequest("SALESFORCE_INSTANCE_URL must look like https://yourorg.my.salesforce.com");

  const tokenRes = await fetch(`${base}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    cache: "no-store",
    redirect: "error",
  });
  if (!tokenRes.ok) throw new BadRequest(`Salesforce refused the app's login (${tokenRes.status}). The connected app needs the client-credentials flow switched on.`);
  const { access_token: token } = (await tokenRes.json()) as { access_token?: string };
  if (!token) throw new BadRequest("Salesforce did not return an access token.");
  const headers = { Authorization: `Bearer ${token}` };

  const desc = await getJson<{ fields?: { name: string; type: string }[] }>(`${base}/services/data/${SF_API}/sobjects/${obj}/describe`, headers, "Salesforce");
  const fields = (desc.fields ?? []).filter((f) => !["address", "location", "base64"].includes(f.type) && /^[A-Za-z][A-Za-z0-9_]*$/.test(f.name)).map((f) => f.name).slice(0, 200);
  if (!fields.length) throw new BadRequest("That Salesforce object has no readable fields.");

  const rows: Row[] = [];
  let next: string | null = `/services/data/${SF_API}/query?q=${encodeURIComponent(`SELECT ${fields.join(",")} FROM ${obj} LIMIT ${MAX_IMPORT_ROWS}`)}`;
  while (next && rows.length < MAX_IMPORT_ROWS) {
    const page: { records?: Row[]; nextRecordsUrl?: string } = await getJson(`${base}${next}`, headers, "Salesforce");
    for (const r of page.records ?? []) rows.push(flatten(r, { depth: 0, skip: (k) => k === "attributes" }));
    next = page.nextRecordsUrl && page.nextRecordsUrl.startsWith("/services/data/") ? page.nextRecordsUrl : null;
  }
  return { headers: fields.filter((f) => rows.some((r) => r[f] !== null && r[f] !== undefined)), rows };
}

/* -------------------------------- Postgres ------------------------------ */

export async function fetchPostgres(ref: string): Promise<RawTable> {
  const m = ref.trim().match(/^(?:([A-Za-z_][A-Za-z0-9_]{0,62})\.)?([A-Za-z_][A-Za-z0-9_]{0,62})$/);
  if (!m) throw new BadRequest("Give the table as schema.table (letters, numbers and underscores only)");
  const [url] = need("INSIGHTS_PG_URL");
  const schema = m[1] ?? "public", name = m[2];
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url, statement_timeout: 30_000, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
  } catch (e) {
    throw new BadRequest(`Could not connect to the database: ${(e as Error).message}`);
  }
  try {
    // Read-only, and the names are checked against the pattern above, so
    // nothing typed into the form can change data or run other SQL.
    await client.query("BEGIN TRANSACTION READ ONLY");
    const res = await client.query(`SELECT * FROM "${schema}"."${name}" LIMIT ${MAX_IMPORT_ROWS}`);
    await client.query("ROLLBACK");
    const rows = res.rows.map((r: Row) => flatten(r, { depth: 0 }));
    return { headers: res.fields.map((f) => f.name), rows };
  } catch (e) {
    throw new BadRequest(`The database refused the query: ${(e as Error).message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/* -------------------------------- registry ------------------------------ */

export const CONNECTORS: Connector[] = [
  {
    key: "sheets", label: "Google Sheet", blurb: "A sheet shared by link",
    refLabel: "Google Sheet link", refPlaceholder: "https://docs.google.com/spreadsheets/d/…/edit#gid=0",
    refHelp: "The sheet must be shared as \"Anyone with the link can view\". The tab in the link is the one imported.",
    env: [], fetch: fetchSheet,
  },
  {
    key: "kobo", label: "KoboToolbox", blurb: "Submissions to a form",
    refLabel: "Kobo form ID (asset UID)", refPlaceholder: "e.g. aBcD12eFgH34iJkL56",
    refHelp: "Found in the form's URL in KoboToolbox.",
    env: ["KOBO_API_TOKEN"], fetch: fetchKobo,
  },
  {
    key: "surveycto", label: "SurveyCTO", blurb: "Submissions to a form",
    refLabel: "Form ID", refPlaceholder: "e.g. household_survey_2026",
    refHelp: "The form ID from the Design tab. Encrypted forms cannot be imported. SurveyCTO allows one full download every five minutes.",
    env: ["SURVEYCTO_SERVER", "SURVEYCTO_USER", "SURVEYCTO_PASSWORD"], fetch: fetchSurveyCto,
  },
  {
    key: "commcare", label: "CommCare", blurb: "Cases or form submissions",
    refLabel: "Project and what to import", refPlaceholder: "my-project:case:household",
    refHelp: "Write project:case:<case type>, or project:form:<the form's xmlns> (shown under the form's advanced settings).",
    env: ["COMMCARE_USERNAME", "COMMCARE_API_KEY"], fetch: fetchCommCare,
  },
  {
    key: "airtable", label: "Airtable", blurb: "One table in a base",
    refLabel: "Base and table", refPlaceholder: "appAbCdEfGhIjKlMn/Beneficiaries",
    refHelp: "The base ID starts with app and is in the base's URL. Follow it with a slash and the table name.",
    env: ["AIRTABLE_API_KEY"], fetch: fetchAirtable,
  },
  {
    key: "avni", label: "Avni", blurb: "Subjects or encounters",
    refLabel: "What to import", refPlaceholder: "subjects:Individual",
    refHelp: "Write subjects:<subject type>, encounters:<encounter type> or programEncounters:<encounter type>. Avni tokens expire, so a scheduled refresh stops working until the token is renewed.",
    env: ["AVNI_AUTH_TOKEN"], fetch: fetchAvni,
  },
  {
    key: "salesforce", label: "Salesforce", blurb: "One object",
    refLabel: "Object API name", refPlaceholder: "Contact",
    refHelp: "The object's API name, e.g. Contact or Beneficiary__c. Up to 200 fields are read.",
    env: ["SALESFORCE_INSTANCE_URL", "SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"], fetch: fetchSalesforce,
  },
  {
    key: "postgres", label: "Postgres database", blurb: "One table or view",
    refLabel: "Table", refPlaceholder: "public.survey_responses",
    refHelp: "Written as schema.table. The app reads it in a read-only transaction.",
    env: ["INSIGHTS_PG_URL"], fetch: fetchPostgres,
  },
];

export const CONNECTOR_KEYS = CONNECTORS.map((c) => c.key);

export function getConnector(key: string): Connector | undefined {
  return CONNECTORS.find((c) => c.key === key);
}

/** For the import form: what each source is and whether it is set up.
 *  Names of missing settings are safe to show; values never leave the server. */
export function connectorStatus() {
  return CONNECTORS.map(({ fetch: _f, env, ...c }) => {
    void _f;
    const missing = env.filter((n) => !process.env[n]);
    return { ...c, configured: missing.length === 0, missing };
  });
}
