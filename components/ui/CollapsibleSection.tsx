"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  /** Optional one-line subtitle / count badge — rendered next to the title. */
  badge?: ReactNode;
  /** Optional helper text shown right under the title when expanded. */
  description?: string;
  /** Open or closed by default. */
  defaultOpen?: boolean;
  /** Optional element rendered on the right side of the header (e.g.
   *  inline action button). Stops the click from toggling the section. */
  headerAction?: ReactNode;
  children: ReactNode;
}

/** Card-shaped collapsible section. Used to consolidate the per-case
 *  detail page (documents, court appearances, audit log) into stackable
 *  panels the user can open and close at will. */
export default function CollapsibleSection({
  title,
  badge,
  description,
  defaultOpen = false,
  headerAction,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <header className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer select-none"
        style={{ background: "var(--bg-secondary)", borderBottom: open ? "1px solid var(--border)" : "none" }}
        onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="w-3.5 h-3.5 text-(--muted) shrink-0 transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
            <polyline points="6 4 10 8 6 12" />
          </svg>
          <h3 className="text-sm font-semibold text-(--text)">{title}</h3>
          {badge}
        </div>
        {headerAction && (
          <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>
        )}
      </header>
      {open && (
        <div className="px-5 py-4 space-y-3">
          {description && <p className="text-xs text-(--muted) leading-relaxed">{description}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
