"use client";

import { useMemo, useState } from "react";
import type { ChartType, NumberFormat, QueryResult, QueryRow } from "@/lib/insights/types";
import { formatNumber, periodLabel } from "@/lib/insights/format";
import { BIHAR_DISTRICTS, OUTSIDE_BIHAR, UNSPECIFIED, canonicalDistrict, isCanonicalDistrict } from "@/lib/insights/districts";
import { INDIA_GRID, INDIA_STATES, STATE_OTHER, STATE_UNSPECIFIED, canonicalState } from "@/lib/insights/states";
import { SERIES_COLOURS } from "@/components/insights/charts/palette";

/**
 * Draws a QueryResult as one of seven chart types, in plain SVG / HTML (no
 * chart library), using the app's theme colours so it works in dark mode.
 */

export type ChartDisplay = {
  horizontal?: boolean;
  stacked?: boolean;
  showValues?: boolean;
  numberFormat?: NumberFormat;
  topN?: number;
  /** For the map chart: Bihar's districts (default) or India's states. */
  mapArea?: "bihar" | "india";
};

type Props = {
  type: ChartType;
  result: QueryResult;
  grain?: string;
  display?: ChartDisplay;
  height?: number;
};

const OTHER = "Other";

export default function ChartView({ type, result, grain, display = {}, height = 260 }: Props) {
  const fmt = (n: number) => formatNumber(n, display.numberFormat ?? "indian", n % 1 === 0 ? 0 : 1);
  if (!result.rows.length) {
    return <Empty />;
  }
  switch (type) {
    case "number": return <NumberView result={result} fmt={fmt} />;
    case "table": return <TableView result={result} grain={grain} fmt={fmt} />;
    case "pivot": return <PivotView result={result} grain={grain} fmt={fmt} />;
    case "pie": return <PieView result={result} fmt={fmt} topN={display.topN ?? 8} />;
    case "map": return <MapView result={result} fmt={fmt} area={display.mapArea === "india" ? "india" : "bihar"} />;
    case "line": return <LineView result={result} grain={grain} fmt={fmt} height={height} />;
    default: return <BarView result={result} grain={grain} fmt={fmt} display={display} height={height} />;
  }
}

function Empty() {
  return (
    <div className="h-full min-h-24 flex items-center justify-center text-sm text-(--muted)">
      No data for this selection.
    </div>
  );
}

/* --------------------------- shaping helpers --------------------------- */

type Series = { name: string; values: Map<string, number> };

/** Category axis + series from rows. With a time grain the periods are the
 *  categories and the first group-by (if any) splits the series; otherwise
 *  group-by 1 is the category and group-by 2 the series. */
function shape(result: QueryResult, grain?: string) {
  const hasTime = result.rows.some((r) => r.period);
  const catOf = (r: QueryRow) => (hasTime ? r.period! : r.keys[0] ?? "All");
  const serOf = (r: QueryRow) => (hasTime ? r.keys[0] : r.keys[1]) ?? result.measureLabel;
  const cats: string[] = [];
  const series = new Map<string, Series>();
  for (const r of result.rows) {
    const c = catOf(r);
    if (!cats.includes(c)) cats.push(c);
    const s = serOf(r);
    if (!series.has(s)) series.set(s, { name: s, values: new Map() });
    const m = series.get(s)!.values;
    m.set(c, (m.get(c) ?? 0) + r.value);
  }
  if (hasTime) cats.sort();
  const label = (c: string) => (hasTime ? periodLabel(c, grain ?? "month") : c);
  return { cats, series: [...series.values()], label, hasTime };
}

/** Keep the largest N categories (by total) and fold the rest into "Other". */
function topCategories(cats: string[], series: Series[], n: number) {
  if (cats.length <= n) return { cats, series };
  const total = (c: string) => series.reduce((s, x) => s + (x.values.get(c) ?? 0), 0);
  const keep = [...cats].sort((a, b) => total(b) - total(a)).slice(0, n - 1);
  const rest = cats.filter((c) => !keep.includes(c));
  const folded = series.map((s) => {
    const values = new Map<string, number>();
    for (const c of keep) values.set(c, s.values.get(c) ?? 0);
    values.set(OTHER, rest.reduce((sum, c) => sum + (s.values.get(c) ?? 0), 0));
    return { ...s, values };
  });
  return { cats: [...keep, OTHER], series: folded };
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--muted) mb-2">
      {names.map((n, i) => (
        <span key={n} className="inline-flex items-center gap-1.5" data-legend={n} data-colour={SERIES_COLOURS[i % SERIES_COLOURS.length]}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }} />
          {n}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------- number ------------------------------- */

function NumberView({ result, fmt }: { result: QueryResult; fmt: (n: number) => string }) {
  const total = result.rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-4xl font-bold tabular-nums text-(--text)">{fmt(total)}</p>
      <p className="text-sm text-(--muted) mt-1">{result.measureLabel}</p>
    </div>
  );
}

/* --------------------------------- bar --------------------------------- */

function BarView({ result, grain, fmt, display, height }: {
  result: QueryResult; grain?: string; fmt: (n: number) => string; display: ChartDisplay; height: number;
}) {
  const shaped = shape(result, grain);
  const { cats, series } = shaped.hasTime ? shaped : topCategories(shaped.cats, shaped.series, display.topN ?? 12);
  const stacked = !!display.stacked && series.length > 1;
  const horizontal = !!display.horizontal && !shaped.hasTime;
  const totals = cats.map((c) => (stacked
    ? series.reduce((s, x) => s + (x.values.get(c) ?? 0), 0)
    : Math.max(...series.map((x) => x.values.get(c) ?? 0))));
  const max = niceMax(Math.max(...totals, 0));
  const [hover, setHover] = useState<string | null>(null);

  if (horizontal) {
    const rowH = 26;
    const labelW = 150;
    const w = 600;
    const h = cats.length * rowH + 8;
    return (
      <div>
        <Legend names={series.map((s) => s.name)} />
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={result.measureLabel}>
          {cats.map((c, i) => {
            let x0 = labelW;
            const y = i * rowH + 4;
            return (
              <g key={c} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
                <text x={labelW - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize="11" fill="var(--text)">
                  {truncate(shaped.label(c), 24)}
                </text>
                {series.map((s, si) => {
                  const v = s.values.get(c) ?? 0;
                  const bw = ((w - labelW - 60) * v) / max;
                  const bh = stacked ? rowH - 8 : (rowH - 8) / series.length;
                  const by = stacked ? y : y + si * bh;
                  const rect = <rect key={s.name} x={x0} y={by} width={Math.max(bw, v > 0 ? 1 : 0)} height={bh}
                    rx="3" fill={SERIES_COLOURS[si % SERIES_COLOURS.length]} opacity={hover && hover !== c ? 0.5 : 1}><title>{`${s.name}: ${fmt(v)}`}</title></rect>;
                  if (stacked) x0 += bw;
                  return rect;
                })}
                {display.showValues !== false && (
                  <text x={labelW + ((w - labelW - 60) * totals[i]) / max + 6} y={y + rowH / 2 + 4} fontSize="11" fill="var(--muted)">
                    {fmt(totals[i])}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const w = 600;
  const pad = { l: 44, r: 8, t: 12, b: 48 };
  const plotW = w - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const slot = plotW / Math.max(cats.length, 1);
  const barW = Math.min(48, slot * 0.7);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <div>
      <Legend names={series.map((s) => s.name)} />
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" role="img" aria-label={result.measureLabel}>
        {ticks.map((t) => {
          const y = pad.t + plotH - (plotH * t) / max;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{fmt(t)}</text>
            </g>
          );
        })}
        {cats.map((c, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let yTop = pad.t + plotH;
          return (
            <g key={c} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              {series.map((s, si) => {
                const v = s.values.get(c) ?? 0;
                const bh = (plotH * v) / max;
                const bw = stacked ? barW : barW / series.length;
                const bx = stacked ? cx - barW / 2 : cx - barW / 2 + si * bw;
                const by = stacked ? yTop - bh : pad.t + plotH - bh;
                if (stacked) yTop -= bh;
                return (
                  <rect key={s.name} x={bx} y={by} width={bw - (stacked ? 0 : 1)} height={Math.max(bh, v > 0 ? 1 : 0)}
                    rx="2" fill={SERIES_COLOURS[si % SERIES_COLOURS.length]} opacity={hover && hover !== c ? 0.5 : 1}>
                    <title>{`${shaped.label(c)} · ${s.name}: ${fmt(v)}`}</title>
                  </rect>
                );
              })}
              {display.showValues !== false && totals[i] > 0 && cats.length <= 16 && (
                <text x={cx} y={pad.t + plotH - (plotH * totals[i]) / max - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {fmt(totals[i])}
                </text>
              )}
              <text x={cx} y={height - pad.b + 14} textAnchor={cats.length > 8 ? "end" : "middle"} fontSize="10" fill="var(--text)"
                transform={cats.length > 8 ? `rotate(-35 ${cx} ${height - pad.b + 14})` : undefined}>
                {truncate(shaped.label(c), cats.length > 8 ? 16 : 14)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* --------------------------------- line -------------------------------- */

function LineView({ result, grain, fmt, height }: { result: QueryResult; grain?: string; fmt: (n: number) => string; height: number }) {
  const { cats, series, label } = shape(result, grain);
  const w = 600;
  const pad = { l: 44, r: 12, t: 12, b: 32 };
  const plotW = w - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...series.flatMap((s) => [...s.values.values()]), 0));
  const x = (i: number) => pad.l + (cats.length <= 1 ? plotW / 2 : (plotW * i) / (cats.length - 1));
  const y = (v: number) => pad.t + plotH - (plotH * v) / max;
  const every = Math.ceil(cats.length / 8);

  return (
    <div>
      <Legend names={series.map((s) => s.name)} />
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" role="img" aria-label={result.measureLabel}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={w - pad.r} y1={y(f * max)} y2={y(f * max)} stroke="var(--border)" />
            <text x={pad.l - 6} y={y(f * max) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{fmt(f * max)}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const colour = SERIES_COLOURS[si % SERIES_COLOURS.length];
          const pts = cats.map((c, i) => `${x(i)},${y(s.values.get(c) ?? 0)}`).join(" ");
          return (
            <g key={s.name}>
              <polyline points={pts} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" />
              {cats.map((c, i) => (
                <circle key={c} cx={x(i)} cy={y(s.values.get(c) ?? 0)} r="3" fill={colour}>
                  <title>{`${label(c)} · ${s.name}: ${fmt(s.values.get(c) ?? 0)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {cats.map((c, i) => (i % every === 0 || i === cats.length - 1) && (
          <text key={c} x={x(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="var(--text)">{label(c)}</text>
        ))}
      </svg>
    </div>
  );
}

/* ---------------------------------- pie -------------------------------- */

function PieView({ result, fmt, topN }: { result: QueryResult; fmt: (n: number) => string; topN: number }) {
  const slices = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of result.rows) {
      const k = r.keys[0] ?? (r.period ? periodLabel(r.period, "month") : "All");
      m.set(k, (m.get(k) ?? 0) + r.value);
    }
    let arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
    if (arr.length > topN) {
      const rest = arr.slice(topN - 1).reduce((s, [, v]) => s + v, 0);
      arr = [...arr.slice(0, topN - 1), [OTHER, rest]];
    }
    return arr;
  }, [result, topN]);
  const total = slices.reduce((s, [, v]) => s + v, 0) || 1;
  const R = 80, r = 48, c = 100;
  // Start / end angle of each slice, worked out up front.
  const arcs = slices.reduce<{ a0: number; a1: number }[]>((acc, [, v]) => {
    const a0 = acc.length ? acc[acc.length - 1].a1 : -Math.PI / 2;
    return [...acc, { a0, a1: a0 + (2 * Math.PI * v) / total }];
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 200 200" width="180" height="180" role="img" aria-label={result.measureLabel}>
        {slices.map(([name, v], i) => {
          const { a0, a1 } = arcs[i];
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const p = (a: number, rad: number) => `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`;
          const d = slices.length === 1
            ? `M ${c} ${c - R} A ${R} ${R} 0 1 1 ${c - 0.01} ${c - R} L ${c - 0.01} ${c - r} A ${r} ${r} 0 1 0 ${c} ${c - r} Z`
            : `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
          return (
            <path key={name} d={d} fill={SERIES_COLOURS[i % SERIES_COLOURS.length]} stroke="var(--surface)" strokeWidth="1.5">
              <title>{`${name}: ${fmt(v)} (${Math.round((v / total) * 100)}%)`}</title>
            </path>
          );
        })}
        <text x={c} y={c - 2} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">{fmt(total)}</text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize="9" fill="var(--muted)">total</text>
      </svg>
      <ul className="text-sm space-y-1 min-w-40">
        {slices.map(([name, v], i) => (
          <li key={name} className="flex items-center gap-2" data-legend={`${name}: ${fmt(v)} (${Math.round((v / total) * 100)}%)`} data-colour={SERIES_COLOURS[i % SERIES_COLOURS.length]}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }} />
            <span className="text-(--text) truncate">{name}</span>
            <span className="ml-auto pl-3 tabular-nums text-(--muted)">{fmt(v)} · {Math.round((v / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- table ------------------------------- */

function TableView({ result, grain, fmt }: { result: QueryResult; grain?: string; fmt: (n: number) => string }) {
  const hasTime = result.rows.some((r) => r.period);
  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-sm">
        <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
          <tr className="text-left text-xs text-(--muted) border-b border-(--border)">
            {hasTime && <th className="py-2 pr-3 font-medium">Period</th>}
            {result.groupLabels.map((g) => <th key={g} className="py-2 pr-3 font-medium">{g}</th>)}
            <th className="py-2 text-right font-medium">{result.measureLabel}</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={i} className="border-b border-(--border) last:border-0">
              {hasTime && <td className="py-1.5 pr-3 text-(--text)">{r.period ? periodLabel(r.period, grain ?? "month") : "—"}</td>}
              {r.keys.map((k, j) => <td key={j} className="py-1.5 pr-3 text-(--text)">{k}</td>)}
              <td className="py-1.5 text-right tabular-nums text-(--text)">{fmt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated && <p className="text-xs text-(--muted) mt-2">Showing the first {result.rows.length} rows.</p>}
    </div>
  );
}

/* --------------------------------- pivot ------------------------------- */

function PivotView({ result, grain, fmt }: { result: QueryResult; grain?: string; fmt: (n: number) => string }) {
  const hasTime = result.rows.some((r) => r.period);
  const rowOf = (r: QueryRow) => r.keys[0] ?? "All";
  const colOf = (r: QueryRow) => (hasTime ? r.period! : r.keys[1] ?? "All");
  const rows = [...new Set(result.rows.map(rowOf))].sort();
  const cols = [...new Set(result.rows.map(colOf))].sort();
  const cell = new Map<string, number>();
  for (const r of result.rows) cell.set(`${rowOf(r)}\u0000${colOf(r)}`, (cell.get(`${rowOf(r)}\u0000${colOf(r)}`) ?? 0) + r.value);
  const colLabel = (c: string) => (hasTime ? periodLabel(c, grain ?? "month") : c);
  const rowTotal = (row: string) => cols.reduce((s, c) => s + (cell.get(`${row}\u0000${c}`) ?? 0), 0);
  const colTotal = (col: string) => rows.reduce((s, r) => s + (cell.get(`${r}\u0000${col}`) ?? 0), 0);
  const grand = rows.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <div className="overflow-auto max-h-96">
      <table className="text-sm border-collapse min-w-full">
        <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
          <tr className="text-xs text-(--muted)">
            <th className="text-left py-2 pr-3 font-medium border-b border-(--border)">{result.groupLabels[0] ?? ""}</th>
            {cols.map((c) => <th key={c} className="py-2 px-2 text-right font-medium border-b border-(--border)">{colLabel(c)}</th>)}
            <th className="py-2 pl-2 text-right font-semibold border-b border-(--border)">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r} className="border-b border-(--border)">
              <td className="py-1.5 pr-3 text-(--text)">{r}</td>
              {cols.map((c) => {
                const v = cell.get(`${r}\u0000${c}`);
                return <td key={c} className="py-1.5 px-2 text-right tabular-nums" style={{ color: v ? "var(--text)" : "var(--muted)" }}>{v ? fmt(v) : "–"}</td>;
              })}
              <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-(--text)">{fmt(rowTotal(r))}</td>
            </tr>
          ))}
          <tr className="font-semibold" style={{ background: "var(--bg-secondary)" }}>
            <td className="py-1.5 pr-3 text-(--text)">Total</td>
            {cols.map((c) => <td key={c} className="py-1.5 px-2 text-right tabular-nums text-(--text)">{fmt(colTotal(c))}</td>)}
            <td className="py-1.5 pl-2 text-right tabular-nums text-(--text)">{fmt(grand)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------- map -------------------------------- */

/** A grid of tiles shaded by value: Bihar's districts or India's states and
 *  union territories. Schematic: each tile sits roughly where the place is
 *  on the map. Group labels are matched to the standard names here as well,
 *  so an imported sheet that says "Purnea" or "Orissa" still lands on the
 *  right tile. */
function MapView({ result, fmt, area }: { result: QueryResult; fmt: (n: number) => string; area: "bihar" | "india" }) {
  const india = area === "india";
  const tiles = india
    ? INDIA_STATES.map((s) => ({ name: s.name, short: s.code, col: s.col, row: s.row }))
    : BIHAR_DISTRICTS.map((d) => ({ name: d.name, short: truncate(d.name, 12), col: d.col, row: d.row }));
  const known = new Set(tiles.map((t) => t.name));
  const place = (k: string) => {
    if (known.has(k)) return k;
    if (india) return k === STATE_OTHER || k === STATE_UNSPECIFIED ? k : canonicalState(k);
    return isCanonicalDistrict(k) || k === UNSPECIFIED || k === OUTSIDE_BIHAR ? k : canonicalDistrict(k);
  };
  const values = new Map<string, number>();
  for (const r of result.rows) {
    const k = place(r.keys[0] ?? "");
    values.set(k, (values.get(k) ?? 0) + r.value);
  }
  const max = Math.max(...tiles.map((t) => values.get(t.name) ?? 0), 0);
  const extras = [...values.entries()].filter(([k]) => !known.has(k));
  const cw = india ? 64 : 62, ch = 44;
  const cols = india ? INDIA_GRID.cols : 10, rows = india ? INDIA_GRID.rows : 6;

  return (
    <div>
      <svg viewBox={`0 0 ${cols * cw} ${rows * ch + 4}`} width="100%" style={india ? { maxWidth: 620 } : undefined} role="img"
        aria-label={`${result.measureLabel} by ${india ? "state" : "district"}`}>
        {tiles.map((d) => {
          const v = values.get(d.name) ?? 0;
          const t = max > 0 ? v / max : 0;
          return (
            <g key={d.name}>
              <rect x={d.col * cw + 2} y={d.row * ch + 2} width={cw - 4} height={ch - 4} rx="6"
                fill={v > 0 ? "var(--accent)" : "var(--bg-secondary)"} fillOpacity={v > 0 ? 0.15 + 0.85 * t : 1}
                stroke="var(--border)">
                <title>{`${d.name}: ${fmt(v)}`}</title>
              </rect>
              <text x={d.col * cw + cw / 2} y={d.row * ch + 18} textAnchor="middle" fontSize={india ? 10 : 8.5} fontWeight={india ? 600 : 400}
                fill={t > 0.55 ? "var(--accent-contrast)" : "var(--text)"}>{d.short}</text>
              <text x={d.col * cw + cw / 2} y={d.row * ch + 32} textAnchor="middle" fontSize="11" fontWeight="700"
                fill={t > 0.55 ? "var(--accent-contrast)" : "var(--text)"}>{v ? fmt(v) : ""}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-(--muted) mt-1">
        Schematic {india ? "grid of states and union territories" : "district grid"}, north at the top; not to scale.
        {india ? " Hover over a tile for the full name." : ""}
      </p>
      {extras.length > 0 && (
        <p className="text-xs text-(--muted) mt-1">
          {extras.map(([k, v]) => `${k}: ${fmt(v)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
