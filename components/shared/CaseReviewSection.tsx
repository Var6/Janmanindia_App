"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";

interface Review {
  _id: string;
  text: string;
  author: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  mine: boolean;
}

const FINAL_STATUSES = ["Disposal", "Closed", "Dismissed", "Withdrawn"];
const DUE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CaseReviewSection({
  caseId, caseCreatedAt, caseStatus,
}: { caseId: string; caseCreatedAt: string; caseStatus: string }) {
  const t = useT();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews`);
      if (!res.ok) { setLoaded(true); return; }
      const d = await res.json();
      setReviews(d.reviews ?? []);
      setCanWrite(Boolean(d.canWrite));
    } catch { /* ignore */ }
    finally { setLoaded(true); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const isFinal = FINAL_STATUSES.includes(caseStatus);
  const ageDays = (Date.now() - new Date(caseCreatedAt).getTime()) / DAY_MS;
  const reviewDue = canWrite && !isFinal && ageDays >= DUE_DAYS && reviews.length === 0;

  async function submit() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setDraft(""); toast(t("Review submitted."), "success"); await load(); }
      else toast(d.error ?? t("Failed to submit review."), "error");
    } finally { setBusy(false); }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setEditing(null); toast(t("Review updated."), "success"); await load(); }
      else toast(d.error ?? t("Failed to update review."), "error");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { toast(t("Review deleted."), "success"); await load(); }
      else toast(d.error ?? t("Failed to delete review."), "error");
    } finally { setBusy(false); }
  }

  if (!loaded) return null;
  // Nothing to show for users who can neither write nor view any reviews.
  if (!canWrite && reviews.length === 0) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{t("Monthly Case Review")}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {t("Written by the advocate ~1 month in. Editable for 24 hours, then locked. Visible to directors.")}
        </p>
      </div>

      <div className="p-5 space-y-4">
        {reviewDue && (
          <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "color-mix(in srgb, #f59e0b 14%, transparent)", color: "#92400e" }}>
            ⏰ {t("This case is due for its monthly review. Please write one below.")}
          </div>
        )}

        {/* Composer — only the assigned advocate can write. */}
        {canWrite && !isFinal && (
          <div className="space-y-2">
            <textarea
              value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
              placeholder={t("Write your review of how this case is progressing…")}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <div className="flex justify-end">
              <button type="button" onClick={submit} disabled={busy || !draft.trim()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                {busy ? t("Saving…") : t("Submit review")}
              </button>
            </div>
          </div>
        )}

        {/* Existing reviews */}
        {reviews.length === 0 ? (
          <p className="text-xs text-(--muted)">{t("No reviews yet.")}</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-(--text)">{r.authorName ?? t("Advocate")}</span>
                  <span className="text-[11px] text-(--muted)">
                    {fmt(r.createdAt)}{r.locked ? ` · 🔒 ${t("locked")}` : ""}
                  </span>
                </div>
                {editing === r._id ? (
                  <div className="space-y-2">
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                      className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(null)} className="text-xs px-2.5 py-1 rounded-lg" style={{ color: "var(--muted)" }}>{t("Cancel")}</button>
                      <button type="button" onClick={() => saveEdit(r._id)} disabled={busy}
                        className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Save")}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>{r.text}</p>
                    {r.mine && !r.locked && (
                      <div className="flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => { setEditing(r._id); setEditText(r.text); }} className="text-[11px] font-medium text-(--accent) hover:underline">{t("Edit")}</button>
                        <button type="button" onClick={() => remove(r._id)} className="text-[11px] font-medium text-red-600 hover:underline">{t("Delete")}</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
