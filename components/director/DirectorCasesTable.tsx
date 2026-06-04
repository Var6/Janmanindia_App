"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

export interface CaseRow {
  id: string;
  caseNumber: string;
  /** Court-assigned case / registration number (e.g. "GR 967/26"). The number
   *  the COURT gives — distinct from our internal JMI tracker number. */
  courtNumber: string;
  title: string;
  currentStep?: string;
  path: "criminal" | "highcourt";
  status: string;
  district: string;   // "where the case was filed"
  court: string;
  community: string;
  lawyer: string;
  isExisting: boolean;
  /** Most recent past hearing (ISO) and the upcoming hearing (ISO). */
  lastHearingISO?: string;
  nextHearingISO?: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "var(--info-bg)",      text: "var(--info-text)"    },
  Pending:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  Escalated: { bg: "var(--error-bg)",     text: "var(--error-text)"   },
  Disposal:  { bg: "var(--success-bg)",   text: "var(--success-text)" },
  Withdrawn: { bg: "var(--bg-secondary)", text: "var(--muted)"        },
  Closed:    { bg: "var(--bg-secondary)", text: "var(--muted)"        },
  Dismissed: { bg: "var(--error-bg)",     text: "var(--error-text)"   },
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

type SortKey = "recent" | "number" | "title" | "place" | "lawyer" | "hearing";

export default function DirectorCasesTable({ cases }: { cases: CaseRow[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [place, setPlace] = useState("all");
  const [lawyer, setLawyer] = useState("all");
  const [sort, setSort] = useState<SortKey>("lawyer");

  // Distinct values present in the data (for the dropdowns).
  const statuses = useMemo(
    () => Array.from(new Set(cases.map((c) => c.status))).filter(Boolean).sort(),
    [cases]
  );
  const places = useMemo(
    () => Array.from(new Set(cases.map((c) => c.district).filter((d) => d && d !== "—"))).sort(),
    [cases]
  );
  const lawyers = useMemo(
    () => Array.from(new Set(cases.map((c) => c.lawyer).filter(Boolean))).sort(),
    [cases]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = cases.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (place !== "all" && c.district !== place) return false;
      if (lawyer !== "all" && c.lawyer !== lawyer) return false;
      if (needle) {
        const hay = `${c.caseNumber} ${c.courtNumber} ${c.title} ${c.community} ${c.lawyer} ${c.court} ${c.district}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "number") return a.caseNumber.localeCompare(b.caseNumber);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "place") return (a.district || "").localeCompare(b.district || "");
      if (sort === "lawyer") return (a.lawyer || "~").localeCompare(b.lawyer || "~"); // unassigned last
      if (sort === "hearing") {
        const av = a.nextHearingISO ? new Date(a.nextHearingISO).getTime() : Infinity;
        const bv = b.nextHearingISO ? new Date(b.nextHearingISO).getTime() : Infinity;
        return av - bv;
      }
      return 0; // "recent" — keep the server's updatedAt order
    });
    return rows;
  }, [cases, q, status, place, lawyer, sort]);

  // ── Exports ─────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = ["JMI Number", "Court Case No.", "Title", "Type", "Status", "Place (District)", "Court", "Lawyer", "Community", "Last Hearing", "Next Hearing"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(","),
      ...filtered.map((c) =>
        [c.caseNumber, c.courtNumber, c.title, c.path === "criminal" ? "Criminal" : "High Court", c.status, c.district, c.court, c.lawyer, c.community, fmtDate(c.lastHearingISO), fmtDate(c.nextHearingISO)]
          .map((v) => esc(String(v ?? ""))).join(",")
      ),
    ];
    // BOM so Excel reads UTF-8 (Hindi/Devanagari) correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `janman-cases-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    const esc = (v: string) => String(v ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]!));
    const byStatus = filtered.reduce<Record<string, number>>((acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; }, {});
    const summary = Object.entries(byStatus).map(([s, n]) => `${esc(s)}: ${n}`).join(" &nbsp;·&nbsp; ");
    const rows = filtered.map((c) => `
      <tr>
        <td style="font-family:monospace">${esc(c.caseNumber)}</td>
        <td style="font-family:monospace">${esc(c.courtNumber || "—")}</td>
        <td>${esc(c.title)}</td>
        <td>${c.path === "criminal" ? "Criminal" : "High Court"}</td>
        <td>${esc(c.status)}</td>
        <td>${esc(c.district)}</td>
        <td>${esc(c.lawyer)}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Janman — Cases</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;margin:32px;color:#111}
        h1{font-size:18px;margin:0 0 2px} .sub{color:#555;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f3f4f6;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
        tr:nth-child(even) td{background:#fafafa}
      </style></head><body>
      <h1>Janman Legal Aid — Cases</h1>
      <p class="sub">${filtered.length} case(s) &nbsp;·&nbsp; ${summary} &nbsp;·&nbsp; Generated ${new Date().toLocaleString("en-IN")}</p>
      <table><thead><tr><th>JMI No.</th><th>Court Case No.</th><th>Title</th><th>Type</th><th>Status</th><th>Place</th><th>Lawyer</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  const selectCls = "px-2.5 py-2 rounded-lg border text-xs focus:outline-none";
  const selectStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" } as React.CSSProperties;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search cases…")}
          className="flex-1 min-w-44 px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={selectStyle} />

        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} style={selectStyle} title={t("Status")}>
          <option value="all">{t("All statuses")}</option>
          {statuses.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>

        <select value={lawyer} onChange={(e) => setLawyer(e.target.value)} className={selectCls} style={selectStyle} title={t("Litigation Member")}>
          <option value="all">{t("All lawyers")}</option>
          {lawyers.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <select value={place} onChange={(e) => setPlace(e.target.value)} className={selectCls} style={selectStyle} title={t("Place filed")}>
          <option value="all">{t("All places")}</option>
          {places.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectCls} style={selectStyle} title={t("Sort by")}>
          <option value="lawyer">{t("Litigation Member")}</option>
          <option value="recent">{t("Recent")}</option>
          <option value="hearing">{t("Next hearing")}</option>
          <option value="number">{t("Case number")}</option>
          <option value="title">{t("Title")}</option>
          <option value="place">{t("Place filed")}</option>
        </select>

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={exportCsv}
            className="px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-(--bg-secondary)"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            ⬇ {t("Excel")}
          </button>
          <button type="button" onClick={exportPdf}
            className="px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-(--bg-secondary)"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            ⬇ {t("PDF")}
          </button>
        </div>
      </div>

      <p className="text-xs text-(--muted)">{t("Showing")} {filtered.length} {t("of")} {cases.length}</p>

      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-sm text-(--muted)">{t("No cases match these filters.")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b text-xs font-semibold text-(--muted) uppercase tracking-wide"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <span>{t("Case")}</span>
            <span className="px-3 text-center">{t("Type")}</span>
            <span className="px-3 text-center">{t("Lawyer")}</span>
            <span className="px-3 text-center">{t("Status")}</span>
            <span className="px-3 text-center">{t("Actions")}</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((c) => {
              const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
              return (
                <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-3 transition-colors hover:bg-(--bg)">
                  <Link href={`/director/cases/${c.id}`} className="min-w-0 group">
                    {/* Title first, then the case number BELOW it. */}
                    <p className="text-sm font-semibold text-(--text) truncate group-hover:text-(--accent) transition-colors">
                      {c.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Court-assigned number is the primary identifier; the
                          internal JMI tracker number is shown muted alongside. */}
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                        title={c.courtNumber ? t("Court case number") : undefined}
                        style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)" }}>
                        {(c.courtNumber || c.caseNumber || "—")}
                      </span>
                      {c.courtNumber && c.caseNumber && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                          title="Janman tracker no."
                          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                          {c.caseNumber}
                        </span>
                      )}
                      {c.isExisting && (
                        <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                          {t("Existing")}
                        </span>
                      )}
                      {c.district && c.district !== "—" && (
                        <span className="text-[11px] text-(--muted)">📍 {c.district}</span>
                      )}
                    </div>
                    {/* Hearing dates — just below the location. */}
                    {(c.lastHearingISO || c.nextHearingISO) && (
                      <p className="text-[11px] text-(--muted) mt-0.5 flex flex-wrap gap-x-3">
                        {c.lastHearingISO && <span>{t("Last hearing")}: {fmtDate(c.lastHearingISO)}</span>}
                        {c.nextHearingISO && <span className="font-medium" style={{ color: "var(--accent)" }}>{t("Next hearing")}: {fmtDate(c.nextHearingISO)}</span>}
                      </p>
                    )}
                    {c.currentStep && <p className="text-[11px] text-(--muted) italic mt-0.5 line-clamp-1">{c.currentStep}</p>}
                    <p className="text-xs text-(--muted) mt-0.5">{c.community || "—"}</p>
                  </Link>

                  <span className="px-3 text-xs text-(--muted)">{c.path === "criminal" ? t("Criminal") : t("HC")}</span>
                  <span className="px-3 text-xs text-(--text)">{c.lawyer || <span className="text-(--muted) italic">{t("Unassigned")}</span>}</span>
                  <span className="mx-3 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>{c.status}</span>

                  <div className="flex items-center gap-1 pl-3">
                    <Link href={`/director/cases/${c.id}`} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 8%,transparent)" }}>{t("View")}</Link>
                    <Link href={`/director/assign?caseId=${c.id}`} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ color: "var(--muted)", background: "var(--bg-secondary)" }}>{t("Reassign")}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
