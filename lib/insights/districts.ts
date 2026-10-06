/**
 * Bihar's 38 districts, the spellings staff actually type for them, and a
 * schematic grid position for the district map.
 *
 * Case records hold district as free text ("Purnia", "PURNIA", "Purnea",
 * "patna", and "Bihar" for the state). Every Insights chart, KPI and filter
 * reads district through `districtExpr` / `canonicalDistrict`, so one place
 * decides what counts as the same district.
 */

export const UNSPECIFIED = "Unspecified";
export const OUTSIDE_BIHAR = "Outside Bihar";

type DistrictInfo = { name: string; aliases: string[]; col: number; row: number };

/** col / row place each district on a 10 x 6 grid that roughly follows the
 *  state's shape (north at the top, Nepal border on row 0). Schematic, not to
 *  scale. */
export const BIHAR_DISTRICTS: DistrictInfo[] = [
  { name: "West Champaran", aliases: ["pashchim champaran", "paschim champaran", "west champaran", "bettiah", "w. champaran"], col: 1, row: 0 },
  { name: "East Champaran", aliases: ["purbi champaran", "purvi champaran", "east champaran", "motihari", "e. champaran"], col: 2, row: 0 },
  { name: "Sheohar", aliases: ["sheohar", "shivhar"], col: 3, row: 0 },
  { name: "Sitamarhi", aliases: ["sitamarhi"], col: 4, row: 0 },
  { name: "Madhubani", aliases: ["madhubani"], col: 5, row: 0 },
  { name: "Supaul", aliases: ["supaul"], col: 6, row: 0 },
  { name: "Araria", aliases: ["araria", "forbesganj"], col: 7, row: 0 },
  { name: "Kishanganj", aliases: ["kishanganj", "kishangunj", "kisanganj"], col: 8, row: 0 },
  { name: "Siwan", aliases: ["siwan"], col: 0, row: 1 },
  { name: "Gopalganj", aliases: ["gopalganj"], col: 1, row: 1 },
  { name: "Muzaffarpur", aliases: ["muzaffarpur", "muzzafarpur", "mujaffarpur"], col: 3, row: 1 },
  { name: "Darbhanga", aliases: ["darbhanga"], col: 4, row: 1 },
  { name: "Saharsa", aliases: ["saharsa"], col: 5, row: 1 },
  { name: "Madhepura", aliases: ["madhepura"], col: 6, row: 1 },
  { name: "Purnia", aliases: ["purnia", "purnea", "purniya"], col: 7, row: 1 },
  { name: "Katihar", aliases: ["katihar"], col: 8, row: 1 },
  { name: "Saran", aliases: ["saran", "chapra", "chhapra"], col: 1, row: 2 },
  { name: "Vaishali", aliases: ["vaishali", "hajipur"], col: 2, row: 2 },
  { name: "Samastipur", aliases: ["samastipur"], col: 3, row: 2 },
  { name: "Begusarai", aliases: ["begusarai"], col: 4, row: 2 },
  { name: "Khagaria", aliases: ["khagaria"], col: 5, row: 2 },
  { name: "Buxar", aliases: ["buxar"], col: 0, row: 3 },
  { name: "Bhojpur", aliases: ["bhojpur", "arrah", "ara"], col: 1, row: 3 },
  { name: "Patna", aliases: ["patna", "danapur", "patna sadar"], col: 2, row: 3 },
  { name: "Nalanda", aliases: ["nalanda", "bihar sharif", "biharsharif"], col: 3, row: 3 },
  { name: "Lakhisarai", aliases: ["lakhisarai"], col: 4, row: 3 },
  { name: "Munger", aliases: ["munger", "monghyr"], col: 5, row: 3 },
  { name: "Bhagalpur", aliases: ["bhagalpur"], col: 6, row: 3 },
  { name: "Kaimur", aliases: ["kaimur", "bhabua"], col: 0, row: 4 },
  { name: "Rohtas", aliases: ["rohtas", "sasaram"], col: 1, row: 4 },
  { name: "Arwal", aliases: ["arwal"], col: 2, row: 4 },
  { name: "Jehanabad", aliases: ["jehanabad", "jahanabad"], col: 3, row: 4 },
  { name: "Sheikhpura", aliases: ["sheikhpura"], col: 4, row: 4 },
  { name: "Jamui", aliases: ["jamui"], col: 5, row: 4 },
  { name: "Banka", aliases: ["banka"], col: 6, row: 4 },
  { name: "Aurangabad", aliases: ["aurangabad"], col: 1, row: 5 },
  { name: "Gaya", aliases: ["gaya"], col: 2, row: 5 },
  { name: "Nawada", aliases: ["nawada"], col: 3, row: 5 },
];

/** Values that mean "somewhere in Bihar, district not recorded". */
const STATE_ONLY = ["bihar", "", "na", "n/a", "-", "—", "null", "none"];

const ALIAS_TO_NAME = new Map<string, string>();
for (const d of BIHAR_DISTRICTS) for (const a of d.aliases) ALIAS_TO_NAME.set(a, d.name);

function clean(raw: string): string {
  return raw.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

/** Canonical district for a free-text value. Falls back to scanning a court
 *  name ("District Court, Purnia ADJ 8th" → Purnia) when the district field
 *  is empty or just says "Bihar". */
export function canonicalDistrict(raw?: string | null, courtName?: string | null): string {
  const v = clean(raw ?? "");
  if (v && !STATE_ONLY.includes(v)) {
    const direct = ALIAS_TO_NAME.get(v);
    if (direct) return direct;
    for (const [alias, name] of ALIAS_TO_NAME) {
      if (alias.length >= 4 && new RegExp(`\\b${escapeRegex(alias)}\\b`).test(v)) return name;
    }
  }
  const court = clean(courtName ?? "");
  if (court) {
    for (const [alias, name] of ALIAS_TO_NAME) {
      if (alias.length >= 4 && new RegExp(`\\b${escapeRegex(alias)}\\b`).test(court)) return name;
    }
  }
  if (v && !STATE_ONLY.includes(v)) return OUTSIDE_BIHAR;
  return UNSPECIFIED;
}

export function isCanonicalDistrict(name: string): boolean {
  return BIHAR_DISTRICTS.some((d) => d.name === name);
}

/**
 * The same mapping as `canonicalDistrict`, written as a MongoDB aggregation
 * expression so filters and group-bys on district run inside the database.
 * `districtPath` and `courtPath` are field references like "$district" (or
 * any expression that yields a string).
 */
export function districtExpr(districtPath: unknown, courtPath?: unknown): Record<string, unknown> {
  const lowered = (path: unknown) => ({
    $trim: { input: { $toLower: { $ifNull: [path, ""] } } },
  });
  const branchesFor = (input: string, exact: boolean) =>
    BIHAR_DISTRICTS.map((d) => ({
      case: exact
        ? { $in: [input, d.aliases] }
        : {
            $regexMatch: {
              input,
              regex: `\\b(${d.aliases.filter((a) => a.length >= 4).map(escapeRegex).join("|")})\\b`,
            },
          },
      then: d.name,
    }));

  const fromCourt = courtPath
    ? { $switch: { branches: branchesFor("$$c", false), default: null } }
    : null;

  return {
    $let: {
      vars: { d: lowered(districtPath), c: courtPath ? lowered(courtPath) : "" },
      in: {
        $switch: {
          branches: [
            ...branchesFor("$$d", true),
            ...branchesFor("$$d", false),
          ],
          default: {
            $ifNull: [
              fromCourt,
              { $cond: [{ $in: ["$$d", STATE_ONLY] }, UNSPECIFIED, OUTSIDE_BIHAR] },
            ],
          },
        },
      },
    },
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
