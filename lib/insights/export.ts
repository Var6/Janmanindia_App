"use client";

import type { QueryResult } from "@/lib/insights/types";

/** Browser-side export of a chart: CSV of its figures, a PNG of the drawn
 *  chart, or a print of the one tile (Save as PDF in the print dialog). */

export function toCsv(res: QueryResult): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Leading = + - @ would run as a formula in Excel.
    const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const hasPeriod = res.rows.some((r) => r.period);
  const head = [...res.groupLabels, ...(hasPeriod ? ["Period"] : []), res.measureLabel];
  const lines = res.rows.map((r) => [...r.keys, ...(hasPeriod ? [r.period?.slice(0, 10) ?? ""] : []), r.value].map(esc).join(","));
  return "﻿" + [head.map(esc).join(","), ...lines].join("\n");
}

export function fileName(title: string, ext: string): string {
  const base = title.trim().replace(/[^a-z0-9ऀ-ॿ]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "chart";
  return `${base}.${ext}`;
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadCsv(res: QueryResult, title: string) {
  downloadBlob(new Blob([toCsv(res)], { type: "text/csv;charset=utf-8" }), fileName(title, "csv"));
}

const STYLE_PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline"];

/** Copy the computed styles onto a clone so CSS variables (theme colours)
 *  survive outside the page. */
function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
  dst.setAttribute("style", style);
  for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
}

function backgroundOf(el: HTMLElement): string {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return "#ffffff";
}

export function canPng(el: HTMLElement | null): boolean {
  return !!el?.querySelector("svg");
}

/** Draw the chart's SVG, a title and its legend onto a canvas at 2x. */
export async function downloadPng(el: HTMLElement, title: string, subtitle?: string) {
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("This chart type has no picture to save; use CSV or PDF.");
  const rect = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.round(rect.width)));
  clone.setAttribute("height", String(Math.round(rect.height)));
  clone.querySelectorAll("title").forEach((t) => t.remove());
  const src = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([src], { type: "image/svg+xml;charset=utf-8" }));

  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Could not draw the chart")); img.src = url; });

  const legend = [...el.querySelectorAll<HTMLElement>("[data-legend]")].map((n) => ({ text: n.dataset.legend ?? "", colour: n.dataset.colour ?? "#999" }));
  const cs = getComputedStyle(el);
  const textColour = cs.color || "#1c1917";
  const font = cs.fontFamily || "Arial, sans-serif";
  const pad = 24, titleH = subtitle ? 52 : 34, legendRow = 20;
  const W = Math.max(Math.round(rect.width), 320) + pad * 2;
  const legendCols = Math.max(1, Math.floor((W - pad * 2) / 220));
  const legendH = legend.length ? Math.ceil(legend.length / legendCols) * legendRow + 8 : 0;
  const H = Math.round(rect.height) + titleH + legendH + pad * 2;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = backgroundOf(el);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = textColour;
  ctx.font = `600 16px ${font}`;
  ctx.fillText(title, pad, pad + 14);
  if (subtitle) { ctx.globalAlpha = 0.7; ctx.font = `12px ${font}`; ctx.fillText(subtitle, pad, pad + 34); ctx.globalAlpha = 1; }
  ctx.drawImage(img, pad, pad + titleH, rect.width, rect.height);
  ctx.font = `12px ${font}`;
  legend.forEach((l, i) => {
    const x = pad + (i % legendCols) * 220, y = pad + titleH + rect.height + 8 + Math.floor(i / legendCols) * legendRow;
    ctx.fillStyle = l.colour; ctx.fillRect(x, y + 2, 10, 10);
    ctx.fillStyle = textColour; ctx.fillText(l.text.length > 34 ? `${l.text.slice(0, 33)}…` : l.text, x + 16, y + 11);
  });
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not save the picture");
  downloadBlob(blob, fileName(title, "png"));
}

/** Print only this element; the browser's print dialog saves it as a PDF. */
export function printOnly(el: HTMLElement) {
  el.classList.add("insights-print-solo");
  document.body.classList.add("insights-printing-solo");
  const done = () => {
    el.classList.remove("insights-print-solo");
    document.body.classList.remove("insights-printing-solo");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
