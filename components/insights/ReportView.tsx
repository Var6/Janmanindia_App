"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { TileData } from "@/lib/insights/tiles";
import ChartView, { type ChartDisplay } from "@/components/insights/charts/ChartView";
import ChartExport from "@/components/insights/charts/ChartExport";
import KpiCard from "@/components/insights/KpiCard";
import ImageTile from "@/components/insights/ImageTile";
import Modal from "@/components/insights/Modal";
import RichText from "@/components/insights/RichText";
import ShareDialog, { sharingSummary, type Person } from "@/components/insights/ShareDialog";
import { inputCls, labelCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type SnapTile = { id: string; kind: string; w: number; h: number; data?: TileData };
type Comment = { _id: string; tileId?: string; text: string; by: string; byName: string; at: string };
type Report = {
  _id: string; title: string; dashboardTitle: string; periodStart: string; periodEnd: string; summary?: string;
  snapshot: { tabs: { id: string; title: string; tiles: SnapTile[] }[]; generatedAt: string };
  comments: Comment[];
  createdBy?: { name?: string }; createdAt: string;
  visibleTo?: string[]; sharedWith?: string[];
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * A report: the frozen dashboard, an executive summary, and comments on the
 * whole report or on single tiles, with @mentions. Directors can also edit
 * the summary, share it and email it. Staff it is shared with see the same
 * page read-only (they can comment). Print / Save as PDF prints only this.
 */
export default function ReportView({ id, mode = "admin" }: { id: string; mode?: "admin" | "viewer" }) {
  const toast = useNotify();
  const { data, error, reload } = useApi<{ report: Report; isAdmin: boolean; me: string }>(`/api/insights/shared/reports/${id}`);
  const people = useApi<{ people: Person[] }>("/api/insights/people");
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [emailing, setEmailing] = useState(false);

  if (error) return <p className="text-sm text-(--error-text)">{error === "Not found" ? "This report does not exist or has not been shared with you." : error}</p>;
  if (!data) return <p className="text-sm text-(--muted)">Loading…</p>;
  const r = data.report;
  const admin = mode === "admin" && data.isAdmin;

  async function saveSummary() {
    try { await api(`/api/insights/reports/${id}`, { method: "PATCH", body: { summary: editingSummary } }); setEditingSummary(null); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function deleteComment(cid: string) {
    try { await api(`/api/insights/reports/${id}/comments?commentId=${cid}`, { method: "DELETE" }); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  const commentsOn = (tileId?: string) => r.comments.filter((c) => (c.tileId ?? undefined) === tileId);

  const commentBox = (tileId?: string) => (
    <div className="mt-2 print:hidden">
      {commentsOn(tileId).map((c) => (
        <div key={c._id} className="text-xs rounded-lg p-2 mb-1" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-(--text) whitespace-pre-wrap">{withMentions(c.text, people.data?.people ?? [])}</p>
          <p className="text-(--muted) mt-0.5">{c.byName} · {new Date(c.at).toLocaleDateString("en-IN")}
            {(String(c.by) === data.me) && <button className="ml-2 hover:text-(--error)" onClick={() => deleteComment(c._id)}>delete</button>}</p>
        </div>
      ))}
      {commentFor === (tileId ?? "report") ? (
        <CommentInput people={people.data?.people ?? []} onCancel={() => setCommentFor(null)}
          onPost={async (text, mentions) => {
            try {
              const res = await api<{ mentioned: string[] }>(`/api/insights/reports/${id}/comments`, { body: { text, tileId, mentions } });
              if (res.mentioned.length) toast.success(`Told ${res.mentioned.join(", ")}`);
              setCommentFor(null); reload();
            } catch (e) { toast.error((e as Error).message); }
          }} />
      ) : (
        <button className="text-[11px] text-(--muted) hover:text-(--accent)" onClick={() => setCommentFor(tileId ?? "report")}>
          💬 Comment{commentsOn(tileId).length ? ` (${commentsOn(tileId).length})` : ""}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={admin ? "/director/insights/reports" : "/insights"} className="text-sm text-(--muted) hover:text-(--accent)">
          ← {admin ? "All reports" : "Insights shared with you"}
        </Link>
        <div className="flex flex-wrap gap-2">
          {admin && <button className="btn-secondary" onClick={() => setSharing(true)}>Share</button>}
          {admin && <button className="btn-secondary" onClick={() => setEmailing(true)}>Email</button>}
          <button className="btn-secondary" onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/insights/reports/${id}`);
            toast.success(admin ? "Link copied. It opens for directors and anyone the report is shared with." : "Link copied");
          }}>Copy link</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </div>
      {admin && <p className="text-xs text-(--muted) -mt-3 print:hidden">{sharingSummary(r.visibleTo ?? [], (r.sharedWith ?? []).map(String))}</p>}

      <div id="insights-print" className="space-y-6">
        <header className="rounded-2xl border border-(--border) p-5" style={{ background: "var(--surface)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--muted)">Janman People&apos;s Foundation</p>
          <h1 className="text-2xl font-bold text-(--text) mt-1">{r.title}</h1>
          <p className="text-sm text-(--muted) mt-1">
            {fmtDay(r.periodStart)} to {fmtDay(r.periodEnd)} · from the dashboard “{r.dashboardTitle}” · made by {r.createdBy?.name ?? "—"} on {fmtDay(r.createdAt)}
          </p>
        </header>

        <section className="rounded-2xl border border-(--border) p-5 break-inside-avoid" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-(--text)">Executive summary</h2>
            {admin && editingSummary === null && <button className="text-xs text-(--accent) print:hidden" onClick={() => setEditingSummary(r.summary ?? "")}>Edit</button>}
          </div>
          {editingSummary !== null ? (
            <div className="space-y-2">
              <textarea className={`${inputCls} min-h-32`} value={editingSummary} onChange={(e) => setEditingSummary(e.target.value)} />
              <div className="flex gap-2"><button className="btn-primary" onClick={saveSummary}>Save</button><button className="btn-secondary" onClick={() => setEditingSummary(null)}>Cancel</button></div>
            </div>
          ) : r.summary ? <RichText text={r.summary} /> : <p className="text-sm text-(--muted)">No summary yet.</p>}
          {commentBox()}
        </section>

        {r.snapshot.tabs.map((tab) => (
          <section key={tab.id} className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) border-b border-(--border) pb-1">{tab.title}</h2>
            <div className="grid grid-cols-12 gap-4">
              {tab.tiles.map((t) => (
                <div key={t.id} data-tile={t.id} className="col-span-12 rounded-2xl border border-(--border) p-4 break-inside-avoid"
                  style={{ gridColumn: `span ${t.w} / span ${t.w}`, background: "var(--surface)" }}>
                  <SnapshotTile tile={t} period={`${fmtDay(r.periodStart)} to ${fmtDay(r.periodEnd)}`} />
                  {t.kind !== "text" && t.kind !== "image" && commentBox(t.id)}
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="text-[11px] text-(--muted)">Snapshot taken {new Date(r.snapshot.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. Figures do not change when records are edited later.</p>
      </div>

      {sharing && (
        <ShareDialog kind="report" id={id} title={r.title} initial={{ visibleTo: r.visibleTo ?? [], sharedWith: (r.sharedWith ?? []).map(String) }}
          onClose={() => setSharing(false)} onSaved={() => { setSharing(false); reload(); }} />
      )}
      {emailing && <EmailDialog id={id} title={r.title} people={people.data?.people ?? []} onClose={() => setEmailing(false)} onSent={() => { setEmailing(false); reload(); }} />}
    </div>
  );
}

function SnapshotTile({ tile, period }: { tile: SnapTile; period: string }) {
  const d = tile.data;
  if (!d) return <p className="text-sm text-(--muted)">No data.</p>;
  if (d.kind === "text") return <RichText text={d.text} />;
  if (d.kind === "error") return <p className="text-sm text-(--error-text)">{d.error}</p>;
  if (d.kind === "kpi") return <KpiCard data={d} />;
  if (d.kind === "image") return <ImageTile url={d.url} caption={d.caption} />;
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-(--text)">{d.chart.title}</h3>
          {d.chart.description && <p className="text-xs text-(--muted) mb-2">{d.chart.description}</p>}
        </div>
        <ChartExport title={d.chart.title} subtitle={period} result={d.result}
          target={() => document.querySelector<HTMLElement>(`[data-tile="${tile.id}"]`)} />
      </div>
      <ChartView type={d.chart.chartType as never} result={d.result} grain={d.chart.grain} display={d.chart.display as ChartDisplay} height={Math.max(200, tile.h * 100)} />
    </div>
  );
}

/** Shows "@Name" for known people in bold. */
function withMentions(text: string, people: Person[]): React.ReactNode {
  const names = people.map((p) => p.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length || !text.includes("@")) return text;
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return text.split(re).map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-(--accent)">{part}</strong> : part));
}

/** Comment box with @mention suggestions: type "@" and a few letters. */
function CommentInput({ people, onPost, onCancel }: { people: Person[]; onPost: (text: string, mentions: string[]) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<Person[]>([]);
  const [posting, setPosting] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const m = text.match(/@([^\s@]{0,30})$/);
  const suggestions = m ? people.filter((p) => p.name.toLowerCase().startsWith(m[1].toLowerCase()) || p.name.toLowerCase().includes(` ${m[1].toLowerCase()}`)).slice(0, 6) : [];

  function pick(p: Person) {
    setText(text.replace(/@([^\s@]{0,30})$/, `@${p.name} `));
    setMentions((x) => (x.some((y) => y._id === p._id) ? x : [...x, p]));
    ref.current?.focus();
  }
  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    await onPost(text.trim(), mentions.filter((p) => text.includes(`@${p.name}`)).map((p) => p._id));
    setPosting(false);
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="relative">
      <textarea ref={ref} className={`${inputCls} min-h-16`} autoFocus value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment. Type @ to tell a colleague."
        onKeyDown={(e) => {
          if (suggestions.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); pick(suggestions[0]); }
          else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
          else if (e.key === "Escape") onCancel();
        }} />
      {suggestions.length > 0 && (
        <div className="absolute z-20 left-0 top-full mt-1 w-64 rounded-lg border border-(--border) py-1 shadow-lg" style={{ background: "var(--surface)" }}>
          {suggestions.map((p) => (
            <button key={p._id} type="button" className="block w-full text-left px-3 py-1.5 text-sm text-(--text) hover:bg-(--bg)" onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={posting || !text.trim()} onClick={post}>{posting ? "Posting…" : "Post"}</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <span className="text-[11px] text-(--muted) self-center">People you mention get a notification and can open this report.</span>
      </div>
    </div>
  );
}

function EmailDialog({ id, title, people, onClose, onSent }: { id: string; title: string; people: Person[]; onClose: () => void; onSent: () => void }) {
  const toast = useNotify();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const shown = people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  async function send() {
    setSending(true);
    try {
      const r = await api<{ sent: number; noEmail: string[] }>(`/api/insights/reports/${id}/email`, { body: { people: picked, note } });
      toast.success(`Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}${r.noEmail.length ? `; no email address for ${r.noEmail.join(", ")}` : ""}`);
      onSent();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSending(false); }
  }

  return (
    <Modal title={`Email “${title}”`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-(--muted)">
          Goes to Janman staff only. The email carries the period, the summary, the KPI headlines and a link; each person is given access to
          the report. To send it to a funder, use Print / Save as PDF and attach the file yourself.
        </p>
        <div>
          <label className={labelCls}>Send to</label>
          <input className={`${inputCls} mb-2`} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-48 overflow-auto rounded-lg border border-(--border) p-2 space-y-1">
            {shown.map((p) => (
              <label key={p._id} className="flex items-center gap-2 text-sm text-(--text)">
                <input type="checkbox" checked={picked.includes(p._id)} onChange={() => setPicked(picked.includes(p._id) ? picked.filter((x) => x !== p._id) : [...picked, p._id])} />
                {p.name} <span className="text-xs text-(--muted)">{p.role}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A line on why you are sending it" />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={sending || picked.length === 0} onClick={send}>{sending ? "Sending…" : `Send to ${picked.length || ""}`.trim()}</button>
        </div>
      </div>
    </Modal>
  );
}
