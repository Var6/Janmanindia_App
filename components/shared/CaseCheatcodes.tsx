"use client";

/**
 * "Cheatcode" comments — pinned strategy notes the team writes on a case.
 * Original commenter can edit / delete / pin; everyone else can only reply.
 * Pinned comments float at the top of the panel (and on the workflow graph
 * later) so the cheatcode lines stay visible.
 */

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

type Reply = {
  _id: string;
  text: string;
  by: string;
  byName: string;
  byRole?: string;
  createdAt: string;
  editedAt?: string;
};
type Comment = {
  _id: string;
  text: string;
  by: string;
  byName: string;
  byRole?: string;
  pinned?: boolean;
  createdAt: string;
  editedAt?: string;
  replies: Reply[];
};

interface Props {
  caseId: string;
  comments: Comment[];
  /** Current session user id — used to gate edit / delete / pin to the
   *  comment author. Optional: when omitted the component fetches it
   *  from `/api/users/me` on mount, so server-rendered pages don't have
   *  to thread the session through. */
  currentUserId?: string;
  onChanged: () => void;
}

function fmtRel(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function CaseCheatcodes({ caseId, comments, currentUserId: cuidProp, onChanged }: Props) {
  const t = useT();
  const [draft, setDraft]     = useState("");
  const [pinDraft, setPinDraft] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  // Resolve current user id once. The author-edit gate is purely cosmetic
  // (the server enforces it again) so a brief delay before the buttons
  // appear is acceptable.
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(cuidProp);
  useEffect(() => {
    if (currentUserId) return;
    fetch("/api/users/me").then(r => r.json()).then((d: { user?: { _id: string } }) => {
      if (d.user?._id) setCurrentUserId(d.user._id);
    }).catch(() => {});
  }, [currentUserId]);

  // Pinned first, then most-recent first within each bucket.
  const sorted = [...comments].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function call(body: unknown) {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? t("Failed."));
        return false;
      }
      onChanged();
      return true;
    } catch {
      setErr(t("Network error."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!draft.trim()) return;
    const ok = await call({ op: "add", text: draft.trim(), pinned: pinDraft });
    if (ok) { setDraft(""); setAdding(false); }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--warning) 8%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--warning-text)" }}>
          <span>📌</span> {t("Cheatcodes & Notes")} <span className="text-(--muted) font-normal">· {comments.length}</span>
        </span>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            {t("+ Add note")}
          </button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}

        {adding && (
          <div className="rounded-xl border p-3 space-y-2"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
              placeholder={t("e.g. Police negligence visible from para 7 of FIR — useful at admission stage")}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-y"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={pinDraft} onChange={e => setPinDraft(e.target.checked)} className="accent-(--accent)" />
                <span className="text-(--muted)">{t("Pin to top")}</span>
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setAdding(false); setDraft(""); setErr(""); }}
                  className="text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
                <button type="button" onClick={add} disabled={busy || !draft.trim()}
                  className="px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                  {busy ? t("Saving…") : t("Save")}
                </button>
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 && !adding && (
          <p className="text-xs text-(--muted) italic px-1 py-2">{t("No notes yet. Pin the one or two facts that make this case winnable.")}</p>
        )}

        {sorted.map(c => (
          <CommentRow key={c._id} caseId={caseId} comment={c}
            currentUserId={currentUserId} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function CommentRow({ caseId, comment, currentUserId, onChanged }: {
  caseId: string;
  comment: Comment;
  currentUserId?: string;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(comment.text);
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  const isMine = comment.by === currentUserId;
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset the local edit state when the parent re-renders with a freshly
  // saved version of the comment (avoids stale draft after save).
  useEffect(() => { setDraft(comment.text); setEditing(false); }, [comment.text]);

  async function call(body: unknown) {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? t("Failed."));
        return false;
      }
      onChanged();
      return true;
    } catch {
      setErr(t("Network error."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="rounded-xl border p-3"
      style={{
        background: comment.pinned
          ? "color-mix(in srgb, var(--warning) 6%, var(--surface))"
          : "var(--surface)",
        borderColor: comment.pinned
          ? "color-mix(in srgb, var(--warning) 35%, transparent)"
          : "var(--border)",
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-(--muted)">
            {comment.pinned && <span className="mr-1.5">📌</span>}
            <span className="font-semibold text-(--text)">{comment.byName}</span>
            {comment.byRole && <span className="ml-1.5">· {comment.byRole}</span>}
            <span className="ml-1.5">· {fmtRel(comment.createdAt)}</span>
            {comment.editedAt && <span className="ml-1.5 italic">{t("(edited)")}</span>}
          </p>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-y"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              <div className="flex items-center gap-2 text-xs">
                <button type="button" disabled={busy || !draft.trim()}
                  onClick={async () => {
                    const ok = await call({ op: "edit", commentId: comment._id, text: draft.trim() });
                    if (ok) setEditing(false);
                  }}
                  className="px-3 py-1 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Save")}</button>
                <button type="button" onClick={() => { setEditing(false); setDraft(comment.text); }}
                  className="text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-(--text) mt-1 whitespace-pre-line leading-relaxed">{comment.text}</p>
          )}
        </div>

        {isMine && !editing && (
          <div className="flex items-center gap-2 text-[12px] shrink-0">
            <button type="button" onClick={() => call({ op: "togglePin", commentId: comment._id })}
              className="hover:underline" style={{ color: "var(--muted)" }}>
              {comment.pinned ? t("Unpin") : t("Pin")}
            </button>
            <button type="button" onClick={() => setEditing(true)}
              className="hover:underline" style={{ color: "var(--accent)" }}>{t("Edit")}</button>
            <button type="button" onClick={() => {
              if (confirm(t("Delete this note? This can't be undone."))) {
                call({ op: "delete", commentId: comment._id });
              }
            }}
              className="hover:underline" style={{ color: "var(--error)" }}>{t("Delete")}</button>
          </div>
        )}
      </div>

      {err && <p className="text-xs mt-2" style={{ color: "var(--error-text)" }}>{err}</p>}

      {comment.replies.length > 0 && (
        <div className="mt-3 pl-3 space-y-2 border-l" style={{ borderColor: "var(--border)" }}>
          {comment.replies.map(r => (
            <ReplyRow key={r._id} caseId={caseId} commentId={comment._id} reply={r}
              currentUserId={currentUserId} onChanged={onChanged} />
          ))}
        </div>
      )}

      <div className="mt-2">
        {replying ? (
          <div className="flex items-end gap-2">
            <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)} rows={2}
              placeholder={t("Reply…")}
              className="flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none resize-y"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <button type="button" disabled={busy || !replyDraft.trim()}
              onClick={async () => {
                const ok = await call({ op: "reply", commentId: comment._id, text: replyDraft.trim() });
                if (ok) { setReplyDraft(""); setReplying(false); }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Reply")}</button>
            <button type="button" onClick={() => { setReplying(false); setReplyDraft(""); }}
              className="text-xs text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setReplying(true)}
            className="text-[12px] hover:underline" style={{ color: "var(--accent)" }}>{t("+ Reply")}</button>
        )}
      </div>
    </div>
  );
}

function ReplyRow({ caseId, commentId, reply, currentUserId, onChanged }: {
  caseId: string;
  commentId: string;
  reply: Reply;
  currentUserId?: string;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(reply.text);
  const [busy, setBusy]       = useState(false);
  const isMine = reply.by === currentUserId;

  useEffect(() => { setDraft(reply.text); setEditing(false); }, [reply.text]);

  async function call(body: unknown) {
    setBusy(true);
    try {
      const r = await fetch(`/api/cases/${caseId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-xs">
      <p className="text-(--muted)">
        <span className="font-semibold text-(--text)">{reply.byName}</span>
        {reply.byRole && <span className="ml-1.5">· {reply.byRole}</span>}
        <span className="ml-1.5">· {fmtRel(reply.createdAt)}</span>
        {reply.editedAt && <span className="ml-1.5 italic">{t("(edited)")}</span>}
      </p>
      {editing ? (
        <div className="mt-1 space-y-1">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
            className="w-full px-2 py-1.5 rounded border text-xs focus:outline-none resize-y"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy || !draft.trim()}
              onClick={async () => {
                await call({ op: "editReply", commentId, replyId: reply._id, text: draft.trim() });
                setEditing(false);
              }}
              className="px-2 py-0.5 rounded text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>{t("Save")}</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(reply.text); }}
              className="text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
          </div>
        </div>
      ) : (
        <p className="text-(--text) whitespace-pre-line leading-relaxed mt-0.5">{reply.text}</p>
      )}
      {isMine && !editing && (
        <div className="flex items-center gap-2 mt-1 text-[12px]">
          <button type="button" onClick={() => setEditing(true)} className="hover:underline" style={{ color: "var(--accent)" }}>{t("Edit")}</button>
          <button type="button" onClick={() => {
            if (confirm(t("Delete this reply?"))) call({ op: "deleteReply", commentId, replyId: reply._id });
          }} className="hover:underline" style={{ color: "var(--error)" }}>{t("Delete")}</button>
        </div>
      )}
    </div>
  );
}
