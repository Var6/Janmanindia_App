/**
 * A small reader for Excel .xlsx files, enough to turn the first sheet into
 * CSV text for the import form. It runs in the browser (so the workbook is
 * never uploaded as a file) and needs no library: an .xlsx is a zip of XML
 * parts, unpacked here with the browser's own DecompressionStream.
 *
 * Reads: text, numbers, booleans, shared and inline strings, and dates
 * (written out as YYYY-MM-DD, or with a time in IST when the cell has one).
 * Formulas give their last calculated value. Merged cells, formatting and
 * other sheets are ignored.
 */

const dec = new TextDecoder("utf-8");

type Entry = { method: number; compSize: number; offset: number };

function readEntries(buf: Uint8Array): Map<string, Entry> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This is not an Excel .xlsx file");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Entry>();
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    out.set(dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), { method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readPart(buf: Uint8Array, e: Entry | undefined): Promise<string> {
  if (!e) return "";
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error("The Excel file is damaged");
  const start = e.offset + 30 + dv.getUint16(e.offset + 26, true) + dv.getUint16(e.offset + 28, true);
  const data = buf.subarray(start, start + e.compSize);
  if (e.method === 0) return dec.decode(data);
  if (e.method !== 8) throw new Error("The Excel file uses a compression this reader does not know");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return dec.decode(await new Response(stream).arrayBuffer());
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function unescapeXml(s: string): string {
  return s
    .replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e])
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

function texts(xml: string): string {
  // Phonetic guides (<rPh>) repeat the text for some languages; drop them.
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...clean.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** For each cell style index: is it a date format? */
function dateStyles(stylesXml: string): boolean[] {
  const custom = new Map<number, boolean>();
  for (const m of stylesXml.matchAll(/<numFmt\b([^>]*)\/?>/g)) {
    const id = Number(attr(m[1], "numFmtId"));
    const code = unescapeXml(attr(m[1], "formatCode") ?? "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
    custom.set(id, /[dmyhs]/i.test(code) && !/^general$/i.test(code));
  }
  const xfs = stylesXml.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  return [...xfs.matchAll(/<xf\b([^>]*)/g)].map((m) => {
    const id = Number(attr(m[1], "numFmtId") ?? 0);
    return custom.get(id) ?? BUILTIN_DATE_FORMATS.has(id);
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel serial day number → "YYYY-MM-DD" (or with a time, as IST). */
export function serialToDate(serial: number, date1904 = false): string {
  const dayMs = 86400000;
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const ms = Math.round(serial * dayMs);
  const d = new Date(epoch + ms);
  const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const secs = Math.round((ms % dayMs) / 1000);
  if (secs === 0) return day;
  return `${day}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+05:30`;
}

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/** The first sheet of an .xlsx workbook as rows of text cells. */
export async function readXlsx(data: ArrayBuffer | Uint8Array, maxRows = 20001): Promise<string[][]> {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const entries = readEntries(buf);
  const workbook = await readPart(buf, entries.get("xl/workbook.xml"));
  if (!workbook) throw new Error("This is not an Excel .xlsx file (older .xls files need saving as .xlsx first)");

  const rels = await readPart(buf, entries.get("xl/_rels/workbook.xml.rels"));
  const firstSheet = workbook.match(/<sheet\b([^>]*)\/?>/)?.[1] ?? "";
  const rid = attr(firstSheet, "r:id");
  let target = [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => m[1]).find((a) => attr(a, "Id") === rid);
  target = target ? attr(target, "Target") : undefined;
  const sheetPath = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target}`) : "xl/worksheets/sheet1.xml";
  const sheet = await readPart(buf, entries.get(sheetPath));
  if (!sheet) throw new Error("The workbook has no readable first sheet");

  const shared = [...(await readPart(buf, entries.get("xl/sharedStrings.xml"))).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)].map((m) => texts(m[1] ?? ""));
  const isDate = dateStyles(await readPart(buf, entries.get("xl/styles.xml")));
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(workbook);

  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    let next = 0;
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = cm[1], inner = cm[2] ?? "";
      const ref = attr(a, "r");
      const col = ref ? colIndex(ref) : next;
      next = col + 1;
      const type = attr(a, "t") ?? "n";
      const raw = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "inlineStr") value = texts(inner);
      else if (raw === undefined) value = "";
      else if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "b") value = raw === "1" ? "yes" : "no";
      else if (type === "str" || type === "e") value = type === "e" ? "" : unescapeXml(raw);
      else if (type === "d") value = unescapeXml(raw).slice(0, 10);
      else {
        const n = Number(raw);
        value = isDate[Number(attr(a, "s") ?? -1)] && Number.isFinite(n) ? serialToDate(n, date1904) : Number.isFinite(n) ? String(n) : unescapeXml(raw);
      }
      while (row.length < col) row.push("");
      row[col] = value.trim();
    }
    if (row.some((c) => c !== "")) rows.push(row);
    if (rows.length >= maxRows) break;
  }
  if (!rows.length) throw new Error("The first sheet is empty");
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => (r.length < width ? [...r, ...Array(width - r.length).fill("")] : r));
}

/** Rows → CSV text, quoting where needed. */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}
