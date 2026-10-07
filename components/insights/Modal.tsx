"use client";

import { useEffect } from "react";

/** Centred dialog used across Insights; Escape or a click outside closes it. */
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-2xl border border-(--border) p-5 my-8`} style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-(--text)">{title}</h2>
          <button className="text-(--muted) hover:text-(--text) text-xl leading-none" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
