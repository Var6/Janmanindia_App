"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import MonthlyReportForm, { type MonthlyReportData } from "./MonthlyReportForm";
import { templateForRole, templateByType } from "@/lib/monthly-report-templates";

type ReportRow = {
  _id: string;
  type: "lawyer" | "socialworker";
  month: string;
  submissionDate?: string;
  submitterName?: string;
  submittedBy?: { name?: string; email?: string; role?: string } | null;
  header?: Record<string, string>;
  sections?: Record<string, unknown>;
};
type CurrentUser = { id: string; name: string; role: string };

let LOGO_CACHE: string | null = null;
async function getLogoDataUri(): Promise<string> {
  if (LOGO_CACHE !== null) return LOGO_CACHE;
  try {
    const r = await fetch("/logo.png");
    const b = await r.blob();
    LOGO_CACHE = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res("");
      fr.readAsDataURL(b);
    });
  } catch { LOGO_CACHE = ""; }
  return LOGO_CACHE;
}

function monthLabel(m: string) {
  const [y, mo] = (m || "").split("-").map(Number);
  return Number.isFinite(y) && Number.isFinite(mo)
    ? new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : m;
}

export default function MonthlyReportsClient({ currentUser }: { currentUser: CurrentUser }) {
  const t = useT();
  const fillTemplate = templateForRole(currentUser.role);
  const canFill = Boolean(fillTemplate);
  const canView = ["director", "superadmin", "hr", "administrator"].includes(currentUser.role);

  type Tab = "fill" | "mine" | "all";
  const [tab, setTab] = useState<Tab>(canFill ? "fill" : "all");
  const [editing, setEditing] = useState<MonthlyReportData | null>(null);
  const [mine, setMine] = useState<ReportRow[]>([]);
  const [all, setAll] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // filters for the "all" view
  const [fType, setFType] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [q, setQ] = useState("");

  const loadMine = useCallback(async () => {
    const res = await fetch("/api/monthly-reports?mine=true");
    const d = await res.json();
    setMine(res.ok ? (d.reports ?? []) : []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fType) qs.set("type", fType);
      if (fMonth) qs.set("month", fMonth);
      const res = await fetch(`/api/monthly-reports?${qs.toString()}`);
      const d = await res.json();
      setAll(res.ok ? (d.reports ?? []) : []);
    } finally { setLoading(false); }
  }, [fType, fMonth]);

  useEffect(() => { if (canFill) loadMine(); }, [canFill, loadMine]);
  useEffect(() => { if (tab === "all" && canView) loadAll(); }, [tab, canView, loadAll]);

  async function download(r: ReportRow) {
    const tmpl = templateByType(r.type);
    if (!tmpl) return;
    setDownloading(r._id);
    try {
      const logo = await getLogoDataUri();
      const [{ pdf }, { default: Doc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./MonthlyReportPdfDocument"),
      ]);
      const blob = await pdf(<Doc report={r} template={tmpl} logoDataUri={logo} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const who = (r.submitterName || r.submittedBy?.name || "report").replace(/[^a-z0-9]+/gi, "_");
      a.href = url;
      a.download = `Monthly_${r.type}_${who}_${r.month}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setDownloading(null); }
  }

  function editReport(r: ReportRow) {
    setEditing({ id: r._id, month: r.month, submissionDate: r.submissionDate, header: r.header ?? {}, sections: r.sections ?? {} });
    setTab("fill");
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "fill", label: editing ? "Edit Report" : "New Report", show: canFill },
    { key: "mine", label: "My Reports", show: canFill },
    { key: "all", label: "All Reports", show: canView },
  ];

  const filteredAll = all.filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.submitterName ?? ""} ${r.submittedBy?.name ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  function DownloadBtn({ r }: { r: ReportRow }) {
    return (
      <button onClick={() => download(r)} disabled={downloading === r._id}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {downloading === r._id ? t("Preparing…") : `⬇ ${t("PDF")}`}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Monthly Report")}</h1>
        <p className="text-sm text-(--muted)">
          {canFill ? t("File your monthly programme report and download it as a PDF.") : t("Monthly reports filed by lawyers and social workers.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.filter((x) => x.show).map((x) => (
          <button key={x.key} onClick={() => { if (x.key === "fill" && tab !== "fill") { /* keep editing */ } setTab(x.key); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={tab === x.key
              ? { background: "var(--accent)", color: "var(--accent-contrast)" }
              : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
            {t(x.label)}
          </button>
        ))}
        {canFill && editing && (
          <button onClick={() => { setEditing(null); setTab("fill"); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            + {t("Start blank")}
          </button>
        )}
      </div>

      {tab === "fill" && canFill && fillTemplate && (
        <MonthlyReportForm
          key={editing?.id ?? "new"}
          template={fillTemplate}
          currentUserName={currentUser.name}
          initial={editing}
          onSaved={() => { loadMine(); setEditing(null); setTab("mine"); }}
        />
      )}

      {tab === "mine" && canFill && (
        mine.length === 0 ? (
          <p className="text-sm text-(--muted) rounded-xl border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {t("You haven't filed any monthly reports yet.")}
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold text-(--text)">{monthLabel(r.month)}</p>
                  <p className="text-xs text-(--muted)">{r.type === "lawyer" ? t("District Legal Fellowship") : t("Access to Justice")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => editReport(r)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>{t("Edit")}</button>
                  <DownloadBtn r={r} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "all" && canView && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <select value={fType} onChange={(e) => setFType(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
              <option value="">{t("All types")}</option>
              <option value="lawyer">{t("Lawyers")}</option>
              <option value="socialworker">{t("Social Workers")}</option>
            </select>
            <input type="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by name…")} className="flex-1 min-w-40 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>

          {loading ? (
            <p className="text-sm text-(--muted)">{t("Loading…")}</p>
          ) : filteredAll.length === 0 ? (
            <p className="text-sm text-(--muted) rounded-xl border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{t("No reports found.")}</p>
          ) : (
            <div className="space-y-2">
              {filteredAll.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm font-semibold text-(--text)">{r.submitterName || r.submittedBy?.name || "—"}</p>
                    <p className="text-xs text-(--muted)">
                      {r.type === "lawyer" ? t("Lawyer") : t("Social Worker")} · {monthLabel(r.month)}
                    </p>
                  </div>
                  <DownloadBtn r={r} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
