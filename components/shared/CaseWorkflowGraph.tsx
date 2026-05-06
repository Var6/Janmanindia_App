"use client";

import { useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
// Layout is now centred: the SVG sits in the middle of the row, with
// alt-path (col 1) labels rendered to its LEFT (right-aligned) and
// main-path (col 0) labels rendered to its RIGHT (left-aligned). Earlier
// versions stacked all labels in a single column on the right, which let
// long col-0 + col-1 strings overlap when wrapped.
const RH   = 64;   // row height (px)
const MX   = 76;   // main-column x — right of centre
const BX   = 28;   // branch-column x — left of centre
const DR   = 7;    // dot radius
const SVG_W = 104; // SVG canvas width

type St = "done" | "active" | "pending";

/** Graph-node id → stageTransition stage key. Only nodes with a real
 *  underlying boolean (firFiled / chargesheetFiled / per-step .filed) map
 *  to something the API can flip; descriptive nodes like "Investigation"
 *  or "Cognizance" don't appear here and stay non-clickable. */
const STAGE_ID_FOR_NODE: Record<string, string> = {
  fir:        "fir",
  cs:         "chargesheet",
  charges:    "charges",
  verdict:    "verdict",
  // High Court — node id matches the stage id verbatim.
  petitionFiled:       "petitionFiled",
  supportingAffidavit: "supportingAffidavit",
  admission:           "admission",
  counterAffidavit:    "counterAffidavit",
  rejoinder:           "rejoinder",
  pleaClose:           "pleaClose",
  inducement:          "inducement",
};

// ── Data types ──────────────────────────────────────────────────────────────
interface GNode {
  id: string;
  row: number;
  col: 0 | 1;
  status: St;
  label: string;
  sub?: string;
  date?: string;
  doc?: { label: string; url: string };
  terminal?: boolean;
}
interface GEdge {
  fr: number; fc: 0 | 1;
  tr: number; tc: 0 | 1;
  status: St;
}

// ── Geometry helpers ────────────────────────────────────────────────────────
const cx = (c: 0 | 1) => (c === 0 ? MX : BX);
const cy = (r: number) => r * RH + RH / 2;

function ePath(e: GEdge): string {
  const x1 = cx(e.fc), y1 = cy(e.fr) + DR + 1;
  const x2 = cx(e.tc), y2 = cy(e.tr) - DR - 1;
  if (x1 === x2) return `M${x1} ${y1}L${x1} ${y2}`;
  const m = (y1 + y2) / 2;
  return `M${x1} ${y1}C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
}

// ── Color helpers (returns raw values SVG can use) ──────────────────────────
function dotFill(s: St): string {
  if (s === "done")   return "#22c55e";
  if (s === "active") return "#6366f1";
  return "none";
}
function dotStroke(s: St): string {
  if (s === "pending") return "#9ca3af";
  return "none";
}
function edgeStroke(s: St): string {
  if (s === "done")   return "#22c55e";
  if (s === "active") return "#6366f1";
  return "#d1d5db";
}

// ── Status cursor ───────────────────────────────────────────────────────────
// Ordered list of boolean completion flags.
// Returns a function: st(i) → status at index i, with exactly one "active".
function makeSt(dones: boolean[]): (i: number) => St {
  let last = -1;
  for (let i = 0; i < dones.length; i++) if (dones[i]) last = i;
  return (i: number): St => {
    if (i <= last)   return "done";
    if (i === last + 1) return "active";
    return "pending";
  };
}

// ── Date formatter ──────────────────────────────────────────────────────────
function fmt(d?: string | Date): string | undefined {
  if (!d) return undefined;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Criminal-FIR graph builder ──────────────────────────────────────────────
type CrimPath = {
  firFiled: boolean; firDoc?: { url: string };
  chargesheetFiled: boolean; chargesheetDate?: string; chargesheetDueDate?: string;
  cognizanceOrderDoc?: { url: string };
  chargesFramed: boolean; chargeDocs?: { url: string; label: string }[];
  trial?: {
    prosecutionWitnesses?: { name: string; deposedAt?: string }[];
    defenseWitnesses?:     { name: string; deposedAt?: string }[];
  };
  verdict?: string; verdictDate?: string;
};

function buildFirGraph(cp: CrimPath, createdAt: string): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  const hasPW     = (cp.trial?.prosecutionWitnesses?.length ?? 0) > 0;
  const hasDW     = (cp.trial?.defenseWitnesses?.length  ?? 0) > 0;
  const hasVerdict = !!cp.verdict;

  const st = makeSt([
    true,                       // 0 case filed
    cp.firFiled,                // 1 fir
    cp.firFiled,                // 2 investigation
    cp.chargesheetFiled,        // 3 chargesheet
    !!cp.cognizanceOrderDoc,    // 4 cognizance
    cp.chargesFramed,           // 5 charges framed
    hasPW,                      // 6 prosecution witnesses
    hasDW,                      // 7 defence witnesses
    hasVerdict,                 // 8 examination (inferred)
    hasVerdict,                 // 9 arguments (inferred)
    hasVerdict,                 // 10 verdict
  ]);

  // Whether the final-form branch is visible (chargesheet not yet filed)
  const showFinalFormBranch = !cp.chargesheetFiled && !cp.cognizanceOrderDoc;
  // Row offsets shift down when the alt branch is visible. The branch
  // occupies its own two rows (Final Form, Notice to Informant) entirely
  // in col 1, so neither label collides with col-0 entries above or below.
  const extra = showFinalFormBranch ? 2 : 0;

  // Row layout — every (row, col) pair must be unique so labels (which
  // span the full label-column width) don't stack on top of each other.
  // Earlier versions had `cs` and `cog` both on row 3, and `cs` and `ff`
  // sharing row 3 too — both fixed here by giving every step its own row.
  const R = {
    filed:    0,
    fir:      1,
    invest:   2,
    cs:       3,            // chargesheet (col 0)
    ff:       4,            // final form  (col 1, only used when branch shown)
    notice:   5,            // notice to informant (col 1, only when branch shown)
    cog:      4 + extra,    // cognizance — sits below cs when branch hidden,
                            // and below `notice` when branch is visible
    appear:   5 + extra,
    charges:  6 + extra,
    pw:       7 + extra,
    dw:       8 + extra,
    exam:     9 + extra,
    args:    10 + extra,
    verdict: 11 + extra,
    sentence:12 + extra,    // col 1 (conviction path)
    closedC: 13 + extra,    // col 1 (conviction closed)
  };

  const n = (node: GNode)     => nodes.push(node);
  const e = (edge: GEdge)     => edges.push(edge);
  const ed = (fr: number, fc: 0|1, tr: number, tc: 0|1, s: St) =>
    e({ fr, fc, tr, tc, status: s });

  // Case filed
  n({ id:"filed", row:R.filed, col:0, status:"done", label:"Case Filed", date:fmt(createdAt) });

  // FIR
  n({ id:"fir", row:R.fir, col:0, status:st(1), label:"FIR Filed",
      doc: cp.firDoc ? { label:"FIR Document", url:cp.firDoc.url } : undefined });
  ed(R.filed, 0, R.fir, 0, st(1));

  // Investigation
  n({ id:"invest", row:R.invest, col:0, status:st(2), label:"Investigation", sub:"Police investigation" });
  ed(R.fir, 0, R.invest, 0, st(2));

  // Chargesheet (col 0)
  n({ id:"cs", row:R.cs, col:0, status:st(3), label:"Chargesheet Filed",
      sub: cp.chargesheetDueDate ? `Due: ${fmt(cp.chargesheetDueDate)}` : undefined,
      date: fmt(cp.chargesheetDate) });
  ed(R.invest, 0, R.cs, 0, st(3));

  if (showFinalFormBranch) {
    // Final Form branch (col 1)
    n({ id:"ff", row:R.ff, col:1, status:"active", label:"Final Form", sub:"If chargesheet not filed" });
    ed(R.invest, 0, R.ff, 1, "active");
    n({ id:"notice", row:R.notice, col:1, status:"pending", label:"Notice to Informant" });
    ed(R.ff, 1, R.notice, 1, "pending");
    ed(R.notice, 1, R.cog, 0, "pending");       // merge branch back to cognizance
    ed(R.cs, 0, R.cog, 0, "pending");            // chargesheet → cognizance (alt)
  } else {
    ed(R.cs, 0, R.cog, 0, st(4));
  }

  // Cognizance
  n({ id:"cog", row:R.cog, col:0, status:st(4), label:"Cognizance",
      doc: cp.cognizanceOrderDoc ? { label:"Cognizance Order", url:(cp.cognizanceOrderDoc as any).url } : undefined });

  // Appearance
  n({ id:"appear", row:R.appear, col:0, status:st(4), label:"Appearance of Accused" });
  ed(R.cog, 0, R.appear, 0, st(4));

  // Charges framed
  n({ id:"charges", row:R.charges, col:0, status:st(5), label:"Framing of Charges",
      sub: cp.chargesFramed ? "Charges formally framed" : "Or discharged if case weak",
      doc: cp.chargeDocs?.[0] ? { label:cp.chargeDocs[0].label, url:cp.chargeDocs[0].url } : undefined });
  ed(R.appear, 0, R.charges, 0, st(5));

  // Prosecution witnesses
  const pwCount = cp.trial?.prosecutionWitnesses?.length ?? 0;
  n({ id:"pw", row:R.pw, col:0, status:st(6), label:"Prosecution Witnesses",
      sub: pwCount > 0 ? `${pwCount} deposed` : "None yet" });
  ed(R.charges, 0, R.pw, 0, st(6));

  // Defence witnesses
  const dwCount = cp.trial?.defenseWitnesses?.length ?? 0;
  n({ id:"dw", row:R.dw, col:0, status:st(7), label:"Defence Witnesses",
      sub: dwCount > 0 ? `${dwCount} deposed` : "None yet" });
  ed(R.pw, 0, R.dw, 0, st(7));

  // Examination
  n({ id:"exam", row:R.exam, col:0, status:st(8), label:"Examination of Accused", sub:"Sec 313 BNSS" });
  ed(R.dw, 0, R.exam, 0, st(8));

  // Arguments
  n({ id:"args", row:R.args, col:0, status:st(9), label:"Arguments" });
  ed(R.exam, 0, R.args, 0, st(9));

  // Verdict — split into acquittal (col 0) and conviction (col 1) if verdict known
  const isAcquittal = cp.verdict?.toLowerCase().includes("acquit");
  const isConviction = hasVerdict && !isAcquittal;

  if (isAcquittal) {
    n({ id:"verdict", row:R.verdict, col:0, status:"done", label:"Acquittal",
        sub:cp.verdict, date:fmt(cp.verdictDate), terminal:true });
    ed(R.args, 0, R.verdict, 0, "done");
  } else if (isConviction) {
    // Main col shows acquittal (not taken)
    n({ id:"acquit", row:R.verdict, col:0, status:"pending", label:"Acquittal", sub:"Not taken" });
    ed(R.args, 0, R.verdict, 0, "pending");
    // Branch col shows conviction path
    n({ id:"convict", row:R.verdict, col:1, status:"done", label:"Convicted", date:fmt(cp.verdictDate) });
    ed(R.args, 0, R.verdict, 1, "done");
    n({ id:"sentence", row:R.sentence, col:1, status:"done", label:"Sentencing Hearing" });
    ed(R.verdict, 1, R.sentence, 1, "done");
    n({ id:"closedC", row:R.closedC, col:1, status:"done", label:"Case Closed", terminal:true });
    ed(R.sentence, 1, R.closedC, 1, "done");
  } else {
    n({ id:"verdict", row:R.verdict, col:0, status:st(10), label:"Verdict",
        sub:"Acquittal → case closed · Conviction → sentencing" });
    ed(R.args, 0, R.verdict, 0, st(10));
  }

  return { nodes, edges };
}

// ── Criminal-Complaint (no FIR) graph builder ───────────────────────────────
function buildComplaintGraph(cp: CrimPath, createdAt: string): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  const hasPW     = (cp.trial?.prosecutionWitnesses?.length ?? 0) > 0;
  const hasDW     = (cp.trial?.defenseWitnesses?.length  ?? 0) > 0;
  const hasVerdict = !!cp.verdict;

  const st = makeSt([
    true,                    // 0 case filed
    true,                    // 1 complaint (same event)
    !!cp.cognizanceOrderDoc, // 2 enquiry → cognizance (infer)
    !!cp.cognizanceOrderDoc, // 3 pre-cognizance summon
    !!cp.cognizanceOrderDoc, // 4 cognizance
    !!cp.cognizanceOrderDoc, // 5 appearance
    cp.chargesFramed,        // 6 charge
    hasPW,                   // 7 prosecution
    hasDW,                   // 8 defence
    hasVerdict,              // 9 examination
    hasVerdict,              // 10 arguments
    hasVerdict,              // 11 verdict
  ]);

  const step = (row: number, id: string, label: string, si: number, sub?: string, doc?: { label: string; url: string }): void => {
    nodes.push({ id, row, col:0, status:st(si), label, sub, doc });
    if (row > 0) {
      const prevStatus = nodes[nodes.length - 2]?.status ?? "pending";
      const s: St = st(si) === "done" ? "done" : prevStatus === "done" ? "active" : "pending";
      edges.push({ fr:row-1, fc:0, tr:row, tc:0, status: s });
    }
  };

  step(0,  "filed",   "Case Filed",                 0, fmt(createdAt));
  step(1,  "comp",    "Complaint Filed",             1);
  step(2,  "enquiry", "Enquiry & Evidence",          2, "Pre-cognizance stage");
  step(3,  "summon",  "Pre-Cognizance Summon",       3);
  step(4,  "cog",     "Cognizance",                  4,
    undefined,
    cp.cognizanceOrderDoc ? { label:"Cognizance Order", url:(cp.cognizanceOrderDoc as any).url } : undefined);
  step(5,  "appear",  "Summon & Appearance",         5);
  step(6,  "bce",     "Before Charge Evidence",      5, "Evidence recorded before framing charges");
  step(7,  "charge",  "Charge Framed",               6,
    cp.chargesFramed ? "Charges framed" : "Or discharged",
    cp.chargeDocs?.[0] ? { label:cp.chargeDocs[0].label, url:cp.chargeDocs[0].url } : undefined);
  step(8,  "ace",     "After Charge Evidence",       6);
  step(9,  "dw",      "Defence Witnesses",           8, `${(cp.trial?.defenseWitnesses?.length ?? 0)} deposed`);
  step(10, "pw",      "Prosecution Witnesses",       7, `${(cp.trial?.prosecutionWitnesses?.length ?? 0)} deposed`);
  step(11, "exam",    "Examination of Accused",      9, "Sec 313 BNSS");
  step(12, "args",    "Arguments",                   10);

  const isAcquittal = cp.verdict?.toLowerCase().includes("acquit");
  const isConviction = hasVerdict && !isAcquittal;

  if (isAcquittal) {
    nodes.push({ id:"verdict", row:13, col:0, status:"done", label:"Acquittal — Case Closed",
      sub:cp.verdict, date:fmt(cp.verdictDate), terminal:true });
    edges.push({ fr:12, fc:0, tr:13, tc:0, status:"done" });
  } else if (isConviction) {
    nodes.push({ id:"acquit",  row:13, col:0, status:"pending", label:"Acquittal", sub:"Not taken" });
    nodes.push({ id:"convict", row:13, col:1, status:"done",    label:"Convicted", date:fmt(cp.verdictDate) });
    edges.push({ fr:12, fc:0, tr:13, tc:0, status:"pending" });
    edges.push({ fr:12, fc:0, tr:13, tc:1, status:"done" });
    nodes.push({ id:"sentence", row:14, col:1, status:"done", label:"Sentencing Hearing" });
    edges.push({ fr:13, fc:1, tr:14, tc:1, status:"done" });
    nodes.push({ id:"closedC", row:15, col:1, status:"done", label:"Case Closed", terminal:true });
    edges.push({ fr:14, fc:1, tr:15, tc:1, status:"done" });
  } else {
    nodes.push({ id:"verdict", row:13, col:0, status:st(11), label:"Verdict", sub:"Acquittal or Conviction" });
    edges.push({ fr:12, fc:0, tr:13, tc:0, status:st(11) });
  }

  return { nodes, edges };
}

// ── High-Court graph builder ────────────────────────────────────────────────
type HCStep = { filed: boolean; filedAt?: string; doc?: { url: string }; notes?: string };
type HCPath  = {
  petitionFiled: HCStep; supportingAffidavit: HCStep; admission: HCStep;
  counterAffidavit: HCStep; rejoinder: HCStep; pleaClose: HCStep; inducement: HCStep;
};

function buildHCGraph(hcp: HCPath, createdAt: string): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  const steps: [string, string, HCStep][] = [
    ["petition",   "Petition Filed",          hcp.petitionFiled],
    ["affidavit",  "Supporting Affidavit",    hcp.supportingAffidavit],
    ["admission",  "Admission",               hcp.admission],
    ["counter",    "Counter Affidavit",       hcp.counterAffidavit],
    ["rejoinder",  "Rejoinder",               hcp.rejoinder],
    ["pleaclose",  "Plea Close",              hcp.pleaClose],
    ["inducement", "Inducement / Judgment",   hcp.inducement],
  ];

  const st = makeSt([true, ...steps.map(([,,s]) => s.filed)]);

  nodes.push({ id:"filed", row:0, col:0, status:"done", label:"Case Filed", date:fmt(createdAt) });

  steps.forEach(([id, label, s], i) => {
    const row = i + 1;
    const status = st(i + 1);
    nodes.push({
      id, row, col:0, status, label,
      date: fmt(s.filedAt),
      sub: s.notes,
      doc: s.doc ? { label:"Document", url:s.doc.url } : undefined,
      terminal: id === "inducement" && s.filed,
    });
    edges.push({ fr:row-1, fc:0, tr:row, tc:0, status });
  });

  return { nodes, edges };
}

// ── SVG renderer ────────────────────────────────────────────────────────────
function GraphSvg({ nodes, edges, totalRows }: { nodes: GNode[]; edges: GEdge[]; totalRows: number }) {
  const h = totalRows * RH;
  return (
    <svg width={SVG_W} height={h} style={{ flexShrink: 0 }}>
      {/* Edges */}
      {edges.map((e, i) => (
        <path key={i} d={ePath(e)}
          stroke={edgeStroke(e.status)} strokeWidth={2} fill="none"
          strokeDasharray={e.status === "pending" ? "4 3" : undefined} />
      ))}
      {/* Dots */}
      {nodes.map(n => {
        const x = cx(n.col), y = cy(n.row);
        const fill   = dotFill(n.status);
        const stroke = dotStroke(n.status);
        const r = n.terminal ? DR + 1 : DR;
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={2} />
            {/* Checkmark for done nodes */}
            {n.status === "done" && (
              <polyline
                points={`${x-3},${y} ${x-0.5},${y+3} ${x+4},${y-3}`}
                stroke="white" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
            )}
            {/* Active pulse ring */}
            {n.status === "active" && (
              <circle cx={x} cy={y} r={r + 4} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.35} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Label column ────────────────────────────────────────────────────────────
interface LabelProps {
  nodes: GNode[];
  /** Which column of the graph this label strip is paired with — drives
   *  filtering (we only render nodes that belong here) and text alignment.
   *  - "main" → col 0 nodes, sit to the right of the SVG, left-aligned.
   *  - "alt"  → col 1 nodes, sit to the left of the SVG, right-aligned. */
  side: "main" | "alt";
  canEdit: boolean;
  onStageClick?: (nodeId: string, stageId: string, currentlyDone: boolean) => Promise<void> | void;
  busyNodeId?: string | null;
}
function GraphLabels({ nodes, side, canEdit, onStageClick, busyNodeId }: LabelProps) {
  const wantedCol: 0 | 1 = side === "main" ? 0 : 1;
  const visible = nodes.filter(n => n.col === wantedCol);
  const isAlt = side === "alt";
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      {visible.map(n => {
        const top = n.row * RH;
        const isBranch = n.col === 1;
        // Decide whether the label itself becomes a button: only when the
        // viewer can edit AND we have a stageTransition mapping for this
        // node id. Click toggles done-ness via the parent callback.
        const stageId   = STAGE_ID_FOR_NODE[n.id];
        const clickable = canEdit && Boolean(stageId) && Boolean(onStageClick);
        const busy      = busyNodeId === n.id;

        const labelBody = (
          <>
            <div className={`flex items-center gap-2 flex-wrap ${isAlt ? "justify-end" : ""}`}>
              <span className="text-sm font-semibold leading-tight"
                style={{
                  color: n.status === "done"   ? "var(--success-text, #166534)" :
                         n.status === "active" ? "var(--accent)" :
                                                 "var(--muted)",
                }}>
                {n.label}
              </span>
              {isBranch && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)", color: "var(--warning, #92400e)" }}>
                  alt path
                </span>
              )}
              {n.terminal && n.status === "done" && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "#166534" }}>
                  closed
                </span>
              )}
              {clickable && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-opacity"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                  }}>
                  {busy ? "…" : n.status === "done" ? "click to undo" : "click to mark done"}
                </span>
              )}
            </div>
            {(n.sub || n.date) && (
              <p className={`text-xs mt-0.5 leading-relaxed ${isAlt ? "text-right" : ""}`} style={{ color: "var(--muted)" }}>
                {n.date && <span>{n.date}</span>}
                {n.date && n.sub && <span> · </span>}
                {n.sub && <span>{n.sub}</span>}
              </p>
            )}
            {n.doc && (
              <a href={n.doc.url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium hover:underline underline-offset-2"
                style={{ color: "var(--accent)" }}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3 h-3">
                  <path d="M2 1.5h6l2.5 2.5V12a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5V2a.5.5 0 01.5-.5z"/>
                  <polyline points="8 1.5 8 4 10.5 4"/>
                </svg>
                {n.doc.label}
              </a>
            )}
          </>
        );

        // Each side anchors its labels against the SVG edge. Alt (left) sits
        // flush against the right side of its container; main (right) sits
        // flush against the left side of its container. Padding nudges the
        // label away from the dot so the line connecting them is unobscured.
        const wrapperStyle: React.CSSProperties = {
          position: "absolute", top,
          left:  isAlt ? 0 : 0,
          right: isAlt ? 0 : 0,
          height: RH,
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: isAlt ? "flex-end" : "flex-start",
          paddingLeft:  isAlt ? 8 : 12,
          paddingRight: isAlt ? 12 : 8,
        };

        if (clickable) {
          return (
            <button
              key={n.id}
              type="button"
              disabled={busy}
              onClick={() => onStageClick!(n.id, stageId, n.status === "done")}
              style={{
                ...wrapperStyle,
                textAlign: isAlt ? "right" : "left",
                background: "transparent", border: "none",
                cursor: busy ? "wait" : "pointer", padding: 0,
                paddingLeft:  isAlt ? 8 : 12,
                paddingRight: isAlt ? 12 : 8,
                borderRadius: 8,
              }}
              className="hover:bg-(--bg-secondary) transition-colors"
              title={n.status === "done" ? "Click to undo this step" : "Click to mark this step done"}>
              {labelBody}
            </button>
          );
        }
        return (
          <div key={n.id} style={wrapperStyle}>
            {labelBody}
          </div>
        );
      })}
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: "#22c55e", label: "Completed",   fill: true  },
    { color: "#6366f1", label: "Current step", fill: true  },
    { color: "#9ca3af", label: "Pending",      fill: false },
  ];
  return (
    <div className="flex items-center gap-4 flex-wrap px-1 pb-1">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <svg width={14} height={14}>
            <circle cx={7} cy={7} r={5}
              fill={item.fill ? item.color : "none"}
              stroke={item.fill ? "none" : item.color}
              strokeWidth={1.5}
              strokeDasharray={item.fill ? undefined : "3 2"}
            />
          </svg>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <svg width={20} height={6}><line x1={0} y1={3} x2={20} y2={3} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" /></svg>
        <span className="text-xs" style={{ color: "var(--muted)" }}>Alt branch</span>
      </div>
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
interface Props {
  path: "criminal" | "highcourt";
  criminalPath?: CrimPath;
  highCourtPath?: HCPath;
  firFiled?: boolean;
  createdAt: string;
  /** Required for click-to-advance — when true, mappable nodes (FIR /
   *  Chargesheet / Charges / Verdict / each HC step) become buttons. */
  canEdit?: boolean;
  /** Case id for the PATCH target. Only used when canEdit is true. */
  caseId?: string;
  /** Re-fetch the case after a successful stage flip. */
  onChanged?: () => void | Promise<void>;
  /** Pinned cheatcode notes — rendered as floating sticky pills inside
   *  the graph card so the must-know facts are visible while planning
   *  next steps. Pass already-filtered (pinned only) entries. */
  pinnedNotes?: Array<{ _id: string; text: string; byName?: string }>;
}

export default function CaseWorkflowGraph({ path, criminalPath, highCourtPath, firFiled, createdAt, canEdit, caseId, onChanged, pinnedNotes }: Props) {
  let nodes: GNode[] = [];
  let edges: GEdge[] = [];
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);

  if (path === "criminal" && criminalPath) {
    const result = firFiled
      ? buildFirGraph(criminalPath, createdAt)
      : buildComplaintGraph(criminalPath, createdAt);
    nodes = result.nodes;
    edges = result.edges;
  } else if (path === "highcourt" && highCourtPath) {
    const result = buildHCGraph(highCourtPath, createdAt);
    nodes = result.nodes;
    edges = result.edges;
  }

  if (nodes.length === 0) return null;

  // Toggle the underlying boolean for this stage: done → revert; else → advance.
  // The parent re-fetches the case so the graph re-renders with the new state.
  async function handleStageClick(nodeId: string, stageId: string, currentlyDone: boolean) {
    if (!caseId) return;
    setBusyNodeId(nodeId);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageTransition: { stage: stageId, action: currentlyDone ? "revert" : "advance" },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? "Failed to update stage.");
        return;
      }
      await onChanged?.();
    } finally {
      setBusyNodeId(null);
    }
  }

  const totalRows = Math.max(...nodes.map(n => n.row)) + 1;
  const totalH    = totalRows * RH;

  // Completion stats
  const done    = nodes.filter(n => n.status === "done").length;
  const total   = nodes.filter(n => n.id !== "acquit" && n.id !== "convict").length; // exclude alt-verdict nodes from count

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>

      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between gap-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {path === "criminal"
              ? (firFiled ? "Criminal — FIR Workflow" : "Criminal — Complaint Workflow")
              : "High Court Workflow"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {done} of {total} steps completed
          </p>
        </div>
        {/* Mini progress bar */}
        <div className="flex-1 max-w-32 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${(done / Math.max(total, 1)) * 100}%`, background: "#22c55e" }} />
        </div>
      </div>

      {/* Graph + sticky notes side-by-side. Graph sits on the left and
          takes the available width; pinned cheatcode notes float in a
          column on the right inside the same card so the team's
          must-know facts stay visible alongside the workflow. */}
      <div className="px-4 py-4 flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <Legend />
          <div style={{ position: "relative", height: totalH, display: "flex", alignItems: "stretch", marginTop: 8 }}>
            <GraphLabels
              nodes={nodes}
              side="alt"
              canEdit={Boolean(canEdit && caseId)}
              onStageClick={handleStageClick}
              busyNodeId={busyNodeId}
            />
            <GraphSvg nodes={nodes} edges={edges} totalRows={totalRows} />
            <GraphLabels
              nodes={nodes}
              side="main"
              canEdit={Boolean(canEdit && caseId)}
              onStageClick={handleStageClick}
              busyNodeId={busyNodeId}
            />
          </div>
        </div>

        {pinnedNotes && pinnedNotes.length > 0 && (
          <aside className="shrink-0 w-56 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              📌 Pinned notes
            </p>
            {pinnedNotes.map((n, i) => (
              <div key={n._id}
                className="relative px-3 py-2 rounded-md text-xs leading-snug shadow-sm"
                style={{
                  background: "#fef9c3",
                  color: "#713f12",
                  border: "1px solid #fde047",
                  transform: `rotate(${i % 2 === 0 ? "-0.6" : "0.6"}deg)`,
                }}>
                <p className="whitespace-pre-line">{n.text}</p>
                {n.byName && (
                  <p className="mt-1 text-[10px] italic" style={{ color: "#a16207" }}>— {n.byName}</p>
                )}
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
