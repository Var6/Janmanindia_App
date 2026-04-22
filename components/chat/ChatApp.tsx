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
  editedAt?: string;
  sender: { _id: string; name: string; role: string };
}

interface Props {
  currentUserId: string;
  currentUserName: string;
}

const POLL_MS_FOCUSED = 4000;
const POLL_MS_HIDDEN  = 30000; // back off when tab hidden

export default function ChatApp({ currentUserId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const lastTsRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef(true);

  // Initial load
  useEffect(() => {
    fetch("/api/chat/conversations").then((r) => r.json()).then((d) => setConversations(d.conversations ?? []));
  }, []);

  // Lazy load contacts only when user opens the picker
  useEffect(() => {
    if (showContacts && contacts.length === 0) {
      fetch("/api/chat/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts ?? []));
    }
  }, [showContacts, contacts.length]);

  // Track tab visibility for polling cadence
  useEffect(() => {
    const onVis = () => { focusedRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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

  // Poll active conversation, slowing down when tab hidden
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    lastTsRef.current = null;
    setEditingId(null);
    loadMessages(activeId);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (activeId && lastTsRef.current) loadMessages(activeId, lastTsRef.current);
      timer = setTimeout(tick, focusedRef.current ? POLL_MS_FOCUSED : POLL_MS_HIDDEN);
    };
    timer = setTimeout(tick, POLL_MS_FOCUSED);
    return () => { if (timer) clearTimeout(timer); };
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
    } finally { setSending(false); }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this conversation? All messages are removed for both sides.")) return;
    const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed");
      return;
    }
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function saveEdit(id: string) {
    const newText = editText.trim();
    if (!newText) return;
    const res = await fetch(`/api/chat/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed");
      return;
    }
    const d = await res.json();
    setMessages((prev) => prev.map((m) => m._id === id ? { ...m, text: d.message.text, editedAt: d.message.editedAt } : m));
    setEditingId(null);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/chat/messages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed");
      return;
    }
    setMessages((prev) => prev.filter((m) => m._id !== id));
  }

  function peerOf(c: Conversation): User | undefined {
    return c.participants.find((p) => p._id !== currentUserId);
  }

  const active = conversations.find((c) => c._id === activeId);
  const activePeer = active ? peerOf(active) : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 h-[calc(100vh-160px)]">
      {/* Sidebar */}
      <aside className="rounded-xl border border-(--border) bg-(--surface) overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b border-(--border) flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-(--muted)">
            {showContacts ? "Start chat" : "Chats"}
          </p>
          <button onClick={() => setShowContacts(!showContacts)}
            className="text-xs px-2 py-0.5 rounded-md text-(--accent-contrast) font-bold"
            style={{ background: "var(--accent)" }}>
            {showContacts ? "✕" : "＋"}
          </button>
        </div>

        {showContacts ? (
          <div className="overflow-y-auto flex-1">
            {contacts.length === 0 ? (
              <p className="px-3 py-6 text-xs text-center text-(--muted)">Loading…</p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {contacts.map((u) => (
                  <li key={u._id}>
                    <button onClick={() => openConvWith(u._id)}
                      className="w-full px-3 py-2 text-left hover:bg-(--accent-subtle) transition-colors flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-(--text) truncate">{u.name}</p>
                        <p className="text-[10px] text-(--muted) capitalize truncate">{u.role}</p>
                      </div>
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
                No chats yet — tap <strong>＋</strong>.
              </p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {conversations.map((c) => {
                  const peer = peerOf(c);
                  const isActive = c._id === activeId;
                  return (
                    <li key={c._id} className="relative group">
                      <button onClick={() => setActiveId(c._id)}
                        className="w-full px-3 py-2.5 text-left transition-colors flex items-start gap-2"
                        style={{ background: isActive ? "var(--accent-subtle)" : "transparent" }}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                          {initials(peer?.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <p className="text-sm font-semibold text-(--text) truncate">{peer?.name ?? "Unknown"}</p>
                            {c.lastMessageAt && (
                              <span className="text-[10px] text-(--muted) shrink-0">
                                {timeAgo(c.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          {c.lastMessagePreview ? (
                            <p className="text-xs text-(--muted) truncate mt-0.5">{c.lastMessagePreview}</p>
                          ) : (
                            <p className="text-[10px] text-(--muted) capitalize mt-0.5">{peer?.role}</p>
                          )}
                        </div>
                      </button>
                      <button onClick={(e) => deleteConversation(c._id, e)}
                        title="Delete chat"
                        className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center text-xs"
                        style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                        ✕
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
      <section className="rounded-xl border border-(--border) bg-(--surface) flex flex-col overflow-hidden">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm text-(--muted)">Pick a conversation or start a new one.</p>
          </div>
        ) : (
          <>
            <header className="px-4 py-2.5 border-b border-(--border) flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                {initials(activePeer?.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-(--text) truncate">{activePeer?.name ?? "Conversation"}</p>
                <p className="text-[10px] text-(--muted) capitalize">{activePeer?.role}</p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {messages.length === 0 ? (
                <p className="text-xs text-center text-(--muted) py-6">No messages yet.</p>
              ) : messages.map((m, i) => {
                const mine = m.sender._id === currentUserId;
                const prev = messages[i - 1];
                const grouped = prev && prev.sender._id === m.sender._id && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 60_000;
                const isEditing = editingId === m._id;
                return (
                  <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                    <div className="max-w-[78%] flex items-end gap-1">
                      {mine && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                          <button onClick={() => { setEditingId(m._id); setEditText(m.text); }}
                            title="Edit" className="text-[10px] px-1.5 py-0.5 rounded border border-(--border) text-(--muted) hover:text-(--text)">
                            ✎
                          </button>
                          <button onClick={() => deleteMessage(m._id)}
                            title="Delete" className="text-[10px] px-1.5 py-0.5 rounded text-(--error-text)"
                            style={{ background: "var(--error-bg)" }}>
                            ✕
                          </button>
                        </div>
                      )}
                      <div className={`rounded-2xl px-3 py-1.5 ${grouped ? "rounded-tl-md rounded-tr-md" : ""}`}
                        style={mine
                          ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                          : { background: "var(--bg)", color: "var(--text)" }}>
                        {!mine && !grouped && (
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">
                            {m.sender.name}
                          </p>
                        )}
                        {isEditing ? (
                          <div className="space-y-1">
                            <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                              rows={2} maxLength={4000}
                              className="w-full px-2 py-1 text-sm rounded border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none" />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingId(null)}
                                className="text-[10px] px-2 py-0.5 rounded border border-(--border) text-(--text)" style={{ background: "var(--bg)" }}>
                                Cancel
                              </button>
                              <button onClick={() => saveEdit(m._id)}
                                className="text-[10px] px-2 py-0.5 rounded font-semibold text-(--accent-contrast)"
                                style={{ background: "var(--accent)" }}>
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                            <p className="text-[10px] opacity-60 mt-0.5 text-right">
                              {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {m.editedAt && " · edited"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} className="p-2 border-t border-(--border) flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…" disabled={sending} maxLength={4000}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
              <button type="submit" disabled={sending || !text.trim()}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-40"
                style={{ background: "var(--accent)" }}>
                ➤
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
