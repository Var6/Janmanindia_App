"use client";

import { useState, useEffect } from "react";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { CommunityHelpTabs } from "@/components/community/SectionTabs";
import { useT } from "@/components/i18n/LanguageProvider";

type Msg = {
  _id: string;
  audioUrl: string;
  durationSec?: number;
  message?: string;
  status: "new" | "heard" | "responded";
  responseNote?: string;
  createdAt: string;
};

function fmt(sec?: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SpeakToUsPage() {
  const t = useT();
  const [audioUrl, setAudioUrl]     = useState("");
  const [duration, setDuration]     = useState(0);
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");
  const [history, setHistory]       = useState<Msg[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch("/api/community/voice-message")
      .then(r => r.json())
      .then(d => setHistory(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioUrl) { setError(t("Please record a voice message first.")); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/community/voice-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl, durationSec: duration || undefined, message: text.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? t("Failed to send.")); return; }
      setHistory(prev => [d.voiceMessage, ...prev]);
      setAudioUrl(""); setDuration(0); setText("");
      setSuccess(t("Your message has been sent! Our team will listen and reach out to you."));
      setTimeout(() => setSuccess(""), 6000);
    } catch {
      setError(t("Network error — please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
    new:       { label: t("Sent — awaiting review"), bg: "var(--warning-bg)",  color: "var(--warning-text)"  },
    heard:     { label: t("Heard by team"),           bg: "var(--info-bg)",     color: "var(--info-text)"     },
    responded: { label: t("Team responded"),          bg: "var(--success-bg)", color: "var(--success-text)"  },
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <CommunityHelpTabs />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Speak to Us")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Can't type? No problem — record your voice and we'll listen. Our team will reach out to you. You don't need a verified account to send a message.")}
        </p>
      </div>

      {/* Record & send form */}
      <form onSubmit={handleSubmit}
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h2 className="font-semibold text-(--text)">{t("Send a Voice Message")}</h2>

        {success && (
          <div className="p-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid color-mix(in srgb,var(--success) 20%,transparent)" }}>
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl text-sm"
            style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}

        {/* Recorder */}
        {audioUrl ? (
          <div className="rounded-xl border p-4 space-y-2"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-sm font-medium text-(--text)">
              {t("Recording ready")} {duration ? `· ${fmt(duration)}` : ""}
            </p>
            <audio controls src={audioUrl} className="w-full h-9" />
            <button type="button" onClick={() => { setAudioUrl(""); setDuration(0); }}
              className="text-xs hover:underline" style={{ color: "var(--error-text)" }}>
              {t("Remove — record again")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-(--text)">{t("Step 1 — Record your message")}</p>
            <VoiceRecorder
              onUploaded={(url, sec) => { setAudioUrl(url); setDuration(sec); setError(""); }}
              disabled={submitting}
            />
          </div>
        )}

        {/* Optional text */}
        <div>
          <label className="block text-sm font-medium text-(--text) mb-1.5">
            {t("Add a note")} <span className="text-(--muted) font-normal">{t("(optional — type in Hindi or English)")}</span>
          </label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder={t("जो बात आप बताना चाहते हैं वो यहाँ लिखें… / Write what you want us to know…")}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        </div>

        <button type="submit" disabled={submitting || !audioUrl}
          className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {submitting ? t("Sending…") : t("Send to Janman Team")}
        </button>
      </form>

      {/* History */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">{t("Your sent messages")}</h2>
        {loadingHistory ? (
          <div className="rounded-2xl border divide-y divide-(--border)"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4"><SkeletonRow trailing={false} /></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-2xl mb-2">🎤</p>
            <p className="text-sm text-(--muted)">{t("No messages sent yet.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(m => {
              const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.new;
              return (
                <div key={m._id} className="rounded-2xl border p-4 space-y-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-(--muted)">
                      {new Date(m.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {m.durationSec ? ` · ${fmt(m.durationSec)}` : ""}
                    </p>
                    <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <audio controls src={m.audioUrl} className="w-full h-9" />
                  {m.message && (
                    <p className="text-sm text-(--text-2) px-3 py-2 rounded-lg"
                      style={{ background: "var(--bg)" }}>
                      {m.message}
                    </p>
                  )}
                  {m.responseNote && (
                    <div className="px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--info-bg)", color: "var(--info-text)", border: "1px solid color-mix(in srgb,var(--info) 20%,transparent)" }}>
                      <span className="font-semibold">{t("Team note:")} </span>{m.responseNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
