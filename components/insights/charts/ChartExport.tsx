"use client";

import { useEffect, useRef, useState } from "react";
import type { QueryResult } from "@/lib/insights/types";
import { canPng, downloadCsv, downloadPng, printOnly } from "@/lib/insights/export";
import { useNotify } from "@/components/insights/useNotify";

/** "Export" menu on a chart: PNG picture, CSV of the figures, or PDF (prints
 *  just this chart). `target` returns the element that holds the chart. */
export default function ChartExport({ title, subtitle, result, target }: {
  title: string; subtitle?: string; result: QueryResult; target: () => HTMLElement | null;
}) {
  const toast = useNotify();
  const [open, setOpen] = useState(false);
  const [pngOk, setPngOk] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function png() {
    setOpen(false);
    const el = target();
    if (!el) return;
    try { await downloadPng(el, title, subtitle); } catch (e) { toast.error((e as Error).message); }
  }
  function pdf() {
    setOpen(false);
    const el = target();
    if (el) printOnly(el);
  }

  const item = "block w-full text-left px-3 py-1.5 text-xs text-(--text) hover:bg-(--bg) disabled:opacity-40";
  return (
    <div ref={ref} className="relative print:hidden">
      <button className="text-[11px] text-(--muted) hover:text-(--accent)" aria-haspopup="menu" aria-expanded={open}
        onClick={() => { setPngOk(canPng(target())); setOpen((o) => !o); }}>
        Export
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-(--border) py-1 shadow-lg" style={{ background: "var(--surface)" }}>
          <button role="menuitem" className={item} disabled={!pngOk} onClick={png} title={pngOk ? "" : "Tables and numbers have no picture; use CSV or PDF"}>Picture (PNG)</button>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); downloadCsv(result, title); }}>Figures (CSV)</button>
          <button role="menuitem" className={item} onClick={pdf}>PDF (print this chart)</button>
        </div>
      )}
    </div>
  );
}
