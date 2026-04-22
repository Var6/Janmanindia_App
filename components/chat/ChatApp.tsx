"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface User { _id: string; name: string; role: string; employeeId?: string }
interface Conversation {
  _id: string;
  type: "dm" | "group";
  participants: User[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
}
interface Message {
  _id: string;
  text: string;
  createdAt: string;
  sender: { _id: string; name: string; role: string };
}

interface Props {
  currentUserId: string;
  currentUserName: string;
}

const POLL_MS = 3500;

export default function ChatApp({ currentUserId, currentUserName }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const lastTsRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initial load: conversations + allowed contacts
  useEffect(() => {
    fetch("/api/chat/conversations").then((r) => r.json()).then((d) => setConversations(d.conversations ?? []));
    fetch("/api/chat/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts ?? []));
  }, []);

  const loadMessages = useCallback(async (convId: string, after?: string) => {
    const url = after
      ? `/api/chat/conversations/${convId}/messages?after=${encodeURIComponent(after)}`
      : `/api/chat/conversations/${convId}/messages`;
    const res = await fetch(url);
    if (!res.ok) return;
    const d = await res.json();
    const incoming: Message[] = d.messages ?? [];
    if (incoming.length === 0) return;
    if (after) {
      setMessages((prev) => [...prev, ...incoming]);
    } else {
      setMessages(incoming);
    }
    lastTsRef.current = incoming[incoming.length - 1].createdAt;
  }, []);

  // Poll active conversation
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    lastTsRef.current = null;
    loadMessages(activeId);
    const t = setInterval(() => {
      if (activeId && lastTsRef.current) loadMessages(activeId, lastTsRef.current);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function openConvWith(peerId: string) {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerId }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed to start chat");
      return;
    }
    const d = await res.json();
    const conv = d.conversation as Conversation;
    setConversations((prev) => prev.some((c) => c._id === conv._id) ? prev : [conv, ...prev]);
    setActiveId(conv._id);
    setShowContacts(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Send failed");
      } else {
        const d = await res.json();
        setMessages((prev) => [...prev, d.message]);
        lastTsRef.current = d.message.createdAt;
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  function peerOf(c: Conversation): User | undefined {
    return c.participants.find((p) => p._id !== currentUserId);
  }

  const active = conversations.find((c) => c._id === activeId);
  const activePeer = active ? peerOf(active) : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-160px)]">
      {/* Sidebar */}
      <aside className="rounded-2xl border border-(--border) bg-(--surface) overflow-hidden flex flex-col">
        <div className="p-3 border-b border-(--border) flex items-center justify-between">
          <p className="text-sm font-semibold text-(--text)">Conversations</p>
          <button onClick={() => setShowContacts(!showContacts)}
            className="text-xs px-2 py-1 rounded-lg text-(--accent-contrast) font-semibold"
            style={{ background: "var(--accent)" }}>
            {showContacts ? "✕" : "+ New"}
          </button>
        </div>

        {showContacts ? (
          <div className="overflow-y-auto flex-1">
            {contacts.length === 0 ? (
              <p className="px-3 py-6 text-xs text-center text-(--muted)">
                No one available to chat with.
              </p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {contacts.map((u) => (
                  <li key={u._id}>
                    <button onClick={() => openConvWith(u._id)}
                      className="w-full px-3 py-2.5 text-left hover:bg-(--accent-subtle) transition-colors">
                      <p className="text-sm font-medium text-(--text)">{u.name}</p>
                      <p className="text-[11px] text-(--muted) capitalize">
                        {u.role}{u.employeeId ? ` · ${u.employeeId}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-xs text-center text-(--muted)">
                No conversations yet — tap <strong>+ New</strong>.
              </p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {conversations.map((c) => {
                  const peer = peerOf(c);
                  const isActive = c._id === activeId;
                  return (
                    <li key={c._id}>
                      <button onClick={() => setActiveId(c._id)}
                        className="w-full px-3 py-3 text-left transition-colors"
                        style={{ background: isActive ? "var(--accent-subtle)" : "transparent" }}>
                        <div className="flex justify-between items-baseline gap-2">
                          <p className="text-sm font-semibold text-(--text) truncate">
                            {peer?.name ?? "Unknown"}
                          </p>
                          {c.lastMessageAt && (
                            <span className="text-[10px] text-(--muted) shrink-0">
                              {new Date(c.lastMessageAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-(--muted) truncate capitalize">{peer?.role}</p>
                        {c.lastMessagePreview && (
                          <p className="text-xs text-(--muted) truncate mt-0.5">{c.lastMessagePreview}</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* Thread */}
      <section className="rounded-2xl border border-(--border) bg-(--surface) flex flex-col overflow-hidden">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm text-(--muted)">Pick a conversation or start a new one.</p>
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b border-(--border)">
              <p className="text-sm font-semibold text-(--text)">{activePeer?.name ?? "Conversation"}</p>
              <p className="text-[11px] text-(--muted) capitalize">{activePeer?.role}</p>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-xs text-center text-(--muted) py-6">No messages yet — say hi.</p>
              ) : messages.map((m) => {
                const mine = m.sender._id === currentUserId;
                return (
                  <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[78%] rounded-2xl px-3 py-2"
                      style={mine
                        ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                        : { background: "var(--bg-secondary, #f3f4f6)", color: "var(--text)" }}>
                      {!mine && (
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">
                          {m.sender.name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                      <p className="text-[10px] opacity-60 mt-0.5 text-right">
                        {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} className="p-3 border-t border-(--border) flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${activePeer?.name ?? ""}…`} disabled={sending}
                maxLength={4000}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
              <button type="submit" disabled={sending || !text.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-50"
                style={{ background: "var(--accent)" }}>
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
