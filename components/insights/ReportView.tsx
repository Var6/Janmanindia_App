"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { TileData } from "@/lib/insights/tiles";
import ChartView, { type ChartDisplay } from "@/components/insights/charts/ChartView";
import KpiCard from "@/components/insights/KpiCard";
import RichText from "@/components/insights/RichText";
import { inputCls } from "@/components/insights/QueryBuilder";
import { useNotify } from "@/components/insights/useNotify";

type SnapTile = { id: string; kind: string; w: number; h: number; data?: TileData };
type Report = {
  _id: string; title: string; dashboardTitle: string; periodStart: string; periodEnd: string; summary?: string;
  snapshot: { tabs: { id: string; title: string; tiles: SnapTile[] }[]; generatedAt: string };
  comments: { _id: string; tileId?: string; text: string; byName: string; at: string }[];
  createdBy?: { name?: string }; createdAt: string;
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** A report: the frozen dashboard, an executive summary, and comments on the
 *  whole report or on single tiles. Print / Save as PDF prints only this. */
export default function ReportView({ id }: { id: string }) {
  const toast = useNotify();
  const { data, error, reload } = useApi<{ report: Report }>(`/api/insights/reports/${id}`);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  if (error) return <p className="text-sm text-(--error-text)">{error}</p>;
  if (!data) return <p className="text-sm text-(--muted)">Loading…</p>;
  const r = data.report;

  async function saveSummary() {
    try { await api(`/api/insights/reports/${id}`, { method: "PATCH", body: { summary: editingSummary } }); setEditingSummary(null); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function addComment(tileId?: string) {
    if (!comment.trim()) return;
    try { await api(`/api/insights/reports/${id}/comments`, { body: { text: comment, tileId } }); setComment(""); setCommentFor(null); reload(); }
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
          <p className="text-(--text) whitespace-pre-wrap">{c.text}</p>
          <p className="text-(--muted) mt-0.5">{c.byName} · {new Date(c.at).toLocaleDateString("en-IN")}
            <button className="ml-2 hover:text-(--error)" onClick={() => deleteComment(c._id)}>delete</button></p>
        </div>
      ))}
      {commentFor === (tileId ?? "report") ? (
        <div className="flex gap-2 mt-1">
          <input className={inputCls} autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" onKeyDown={(e) => e.key === "Enter" && addComment(tileId)} />
          <button className="btn-primary" onClick={() => addComment(tileId)}>Post</button>
        </div>
      ) : (
        <button className="text-[11px] text-(--muted) hover:text-(--accent)" onClick={() => { setCommentFor(tileId ?? "report"); setComment(""); }}>
          💬 Comment{commentsOn(tileId).length ? ` (${commentsOn(tileId).length})` : ""}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/director/insights/reports" className="text-sm text-(--muted) hover:text-(--accent)">← All reports</Link>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied (directors only)"); }}>Copy link</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </div>

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
            {editingSummary === null && <button className="text-xs text-(--accent) print:hidden" onClick={() => setEditingSummary(r.summary ?? "")}>Edit</button>}
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
                <div key={t.id} className="col-span-12 rounded-2xl border border-(--border) p-4 break-inside-avoid"
                  style={{ gridColumn: `span ${t.w} / span ${t.w}`, background: "var(--surface)" }}>
                  <SnapshotTile tile={t} />
                  {t.kind !== "text" && commentBox(t.id)}
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="text-[11px] text-(--muted)">Snapshot taken {new Date(r.snapshot.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. Figures do not change when records are edited later.</p>
      </div>
    </div>
  );
}

function SnapshotTile({ tile }: { tile: SnapTile }) {
  const d = tile.data;
  if (!d) return <p className="text-sm text-(--muted)">No data.</p>;
  if (d.kind === "text") return <RichText text={d.text} />;
  if (d.kind === "error") return <p className="text-sm text-(--error-text)">{d.error}</p>;
  if (d.kind === "kpi") return <KpiCard data={d} />;
  return (
    <div>
      <h3 className="text-sm font-semibold text-(--text)">{d.chart.title}</h3>
      {d.chart.description && <p className="text-xs text-(--muted) mb-2">{d.chart.description}</p>}
      <ChartView type={d.chart.chartType as never} result={d.result} grain={d.chart.grain} display={d.chart.display as ChartDisplay} height={Math.max(200, tile.h * 100)} />
    </div>
  );
}
