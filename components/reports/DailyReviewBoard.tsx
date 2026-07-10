"use client";

import { useCallback, useEffect, useState } from "react";
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
  author: string;
  authorName?: string;
  authorRole?: string;
  dateKey: string;
  html: string;
  createdAt: string;
  comments: ReportComment[];
}
interface MissingStaff { _id: string; name: string; role: string }

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

function fmtDay(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Director-and-above review board. Left rail: a month calendar grid — each
 * date shows how many reports came in; click a date to open it. Right: every
 * submission for that day (rendered rich text), who's missing, and a comment
 * box with two audiences — "everyone" (the author sees it) or "directors
 * only" (private to the reviewer group).
 */
export default function DailyReviewBoard() {
  const t = useT();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [days, setDays] = useState<Record<string, number>>({});
  const [today, setToday] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [missing, setMissing] = useState<MissingStaff[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState<Record<string, "public" | "directors">>({});

  const monthKey = `${year}-${pad(month + 1)}`;

  // Calendar dots for the visible month.
  useEffect(() => {
    fetch(`/api/staff-reports?month=${monthKey}`)
      .then((r) => (r.ok ? r.json() : { days: {} }))
      .then((d) => {
        setDays(d.days ?? {});
        if (d.today) {
          setToday(d.today);
          setSelected((prev) => prev || d.today);
        }
      })
      .catch(() => {});
  }, [monthKey]);

  const loadDay = useCallback((dateKey: string) => {
    fetch(`/api/staff-reports?date=${dateKey}`)
      .then((r) => (r.ok ? r.json() : { reports: [], missing: [] }))
      .then((d) => { setReports(d.reports ?? []); setMissing(d.missing ?? []); })
      .catch(() => { setReports([]); setMissing([]); });
  }, []);

  useEffect(() => { if (selected) loadDay(selected); }, [selected, loadDay]);

  async function comment(reportId: string) {
    const text = (draft[reportId] ?? "").trim();
    if (!text) return;
    const visibility = audience[reportId] ?? "public";
    setDraft((p) => ({ ...p, [reportId]: "" }));
    await fetch(`/api/staff-reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, visibility }),
    }).catch(() => {});
    loadDay(selected);
  }

  // Build the calendar grid (Monday-first).
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`),
  ];

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">

      {/* ── Calendar rail ─────────────────────────────────────────────── */}
      <aside className="rounded-2xl border overflow-hidden lg:sticky lg:top-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface))" }}>
          <button type="button" onClick={() => shiftMonth(-1)} data-tip={t("Previous month")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--muted) hover:text-(--text) hover:bg-(--bg-secondary)">‹</button>
          <p className="text-sm font-bold text-(--text)">{t(MONTH_NAMES[month])} {year}</p>
          <button type="button" onClick={() => shiftMonth(1)} data-tip={t("Next month")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--muted) hover:text-(--text) hover:bg-(--bg-secondary)">›</button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d) => (
              <p key={d} className="text-center text-[11px] font-bold uppercase text-(--muted)">{t(d)}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((key, i) => {
              if (!key) return <span key={`x${i}`} />;
              const count = days[key] ?? 0;
              const isSel = key === selected;
              const isToday = key === today;
              const isFuture = today && key > today;
              return (
                <button key={key} type="button" disabled={!!isFuture}
                  onClick={() => { setReports(null); setSelected(key); }}
                  className="relative aspect-square rounded-xl text-sm font-semibold transition-all disabled:opacity-30 flex flex-col items-center justify-center"
                  style={{
                    background: isSel ? "var(--accent)" : isToday ? "var(--accent-subtle)" : "var(--bg)",
                    color: isSel ? "var(--accent-contrast)" : "var(--text)",
                    border: `1px solid ${isSel ? "var(--accent)" : isToday ? "color-mix(in srgb, var(--accent) 40%, var(--border))" : "var(--border)"}`,
                  }}>
                  {Number(key.slice(-2))}
                  {count > 0 && (
                    <span className="text-[10px] font-bold leading-none mt-0.5 px-1 rounded-full"
                      style={{
                        background: isSel ? "color-mix(in srgb, var(--accent-contrast) 25%, transparent)" : "var(--success-bg)",
                        color: isSel ? "var(--accent-contrast)" : "var(--success-text)",
                      }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-(--muted) mt-3 px-1">
            {t("The number on each date is how many reports were filed that day.")}
          </p>
        </div>
      </aside>

      {/* ── Day detail ────────────────────────────────────────────────── */}
      <section className="space-y-4 min-w-0">
        {selected && (
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-(--text)">{fmtDay(selected)}</h2>
            {reports !== null && (
              <p className="text-sm text-(--muted)">
                <span className="font-semibold" style={{ color: "var(--success-text)" }}>{reports.length} {t("submitted")}</span>
                {" · "}
                <span className="font-semibold" style={{ color: missing.length ? "var(--error-text)" : "var(--muted)" }}>{missing.length} {t("missing")}</span>
              </p>
            )}
          </div>
        )}

        {/* Missing strip */}
        {reports !== null && missing.length > 0 && (
          <div className="rounded-2xl border px-4 py-3"
            style={{ background: "var(--error-bg)", borderColor: "color-mix(in srgb, var(--error) 25%, transparent)" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--error-text)" }}>
              ⚠️ {t("Did not submit")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((m) => {
                const rc = roleColor(m.role);
                return (
                  <span key={m._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium"
                    style={{ background: "var(--surface)", color: rc.text, border: `1px solid ${rc.dot}` }}>
                    {m.name} <span className="opacity-70">· {rc.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {reports === null ? (
          <div className="space-y-3">
            <div className="skeleton h-36 rounded-2xl" />
            <div className="skeleton h-36 rounded-2xl" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">🗒️</p>
            <p className="text-sm text-(--muted)">{t("No reports were submitted on this day.")}</p>
          </div>
        ) : (
          reports.map((r) => {
            const rc = roleColor(r.authorRole);
            const aud = audience[r._id] ?? "public";
            return (
              <article key={r._id} className="rounded-2xl border overflow-hidden card-lift"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-xs)" }}>
                {/* Author strip */}
                <header className="px-5 py-3 border-b flex items-center gap-3"
                  style={{ borderColor: "var(--border)", background: rc.bg }}>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "var(--surface)", color: rc.text, border: `2px solid ${rc.dot}` }}>
                    {(r.authorName ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: rc.text }}>{r.authorName}</p>
                    <p className="text-[11px] font-medium opacity-80" style={{ color: rc.text }}>{rc.label} · {t("filed at")} {fmtTime(r.createdAt)}</p>
                  </div>
                </header>

                <div className="rt-content px-5 py-4 text-sm" dangerouslySetInnerHTML={{ __html: r.html }} />

                {/* Comments */}
                <div className="px-5 pb-4 space-y-1.5">
                  {r.comments.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "var(--border)" }}>
                      {r.comments.map((c) => {
                        const cc = roleColor(c.byRole);
                        return (
                          <p key={c._id} className="text-[13px] leading-snug">
                            {c.visibility === "directors" && (
                              <span data-tip={t("Only directors & above can see this")}
                                className="mr-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                style={{ background: "var(--accent-3-bg)", color: "var(--accent-3)" }}>
                                🔒 {t("directors")}
                              </span>
                            )}
                            <span className="font-semibold" style={{ color: cc.text }}>{c.byName}</span>
                            <span className="text-(--muted)">: </span>
                            <span className="text-(--text)">{c.text}</span>
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {/* Composer with audience switch */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <div className="flex rounded-lg overflow-hidden border shrink-0" style={{ borderColor: "var(--border)" }}>
                      <button type="button" data-tip={t("The author will see this comment")}
                        onClick={() => setAudience((p) => ({ ...p, [r._id]: "public" }))}
                        className="px-2.5 py-1.5 text-[11px] font-bold"
                        style={{
                          background: aud === "public" ? "var(--success-bg)" : "var(--bg)",
                          color: aud === "public" ? "var(--success-text)" : "var(--muted)",
                        }}>
                        👁 {t("Everyone")}
                      </button>
                      <button type="button" data-tip={t("Hidden from the author — reviewer group only")}
                        onClick={() => setAudience((p) => ({ ...p, [r._id]: "directors" }))}
                        className="px-2.5 py-1.5 text-[11px] font-bold"
                        style={{
                          background: aud === "directors" ? "var(--accent-3-bg)" : "var(--bg)",
                          color: aud === "directors" ? "var(--accent-3)" : "var(--muted)",
                        }}>
                        🔒 {t("Directors only")}
                      </button>
                    </div>
                    <input value={draft[r._id] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [r._id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); comment(r._id); } }}
                      placeholder={aud === "directors" ? t("Private note for the reviewer group…") : t("Write feedback the author will see…")}
                      className="flex-1 min-w-40 px-2.5 py-1.5 text-xs rounded-lg border bg-(--bg) focus:outline-none focus:border-(--accent)"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }} />
                    <button type="button" onClick={() => comment(r._id)} disabled={!(draft[r._id] ?? "").trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                      {t("Send")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
