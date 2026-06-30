"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

interface CaseChatMessage {
  _id: string;
  conversation: string;
  text?: string;
  audioUrl?: string;
  createdAt: string;
  sender?: { _id: string; name: string; role: string } | null;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Shows the chat messages that have attached this case (Message.caseRef), so
 * the case page surfaces any discussion happening about it. Lives in the case
 * detail page's right rail.
 */
export default function CaseChatPanel({ caseId }: { caseId: string }) {
  const t = useT();
  const [messages, setMessages] = useState<CaseChatMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${caseId}/chat`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => { if (!cancelled) setMessages(d.messages ?? []); })
      .catch(() => { if (!cancelled) setMessages([]); });
    return () => { cancelled = true; };
  }, [caseId]);

  return (
    <section className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-(--text) text-sm">💬 {t("Case discussion")}</h2>
        <Link href="/chat" className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
          {t("Open chat →")}
        </Link>
      </div>

      {messages === null ? (
        <p className="px-4 py-8 text-center text-xs text-(--muted)">{t("Loading…")}</p>
      ) : messages.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-2xl mb-1">📎</p>
          <p className="text-xs text-(--muted)">{t("No chat discussion yet.")}</p>
          <p className="text-[11px] text-(--muted) mt-1">{t("Attach this case to a message in Chat to start a thread about it.")}</p>
        </div>
      ) : (
        <ul className="divide-y max-h-[60vh] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
          {messages.map((m) => (
            <li key={m._id}>
              <Link href="/chat" className="block px-4 py-2.5 hover:bg-(--bg-secondary) transition-colors">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                    {m.sender ? initials(m.sender.name) : "?"}
                  </span>
                  <span className="text-xs font-semibold text-(--text) truncate">{m.sender?.name ?? t("Unknown")}</span>
                  {m.sender?.role && <span className="text-[10px] text-(--muted) capitalize">{m.sender.role}</span>}
                  <span className="text-[10px] text-(--muted) ml-auto shrink-0">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="text-xs text-(--muted) line-clamp-2 pl-8">
                  {m.audioUrl ? `🎤 ${t("Voice message")}` : (m.text || t("(no text)"))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
