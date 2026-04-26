"use client";

import { useEffect, useRef, useState } from "react";

export type CaseRef = { _id: string; caseNumber: string; caseTitle: string; status?: string };

interface Props {
  value?: CaseRef | null;
  onChange: (c: CaseRef | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Compact (smaller padding/text) — useful inside table cells. */
  compact?: boolean;
}

/**
 * Typeahead picker for cases. Searches caseNumber + caseTitle via the
 * existing /api/cases?q=… endpoint. Selected case is shown as a chip with a
 * clear button; clearing reverts to the search input.
 */
export default function CaseSearchInput({ value, onChange, placeholder, disabled, compact }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CaseRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) return;
    if (q.length < 1) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/cases?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults((data.cases ?? []).map((c: { _id: string; caseNumber: string; caseTitle: string; status: string }) => ({
          _id: String(c._id), caseNumber: c.caseNumber, caseTitle: c.caseTitle, status: c.status,
        })));
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 200);
  }, [q, value]);

  const pad = compact ? "px-2 py-1" : "px-3 py-2";
  const text = compact ? "text-xs" : "text-sm";

  if (value) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border ${pad} ${text}`}
        style={{ background: "color-mix(in srgb, var(--accent) 7%, transparent)", borderColor: "var(--accent)", color: "var(--text)" }}>
        <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{value.caseNumber}</span>
        <span className="text-(--muted) truncate">— {value.caseTitle}</span>
        {!disabled && (
          <button type="button" onClick={() => { onChange(null); setQ(""); }}
            className="ml-auto text-[11px] px-1.5 py-0.5 rounded shrink-0"
            style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled}
        placeholder={placeholder ?? "Search by case # or title…"}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className={`w-full ${pad} ${text} rounded-lg border focus:outline-none disabled:opacity-50`}
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      {busy && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-(--muted) text-xs">…</span>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border overflow-hidden shadow-lg max-h-60 overflow-y-auto"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {results.map((c) => (
            <li key={c._id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(c); setQ(""); setResults([]); setOpen(false); }}
                className={`w-full text-left ${pad} hover:bg-(--bg-secondary) transition-colors`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                    {c.caseNumber}
                  </span>
                  {c.status && <span className="text-[10px] text-(--muted) uppercase">{c.status}</span>}
                </div>
                <p className={`${text} text-(--text) truncate mt-0.5`}>{c.caseTitle}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
