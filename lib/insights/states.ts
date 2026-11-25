import { BIHAR_DISTRICTS } from "@/lib/insights/districts";

/**
 * India's 28 states and 8 union territories, the spellings people type for
 * them, and a schematic grid position for the all-India map (north at the
 * top; not to scale).
 */

type StateInfo = { name: string; code: string; aliases: string[]; col: number; row: number };

export const STATE_UNSPECIFIED = "Unspecified";
export const STATE_OTHER = "Other";

export const INDIA_STATES: StateInfo[] = [
  { name: "Jammu and Kashmir", code: "JK", aliases: ["jammu and kashmir", "jammu & kashmir", "j&k", "jk", "jammu kashmir", "kashmir"], col: 2, row: 0 },
  { name: "Ladakh", code: "LA", aliases: ["ladakh", "la"], col: 3, row: 0 },
  { name: "Punjab", code: "PB", aliases: ["punjab", "pb"], col: 1, row: 1 },
  { name: "Chandigarh", code: "CH", aliases: ["chandigarh", "ch"], col: 2, row: 1 },
  { name: "Himachal Pradesh", code: "HP", aliases: ["himachal pradesh", "himachal", "hp"], col: 3, row: 1 },
  { name: "Haryana", code: "HR", aliases: ["haryana", "hr"], col: 2, row: 2 },
  { name: "Uttarakhand", code: "UK", aliases: ["uttarakhand", "uttaranchal", "uk", "ua"], col: 3, row: 2 },
  { name: "Arunachal Pradesh", code: "AR", aliases: ["arunachal pradesh", "arunachal", "ar"], col: 7, row: 2 },
  { name: "Rajasthan", code: "RJ", aliases: ["rajasthan", "rj"], col: 1, row: 3 },
  { name: "Delhi", code: "DL", aliases: ["delhi", "new delhi", "nct of delhi", "nct delhi", "national capital territory of delhi", "dl"], col: 2, row: 3 },
  { name: "Uttar Pradesh", code: "UP", aliases: ["uttar pradesh", "up", "u p"], col: 3, row: 3 },
  { name: "Bihar", code: "BR", aliases: ["bihar", "br"], col: 4, row: 3 },
  { name: "Sikkim", code: "SK", aliases: ["sikkim", "sk"], col: 5, row: 3 },
  { name: "Assam", code: "AS", aliases: ["assam", "as"], col: 6, row: 3 },
  { name: "Nagaland", code: "NL", aliases: ["nagaland", "nl"], col: 7, row: 3 },
  { name: "Gujarat", code: "GJ", aliases: ["gujarat", "gujrat", "gj"], col: 0, row: 4 },
  { name: "Madhya Pradesh", code: "MP", aliases: ["madhya pradesh", "mp", "m p"], col: 2, row: 4 },
  { name: "Jharkhand", code: "JH", aliases: ["jharkhand", "jh"], col: 4, row: 4 },
  { name: "West Bengal", code: "WB", aliases: ["west bengal", "bengal", "wb", "w b"], col: 5, row: 4 },
  { name: "Meghalaya", code: "ML", aliases: ["meghalaya", "ml"], col: 6, row: 4 },
  { name: "Manipur", code: "MN", aliases: ["manipur", "mn"], col: 7, row: 4 },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN", aliases: ["dadra and nagar haveli and daman and diu", "dadra and nagar haveli", "dadra & nagar haveli", "daman and diu", "daman & diu", "daman", "dnhdd", "dn", "dd"], col: 0, row: 5 },
  { name: "Maharashtra", code: "MH", aliases: ["maharashtra", "mh"], col: 1, row: 5 },
  { name: "Chhattisgarh", code: "CG", aliases: ["chhattisgarh", "chattisgarh", "chhatisgarh", "cg", "ct"], col: 3, row: 5 },
  { name: "Odisha", code: "OD", aliases: ["odisha", "orissa", "od", "or"], col: 4, row: 5 },
  { name: "Tripura", code: "TR", aliases: ["tripura", "tr"], col: 6, row: 5 },
  { name: "Mizoram", code: "MZ", aliases: ["mizoram", "mz"], col: 7, row: 5 },
  { name: "Goa", code: "GA", aliases: ["goa", "ga"], col: 1, row: 6 },
  { name: "Telangana", code: "TS", aliases: ["telangana", "telengana", "ts", "tg"], col: 2, row: 6 },
  { name: "Andhra Pradesh", code: "AP", aliases: ["andhra pradesh", "andhra", "ap"], col: 3, row: 6 },
  { name: "Karnataka", code: "KA", aliases: ["karnataka", "ka"], col: 1, row: 7 },
  { name: "Puducherry", code: "PY", aliases: ["puducherry", "pondicherry", "py"], col: 3, row: 7 },
  { name: "Andaman and Nicobar Islands", code: "AN", aliases: ["andaman and nicobar islands", "andaman and nicobar", "andaman & nicobar", "andaman & nicobar islands", "andaman", "an"], col: 8, row: 7 },
  { name: "Lakshadweep", code: "LD", aliases: ["lakshadweep", "ld"], col: 0, row: 8 },
  { name: "Kerala", code: "KL", aliases: ["kerala", "kl"], col: 1, row: 8 },
  { name: "Tamil Nadu", code: "TN", aliases: ["tamil nadu", "tamilnadu", "tn"], col: 2, row: 8 },
];

export const INDIA_GRID = { cols: 9, rows: 9 };

const ALIAS_TO_STATE = new Map<string, string>(INDIA_STATES.flatMap((s) => [[s.name.toLowerCase(), s.name] as const, ...s.aliases.map((a) => [a, s.name] as const)]));

function clean(raw: string): string {
  return raw.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

/** Canonical state name for a free-text value ("orissa" → "Odisha"). */
export function canonicalState(raw?: string | null): string {
  const v = clean(raw ?? "");
  if (!v) return STATE_UNSPECIFIED;
  return ALIAS_TO_STATE.get(v) ?? STATE_OTHER;
}

/**
 * The same mapping as a MongoDB expression. When the state is blank and
 * `districtName` (an expression giving the canonical district) is one of
 * Bihar's districts, the record counts under Bihar.
 */
export function stateExpr(statePath: unknown, districtName?: unknown): Record<string, unknown> {
  const blank = districtName
    ? { $cond: [{ $in: [districtName, BIHAR_DISTRICTS.map((d) => d.name)] }, "Bihar", STATE_UNSPECIFIED] }
    : STATE_UNSPECIFIED;
  return {
    $let: {
      vars: {
        s: {
          $trim: {
            input: {
              $replaceAll: { input: { $replaceAll: { input: { $toLower: { $ifNull: [statePath, ""] } }, find: ".", replacement: " " } }, find: "  ", replacement: " " },
            },
          },
        },
      },
      in: {
        $switch: {
          branches: [
            { case: { $eq: ["$$s", ""] }, then: blank },
            ...INDIA_STATES.map((s) => ({ case: { $in: ["$$s", [s.name.toLowerCase(), ...s.aliases]] }, then: s.name })),
          ],
          default: STATE_OTHER,
        },
      },
    },
  };
}
