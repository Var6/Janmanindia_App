"use client";

import { useState, useMemo } from "react";
import type { Policy } from "@/lib/policies";

interface Props {
  policies: Policy[];
  /** Map policy slug → public PDF download path. */
  downloads: Record<string, string>;
}

export default function PolicyViewer({ policies, downloads }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>(policies[0]?.slug ?? "");
  const [query, setQuery] = useState("");

  const active = useMemo(() => policies.find((p) => p.slug === activeSlug), [policies, activeSlug]);
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    if (!active) return [];
    if (!q) return active.sections;
    return active.sections.filter((s) =>
      s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
    );
  }, [active, q]);

  if (!active) return null;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="glass rounded-2xl p-1.5 inline-flex flex-wrap gap-1">
        {policies.map((p) => {
          const isActive = p.slug === activeSlug;
          return (
            <button key={p.slug} onClick={() => { setActiveSlug(p.slug); setQuery(""); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "var(--accent-contrast)" : "var(--muted)",
              }}>
              {p.shortTitle}
            </button>
          );
        })}
      </div>

      {/* Header card */}
      <div className="glass rounded-2xl p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
              Janman People&apos;s Foundation
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-(--text) tracking-tight">{active.title}</h2>
            <p className="text-xs text-(--muted) mt-1.5 font-mono">{active.refNo} · {active.date}</p>
          </div>
          {downloads[active.slug] && (
            <a href={downloads[active.slug]} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-(--border) text-(--text) hover:border-(--accent) transition-colors">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/>
              </svg>
              Download PDF
            </a>
          )}
        </div>
        {active.intro && (
          <p className="text-sm text-(--muted) mt-4 leading-relaxed max-w-3xl">{active.intro}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search the ${active.title.toLowerCase()}…`}
          className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl glass focus:outline-none focus:border-(--accent)" />
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-(--muted) pointer-events-none">
          <circle cx="9" cy="9" r="5.5"/><line x1="13.5" y1="13.5" x2="18" y2="18"/>
        </svg>
      </div>

      {/* Section grid + reading column */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Section index */}
        <nav className="glass rounded-2xl p-2 h-fit lg:sticky lg:top-20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--muted) px-3 py-2">On this page</p>
          <ul className="space-y-0.5">
            {active.sections.map((s, i) => {
              const id = `sec-${i}`;
              return (
                <li key={id}>
                  <a href={`#${id}`}
                    className="block px-3 py-1.5 text-xs rounded-lg text-(--muted) hover:text-(--text) hover:bg-(--accent-subtle) transition-colors line-clamp-2">
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Reading column */}
        <article className="space-y-4">
          {sections.length === 0 ? (
            <div className="glass rounded-2xl px-6 py-10 text-center text-sm text-(--muted)">
              Nothing matches “{query}”.
            </div>
          ) : sections.map((s, i) => {
            const id = `sec-${active.sections.indexOf(s)}`;
            return (
              <section key={id} id={id} className="glass rounded-2xl p-5 sm:p-6 scroll-mt-20">
                <h3 className="text-base font-bold text-(--text) mb-2 tracking-tight">
                  {highlight(s.title, q)}
                </h3>
                {s.body.split("\n\n").map((para, j) => (
                  <p key={j} className="text-sm text-(--text)/85 leading-relaxed mt-2 first:mt-0 whitespace-pre-line">
                    {highlight(para, q)}
                  </p>
                ))}
              </section>
            );
          })}
        </article>
      </div>
    </div>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--text)", padding: "0 2px", borderRadius: "3px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
