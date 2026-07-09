"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";

interface Notif {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 60_000;

export default function NotificationBell() {
  const t = useT();
  const { toast } = useToast();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const seededRef = useRef(false);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.notifications ?? []);
      setUnread(d.unread ?? 0);
      // Pop a ribbon toast the first time we see unread notifications this session.
      if (!seededRef.current) {
        seededRef.current = true;
        if ((d.unread ?? 0) > 0) {
          toast(`${d.unread} ${t("new notification(s)")}`, "info");
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open && unread > 0) markAllRead(); }}
        title={t("Notifications")}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-(--bg-secondary) transition-colors text-(--muted) hover:text-(--text)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{ background: "#dc2626", color: "#fff" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1.5 z-30 w-80 max-h-96 overflow-y-auto rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
          >
            <p className="px-3 py-2 text-[11px] uppercase tracking-wide font-semibold border-b sticky top-0"
              style={{ color: "var(--muted)", borderColor: "var(--border)", background: "var(--surface)" }}>
              {t("Notifications")}
            </p>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-(--muted)">{t("No notifications.")}</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className="px-3 py-2.5 border-b last:border-b-0 hover:bg-(--bg-secondary) transition-colors"
                    style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm font-semibold text-(--text)">{n.title}</p>
                    {n.body && <p className="text-xs text-(--muted) mt-0.5 leading-snug">{n.body}</p>}
                  </div>
                );
                return n.link
                  ? <a key={n._id} href={n.link} onClick={() => setOpen(false)} className="block">{inner}</a>
                  : <div key={n._id}>{inner}</div>;
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
