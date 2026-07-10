"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RichTextEditor from "./RichTextEditor";
import { roleColor } from "@/lib/role-colors";
import { useT } from "@/components/i18n/LanguageProvider";

interface ReportComment {
  _id: string;
  text: string;
  byName?: string;
  byRole?: string;
  visibility: "public" | "directors";
  createdAt: string;
}
interface Report {
  _id: string;
  dateKey: string;
  html: string;
  createdAt: string;
  comments: ReportComment[];
}

function fmtDay(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * The staff member's own daily-report space: a submit card for today (rich
 * text, immutable once filed) and their past submissions, read-only, with any
 * public reviewer comments underneath. Nobody else's reports appear here.
 */
export default function DailyReportComposer({ isViewer }: { isViewer: boolean }) {
  const t = useT();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [submittedToday, setSubmittedToday] = useState(false);
  const [today, setToday] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/staff-reports?mine=1")
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d) => {
        setReports(d.reports ?? []);
        setSubmittedToday(Boolean(d.submittedToday));
        setToday(d.today ?? "");
      })
      .catch(() => setReports([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/staff-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? t("Could not submit the report.")); return; }
      setHtml("");
      load();
    } catch {
      setError(t("Network error — please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(reportId: string) {
    const text = (reply[reportId] ?? "").trim();
    if (!text) return;
    setReply((p) => ({ ...p, [reportId]: "" }));
    await fetch(`/api/staff-reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, visibility: "public" }),
    }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-6">
      {/* Status hero */}
      <div className="page-hero px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: submittedToday ? "var(--success-bg)" : "var(--warning-bg)",
              border: `1px solid color-mix(in srgb, ${submittedToday ? "var(--success)" : "var(--warning)"} 30%, transparent)`,
            }}>
            {submittedToday ? "✅" : "📝"}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-(--text) leading-tight">{t("Daily Report")}</h1>
            <p className="text-sm mt-0.5 font-medium"
              style={{ color: submittedToday ? "var(--success-text)" : "var(--warning-text)" }}>
              {submittedToday
                ? t("Today's report is in — see you tomorrow!")
                : t("Today's report is due — submit before 6pm to skip the reminder.")}
            </p>
          </div>
        </div>
        {isViewer && (
          <Link href="/reports/daily/review"
            className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            📊 {t("Review everyone's reports")}
          </Link>
        )}
      </div>

      {/* Compose — hidden once today's report is filed (immutable). */}
      {!submittedToday && reports !== null && (
        <div className="space-y-3">
          <RichTextEditor onChange={setHtml} />
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {error}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-(--muted)">
              🔒 {t("Once submitted, a report can't be edited — it becomes part of the record.")}
            </p>
            <button type="button" onClick={submit} disabled={saving}
              className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-60">
              {saving ? t("Submitting…") : t("Submit today's report")}
            </button>
          </div>
        </div>
      )}

      {/* History — read-only */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-(--muted)">{t("My previous reports")}</h2>
        {reports === null ? (
          <div className="skeleton h-32 rounded-2xl" />
        ) : reports.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">🗒️</p>
            <p className="text-sm text-(--muted)">{t("No reports yet — today's will be your first.")}</p>
          </div>
        ) : (
          reports.map((r) => (
            <article key={r._id} className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-xs)" }}>
              <header className="px-5 py-2.5 border-b flex items-center justify-between gap-2"
                style={{ borderColor: "var(--border)", background: r.dateKey === today ? "color-mix(in srgb, var(--success) 8%, var(--bg-secondary))" : "var(--bg-secondary)" }}>
                <p className="text-sm font-bold text-(--text)">
                  {fmtDay(r.dateKey)}
                  {r.dateKey === today && <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>{t("Today")}</span>}
                </p>
                <span className="text-[11px] text-(--muted)">🔒 {t("read-only")}</span>
              </header>
              <div className="rt-content px-5 py-4 text-sm" dangerouslySetInnerHTML={{ __html: r.html }} />

              {/* Public feedback thread + reply box */}
              <div className="px-5 pb-4 space-y-1.5">
                  {r.comments.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "var(--border)" }}>
                      {r.comments.map((c) => {
                        const rc = roleColor(c.byRole);
                        return (
                          <p key={c._id} className="text-[13px] leading-snug">
                            <span className="font-semibold" style={{ color: rc.text }}>{c.byName}</span>
                            {c.byRole && <span className="text-(--muted)"> · {rc.label}</span>}
                            <span className="text-(--muted)">: </span>
                            <span className="text-(--text)">{c.text}</span>
                          </p>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <input value={reply[r._id] ?? ""} onChange={(e) => setReply((p) => ({ ...p, [r._id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(r._id); } }}
                      placeholder={t("Reply to feedback…")}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border bg-(--bg) focus:outline-none focus:border-(--accent)"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                    <button type="button" onClick={() => sendReply(r._id)} disabled={!(reply[r._id] ?? "").trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                      {t("Send")}
                    </button>
                  </div>
                </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
