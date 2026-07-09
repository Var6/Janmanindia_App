"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

export interface LitCaseRow {
  id: string;
  caseNumber: string;
  /** Court-assigned case / registration number (the number the COURT gives). */
  courtNumber: string;
  title: string;
  status: string;
  courtLabel: string;
  community: string;
  sw: string;
  place: string;       // where filed (district / court / state)
  hearingISO?: string;
  docs: number;
  diary: number;
}

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  Open:       { background: "var(--info-bg)",      color: "var(--info-text)"    },
  Pending:    { background: "var(--warning-bg)",   color: "var(--warning-text)" },
  Escalated:  { background: "var(--error-bg)",     color: "var(--error-text)"   },
  Disposal:   { background: "var(--success-bg)",   color: "var(--success-text)" },
  Withdrawn:  { background: "var(--bg-secondary)", color: "var(--muted)"        },
  Closed:     { background: "var(--bg-secondary)", color: "var(--muted)"        },
  Dismissed:  { background: "var(--error-bg)",     color: "var(--error-text)"   },
};

type SortKey = "hearing" | "recent" | "number" | "title" | "place";

export default function LitigationCasesList({ rows }: { rows: LitCaseRow[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [place, setPlace] = useState("all");
  const [sort, setSort] = useState<SortKey>("hearing");
  // Seeded once per mount so "days to hearing" is identical between the server
  // render and client hydration (Date.now() in render caused mismatches).
  const [now] = useState(() => Date.now());

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).filter(Boolean).sort(), [rows]);
  const places = useMemo(() => Array.from(new Set(rows.map((r) => r.place).filter((p) => p && p !== "—"))).sort(), [rows]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (place !== "all" && r.place !== place) return false;
      if (needle && !`${r.caseNumber} ${r.courtNumber} ${r.title} ${r.community} ${r.sw} ${r.place} ${r.courtLabel}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return [...out].sort((a, b) => {
      if (sort === "number") return a.caseNumber.localeCompare(b.caseNumber);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "place") return (a.place || "").localeCompare(b.place || "");
      if (sort === "hearing") {
        const av = a.hearingISO ? new Date(a.hearingISO).getTime() : Infinity;
        const bv = b.hearingISO ? new Date(b.hearingISO).getTime() : Infinity;
        return av - bv;
      }
      return 0; // recent — keep server order
    });
  }, [rows, q, status, place, sort]);

  function exportCsv() {
    const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "");
    const headers = ["Court Case No.", "JMI Number", "Title", "Status", "Court", "Place", "Community", "Social Worker", "Next Hearing"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(","),
      ...view.map((c) =>
        [c.courtNumber, c.caseNumber, c.title, c.status, c.courtLabel, c.place, c.community, c.sw, fmt(c.hearingISO)]
          .map((v) => esc(String(v ?? ""))).join(",")
      ),
    ];
    // BOM so Excel reads UTF-8 (Hindi/Devanagari) correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `janman-cases-${view.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as React.CSSProperties;
  const selectCls = "px-2.5 py-2 rounded-lg border text-xs focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search cases…")}
          className="flex-1 min-w-44 px-3 py-2 rounded-lg border text-sm focus:outline-none" style={selectStyle} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} style={selectStyle} title={t("Status")}>
          <option value="all">{t("All statuses")}</option>
          {statuses.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select value={place} onChange={(e) => setPlace(e.target.value)} className={selectCls} style={selectStyle} title={t("Place filed")}>
          <option value="all">{t("All places")}</option>
          {places.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectCls} style={selectStyle} title={t("Sort by")}>
          <option value="hearing">{t("Next hearing")}</option>
          <option value="recent">{t("Recent")}</option>
          <option value="number">{t("Case number")}</option>
          <option value="title">{t("Title")}</option>
          <option value="place">{t("Place filed")}</option>
        </select>
        <button type="button" onClick={exportCsv} disabled={view.length === 0}
          className="px-3 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 hover:border-(--accent)"
          style={selectStyle} title={t("Export to Excel")}>
          ⬇ {t("Excel")}
        </button>
      </div>
      <p className="text-xs text-(--muted)">{t("Showing")} {view.length} {t("of")} {rows.length}</p>

      {view.length === 0 ? (
        <div className="py-12 text-center bg-(--surface) rounded-2xl border border-(--border)">
          <p className="text-sm text-(--muted)">{t("No cases match these filters.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {view.map((c) => {
            const hearingDate = c.hearingISO ? new Date(c.hearingISO) : null;
            const daysToHearing = hearingDate ? Math.ceil((hearingDate.getTime() - now) / 86400000) : null;
            return (
              <Link key={c.id} href={`/litigation/cases/${c.id}`}
                className="block bg-(--surface) rounded-2xl border border-(--border) p-5 card-lift"
                style={{ borderLeftWidth: 5, borderLeftColor: STATUS_STYLE[c.status]?.color ?? "var(--muted)" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-(--text) truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Court-assigned number is primary; JMI tracker shown muted. */}
                      {(c.courtNumber || c.caseNumber) && (
                        <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                          title={c.courtNumber ? t("Court case number") : undefined}
                          style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)" }}>
                          {c.courtNumber || c.caseNumber}
                        </span>
                      )}
                      {c.courtNumber && c.caseNumber && (
                        <span className="text-[12px] font-mono px-1.5 py-0.5 rounded" title="Janman tracker no."
                          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                          {c.caseNumber}
                        </span>
                      )}
                      <span className="text-xs text-(--muted)">{c.courtLabel}</span>
                      {c.place && c.place !== "—" && <span className="text-[12px] text-(--muted)">📍 {c.place}</span>}
                    </div>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {t("Victim/Client")}: {c.community || "—"} · {t("SW")}: {c.sw || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={STATUS_STYLE[c.status] ?? { background: "var(--bg-secondary)", color: "var(--muted)" }}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {hearingDate ? (
                    <span className="font-medium"
                      style={{ color: daysToHearing !== null && daysToHearing <= 3 ? "var(--error-text)" : "var(--muted)" }}>
                      {t("Next hearing")}: {hearingDate.toLocaleDateString("en-IN")}
                      {daysToHearing !== null && daysToHearing >= 0 && ` (${daysToHearing}d)`}
                    </span>
                  ) : (
                    <span className="text-(--muted)">{t("No hearing date set")}</span>
                  )}
                  <span className="text-(--muted)">{c.docs} {t("doc(s)")}</span>
                  <span className="text-(--muted)">{c.diary} {t("diary entries")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
