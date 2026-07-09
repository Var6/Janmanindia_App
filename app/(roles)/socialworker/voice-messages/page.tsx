"use client";

import { useState, useEffect } from "react";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

type Msg = {
  _id: string;
  fromName: string;
  audioUrl: string;
  durationSec?: number;
  message?: string;
  status: "new" | "heard" | "responded";
  responseNote?: string;
  heardAt?: string;
  createdAt: string;
};

function fmt(sec?: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TABS = ["new", "heard", "responded", "all"] as const;
type Tab = typeof TABS[number];

export default function VoiceMessagesPage() {
  const t = useT();
  const [tab, setTab]         = useState<Tab>("new");
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [note, setNote]       = useState("");

  async function load(t: Tab) {
    setLoading(true);
    try {
      const url = t === "all" ? "/api/community/voice-message" : `/api/community/voice-message?status=${t}`;
      const res = await fetch(url);
      const d = await res.json();
      setMsgs(d.messages ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(tab); }, [tab]);

  async function act(id: string, action: "heard" | "responded", responseNote?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/community/voice-message/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseNote }),
      });
      if (res.ok) {
        const d = await res.json();
        setMsgs(prev => prev.map(m => m._id === id ? { ...m, ...d.voiceMessage } : m));
        setReplyId(null); setNote("");
      }
    } finally {
      setBusyId(null);
    }
  }

  const newCount = msgs.filter(m => m.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Voice Messages")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Community members who can't type send recordings here. Listen and reach out to them.")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
            style={tab === t ? { background: "var(--accent)", color: "var(--accent-contrast)" }
              : { color: "var(--muted)" }}>
            {t}{t === "new" && newCount > 0 ? ` (${newCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border divide-y divide-(--border)"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><SkeletonRow trailing={true} /></div>
          ))}
        </div>
      ) : msgs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-2xl mb-2">🎤</p>
          <p className="text-sm text-(--muted)">{t("No")} {tab === "all" ? "" : tab} {t("messages.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {msgs.map(m => (
            <article key={m._id} className="rounded-2xl border p-5 space-y-4"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-(--text)">{m.fromName}</p>
                  <p className="text-xs text-(--muted) mt-0.5">
                    {new Date(m.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {m.durationSec ? ` · ${fmt(m.durationSec)}` : ""}
                  </p>
                </div>
                <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full capitalize"
                  style={
                    m.status === "new"       ? { background: "var(--warning-bg)", color: "var(--warning-text)" }
                  : m.status === "heard"     ? { background: "var(--info-bg)",    color: "var(--info-text)"    }
                  :                            { background: "var(--success-bg)", color: "var(--success-text)" }
                  }>
                  {m.status === "new" ? t("New") : m.status === "heard" ? t("Heard") : t("Responded")}
                </span>
              </div>

              {/* Audio player */}
              <audio controls src={m.audioUrl} className="w-full h-10" />

              {/* Optional text note from community member */}
              {m.message && (
                <p className="text-sm text-(--text) px-3 py-2 rounded-lg italic"
                  style={{ background: "var(--bg)", borderLeft: "3px solid var(--accent)" }}>
                  {m.message}
                </p>
              )}

              {/* Staff response note (if already responded) */}
              {m.responseNote && (
                <div className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                  <span className="font-semibold">{t("Your note:")} </span>{m.responseNote}
                </div>
              )}

              {/* Actions */}
              {m.status === "new" && (
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => act(m._id, "heard")} disabled={busyId === m._id}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                    {t("Mark heard")}
                  </button>
                  <button onClick={() => setReplyId(replyId === m._id ? null : m._id)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    {t("Heard + Add note")}
                  </button>
                </div>
              )}
              {m.status === "heard" && (
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => setReplyId(replyId === m._id ? null : m._id)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    {t("Add response note")}
                  </button>
                </div>
              )}

              {/* Inline reply form */}
              {replyId === m._id && (
                <form onSubmit={e => { e.preventDefault(); act(m._id, "responded", note); }}
                  className="rounded-xl border p-3 space-y-2"
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold text-(--text)">{t("Note for this person")}</p>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder={t("e.g. We listened — a social worker will call you within 24 hours.")}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={busyId === m._id || !note.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                      style={{ background: "var(--success)", color: "#fff" }}>
                      {t("Save note")}
                    </button>
                    <button type="button" onClick={() => { setReplyId(null); setNote(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      {t("Cancel")}
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
