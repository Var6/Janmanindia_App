#!/usr/bin/env python3
"""Parse the raw eCourts <option> dumps into a structured, flow-tagged catalog
grouped by court level, and emit lib/ecourts-case-types.ts.

Flow tagging is a best-effort keyword classifier (procedural applications →
civil; criminal/family/writ keywords otherwise). It is meant to be reviewed and
corrected in the editable doc — getting ~85% right beats hand-mapping 150 rows.
"""

import re
import html
from pathlib import Path

RAW = Path(__file__).parent / "ecourts-raw"
OUT = Path(__file__).parent.parent / "lib" / "ecourts-case-types.ts"

OPTION_RE = re.compile(r'<option value="([^"]*)">(.*?)</option>', re.S)
# A name carrying an Order/Rule/section citation is a procedural application,
# not a standalone matter — force it to the civil flow regardless of keywords.
# Require an actual Order/Rule/CPC citation — a bare "U/S" is too common in
# real case-type names (e.g. "CRIMINAL APPEAL (U/S)") to treat as procedural.
PROCEDURAL_RE = re.compile(r'(0-\d|O-\d|\bR-?\d|\bRULE\b|\bCPC\b|\bORDER \d|U/S \d+\s*CPC)', re.I)

# Keyword → flow. Checked in this order; first hit wins (after the procedural
# pre-filter). Family before criminal so "maintenance"/"matrimonial" win.
FAMILY_KW = [
    "matrimonial", "marriage", "divorce", "conjugal", "guardian & ward",
    "guardianship", "maintainance", "maintenance", "custody", "adoption",
]
CRIMINAL_KW = [
    "criminal", "cr. ", "cri.", "cri ", " cr ", "bail", "anticipatory",
    "ndps", "pocso", "atrociti", "harijan", "sc / st", "sc/st", "ipc",
    "session", "pmla", "money laundering", "vigilance", "p.c. act", "pc act",
    "confiscation", "child act", "mp/mla", "human rights", "food adult",
    "e.c.act", "ec act", "domestic violence", "d.v", "narcotic", "arms",
    "excise", "death reference", "govt. appeal", "g. app", "g.app",
    "n.i.a", "buds act", "a.t.s", "drug and cos",
]
WRIT_KW = [
    "writ", "wjc", "cwjc", "mjc", "appeal", "revision", "rev.", "reference",
    "ref.", "review", "letters patent", "l.p.a", "lpa", "slp", "special leave",
    "sca", "supreme court", "election petition", "elect. petn", "company",
    "comp.", "commercial appeal", "certificate", "patent", "contempt", "tax",
    "insolvency", "request case", "req. case", "test case",
]


def canonical_name(raw: str) -> str:
    """eCourts options are sometimes 'SHORT - Full description' or a truncated
    duplicate 'Foo Bar Baz - Foo Bar'. Pick the more informative side."""
    text = html.unescape(raw).strip()
    text = re.sub(r"\s+", " ", text)
    if " - " in text:
        left, right = text.split(" - ", 1)
        # Use whichever side has more words (more informative).
        return (right if len(right.split()) > len(left.split()) else left).strip()
    return text


def extract_code(raw: str):
    """High-court options carry a [CODE] suffix; pull it out if present."""
    m = re.search(r"\[([^\]]+)\]$", html.unescape(raw).strip())
    if m:
        name = html.unescape(raw).strip()[: m.start()].strip()
        return canonical_name(name), m.group(1).strip()
    return canonical_name(raw), None


def classify(name: str) -> str:
    low = name.lower()
    if PROCEDURAL_RE.search(name):
        return "civil"
    for kw in FAMILY_KW:
        if kw in low:
            return "family"
    for kw in CRIMINAL_KW:
        if kw in low:
            return "criminal"
    for kw in WRIT_KW:
        if kw in low:
            return "writ"
    return "civil"


def flow_to_path(flow: str) -> str:
    # The app renders only two trees today (criminal vs the High-Court flow).
    # Family / civil / writ all ride the highcourt path until their own trees
    # are built; `flow` carries the finer intent for that later work + the doc.
    return "criminal" if flow == "criminal" else "highcourt"


def parse_file(fname: str):
    raw = (RAW / fname).read_text()
    seen = set()
    out = []
    for _value, label in OPTION_RE.findall(raw):
        if not label.strip():
            continue
        name, code = extract_code(label)
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        flow = classify(name)
        out.append({"name": name, "code": code, "flow": flow, "path": flow_to_path(flow)})
    out.sort(key=lambda e: e["name"].lower())
    return out


# Supreme Court is not in the pasted dumps — provide a small curated set.
SUPREME = [
    {"name": "Special Leave Petition (Civil)", "code": "SLP(C)", "flow": "writ"},
    {"name": "Special Leave Petition (Criminal)", "code": "SLP(Crl)", "flow": "criminal"},
    {"name": "Writ Petition (Art. 32)", "code": "WP(SC)", "flow": "writ"},
    {"name": "Civil Appeal", "code": "CA", "flow": "writ"},
    {"name": "Criminal Appeal", "code": "Crl.A", "flow": "criminal"},
    {"name": "Review Petition", "code": "RP", "flow": "writ"},
    {"name": "Curative Petition", "code": "CP", "flow": "writ"},
]
for e in SUPREME:
    e["path"] = flow_to_path(e["flow"])

LEVELS = [
    ("highCourtCriminal", "High Court — Criminal", "hc-criminal.html"),
    ("highCourtCivil", "High Court — Civil", "hc-civil.html"),
    ("district", "District Court", "district.html"),
]

groups = {}
for key, _label, fname in LEVELS:
    groups[key] = parse_file(fname)
groups["supreme"] = SUPREME


def js_str(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def emit_entry(e):
    parts = [f"name: {js_str(e['name'])}"]
    if e.get("code"):
        parts.append(f"code: {js_str(e['code'])}")
    parts.append(f'flow: "{e["flow"]}"')
    parts.append(f'path: "{e["path"]}"')
    return "    { " + ", ".join(parts) + " },"


lines = []
lines.append("// AUTO-GENERATED by scripts/gen_ecourts_case_types.py — do not edit by hand.")
lines.append("// Source: eCourts case-type dropdowns (scripts/ecourts-raw/*.html).")
lines.append("// `flow` is a best-effort classification; review/correct as needed.")
lines.append("")
lines.append('export type CaseFlow = "criminal" | "family" | "civil" | "writ";')
lines.append('export type WorkflowPath = "criminal" | "highcourt";')
lines.append("")
lines.append("export interface ECourtCaseType {")
lines.append("  name: string;")
lines.append("  /** Short cause-list code, where the portal provides one. */")
lines.append("  code?: string;")
lines.append("  /** Intended workflow flow (drives the step tree once all four are built). */")
lines.append("  flow: CaseFlow;")
lines.append("  /** Workflow path the app renders today (criminal vs high-court tree). */")
lines.append("  path: WorkflowPath;")
lines.append("}")
lines.append("")
lines.append('export type CourtLevel = "supreme" | "highCourtCriminal" | "highCourtCivil" | "district";')
lines.append("")
lines.append("export const ECOURTS_CASE_TYPES: Record<CourtLevel, ECourtCaseType[]> = {")
for key in ["supreme", "highCourtCriminal", "highCourtCivil", "district"]:
    lines.append(f"  {key}: [")
    for e in groups[key]:
        lines.append(emit_entry(e))
    lines.append("  ],")
lines.append("};")
lines.append("")
lines.append("""/** Case types to show for a given app court type. High Court combines both
 *  benches; "other" (tribunals etc.) has no fixed list — callers fall back to
 *  free text. */
export function caseTypesForCourt(
  courtType: "supreme" | "highcourt" | "district" | "other",
): ECourtCaseType[] {
  if (courtType === "supreme") return ECOURTS_CASE_TYPES.supreme;
  if (courtType === "district") return ECOURTS_CASE_TYPES.district;
  if (courtType === "highcourt")
    return [...ECOURTS_CASE_TYPES.highCourtCriminal, ...ECOURTS_CASE_TYPES.highCourtCivil];
  return [];
}

/** Look up a case type by name across every court level. */
export function lookupECourtType(name: string): ECourtCaseType | undefined {
  const all = [
    ...ECOURTS_CASE_TYPES.supreme,
    ...ECOURTS_CASE_TYPES.highCourtCriminal,
    ...ECOURTS_CASE_TYPES.highCourtCivil,
    ...ECOURTS_CASE_TYPES.district,
  ];
  const lc = name.trim().toLowerCase();
  return all.find((t) => t.name.toLowerCase() === lc || t.code?.toLowerCase() === lc);
}""")
lines.append("")

OUT.write_text("\n".join(lines))

# Print a classification summary so the mapping can be sanity-checked.
from collections import Counter
print(f"Wrote {OUT}")
for key in ["supreme", "highCourtCriminal", "highCourtCivil", "district"]:
    c = Counter(e["flow"] for e in groups[key])
    print(f"  {key:20s} {len(groups[key]):3d} types  {dict(c)}")
