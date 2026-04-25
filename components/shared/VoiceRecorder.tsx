"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Called once the recording has been uploaded — receives the public URL + duration in seconds. */
  onUploaded: (url: string, durationSec: number) => void;
  /** Optional CSS class to override the trigger button look. */
  className?: string;
  /** Compact mode: only mic icon, no labels. */
  compact?: boolean;
  /** Disable recording (e.g. when the parent is busy). */
  disabled?: boolean;
}

/**
 * Cross-browser voice recorder using MediaRecorder. Records as audio/webm by
 * default (Chrome/Firefox/Edge) or audio/mp4 (Safari), uploads via /api/upload,
 * and hands the URL back to the parent.
 *
 * Designed for community members who cannot read or write — single tap to
 * record, single tap to stop, automatic upload.
 */
export default function VoiceRecorder({ onUploaded, className, compact, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const streamRef  = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    // Cleanup on unmount: stop tracks if still open
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  function pickMimeType(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }

  async function start() {
    if (recording || busy) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => upload(mr.mimeType || "audio/webm");
      mr.start();
      mediaRef.current = mr;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
    } catch (e) {
      setError(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Microphone access denied. Allow it in your browser to record."
        : "Couldn't start recording.");
    }
  }

  function stop() {
    if (!recording) return;
    mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    setRecording(false);
  }

  async function upload(mimeType: string) {
    setBusy(true);
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "m4a"
                : mimeType.includes("mpeg") ? "mp3"
                : mimeType.includes("wav") ? "wav"
                : "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      onUploaded(data.url, elapsed);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      setElapsed(0);
    }
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
        {!recording ? (
          <button type="button" onClick={start} disabled={disabled || busy}
            title="Record voice message"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
            🎤
          </button>
        ) : (
          <button type="button" onClick={stop}
            title="Stop recording"
            className="px-2.5 h-8 rounded-full flex items-center gap-1.5 text-xs font-bold animate-pulse"
            style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            ● {minutes}:{seconds}
          </button>
        )}
        {busy && <span className="text-[11px] text-(--muted)">uploading…</span>}
        {error && <span className="text-[11px] text-(--error-text)">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${className ?? ""}`}
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3">
        {!recording ? (
          <button type="button" onClick={start} disabled={disabled || busy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            🎤 {busy ? "Uploading…" : "Record Voice"}
          </button>
        ) : (
          <button type="button" onClick={stop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-pulse"
            style={{ background: "var(--error)", color: "#fff" }}>
            ⏹ Stop · {minutes}:{seconds}
          </button>
        )}
        <p className="text-xs text-(--muted)">
          Tap once to start, again to stop. We'll upload it for you — no need to type.
        </p>
      </div>
      {error && <p className="text-xs text-(--error-text) mt-2">{error}</p>}
    </div>
  );
}
