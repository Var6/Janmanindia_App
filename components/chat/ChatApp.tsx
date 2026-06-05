"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

interface User { _id: string; name: string; role: string; employeeId?: string }
interface Conversation {
  _id: string;
  type: "dm" | "group";
  title?: string;
  participants: User[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
}
interface Message {
  _id: string;
  text: string;
  audioUrl?: string;
  audioDurationSec?: number;
  caseRef?: { case: string; caseNumber: string; caseTitle: string };
  createdAt: string;
  editedAt?: string;
  sender: { _id: string; name: string; role: string };
}

interface CaseOption { id: string; caseNumber: string; caseTitle: string }

interface Props {
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
}

const POLL_MS_FOCUSED = 4000;
const POLL_MS_HIDDEN  = 30000; // back off when tab hidden

export default function ChatApp({ currentUserId, currentUserRole }: Props) {
  const t = useT();
  // Community members can only DM their assigned social worker — group
  // chats are a staff coordination tool and aren't exposed to them.
  const canCreateGroups = currentUserRole !== "community";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  // "dm" = clicking a contact starts a 1:1 chat; "group" = checkboxes
  // accumulate into a multi-select with a title field at the bottom.
  const [composeMode, setComposeMode] = useState<"dm" | "group">("dm");
  const [groupSelected, setGroupSelected] = useState<Set<string>>(new Set());
  const [groupTitle, setGroupTitle] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  // Attach-a-case-for-discussion picker.
  const [attachedCase, setAttachedCase] = useState<CaseOption | null>(null);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [caseOptions, setCaseOptions] = useState<CaseOption[] | null>(null);
  const [caseQuery, setCaseQuery] = useState("");

  function caseHref(id: string): string {
    switch (currentUserRole) {
      case "litigation": return `/litigation/cases/${id}`;
      case "director":
      case "superadmin":
      case "administrator": return `/director/cases/${id}`;
      case "socialworker": return `/socialworker/cases/${id}`;
      case "community": return `/community/case-tracker/${id}`;
      default: return "";
    }
  }

  async function loadCaseOptions() {
    if (caseOptions) return;
    try {
      const res = await fetch("/api/cases?limit=100");
      const d = await res.json();
      setCaseOptions((d.cases ?? []).map((c: { _id: string; caseNumber?: string; courtCaseNumber?: string; caseTitle?: string }) => ({
        id: String(c._id),
        caseNumber: c.courtCaseNumber || c.caseNumber || "",
        caseTitle: c.caseTitle || "",
      })));
    } catch { setCaseOptions([]); }
  }
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
    // Mark conversation as read so the sidebar badge clears
    fetch(`/api/chat/conversations/${activeId}/read`, { method: "POST" }).catch(() => {});

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
      alert(d.error ?? t("Failed to start chat"));
      return;
    }
    const d = await res.json();
    const conv = d.conversation as Conversation;
    setConversations((prev) => prev.some((c) => c._id === conv._id) ? prev : [conv, ...prev]);
    setActiveId(conv._id);
    setShowContacts(false);
  }

  function toggleGroupMember(id: string) {
    setGroupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetCompose() {
    setComposeMode("dm");
    setGroupSelected(new Set());
    setGroupTitle("");
  }

  async function createGroup() {
    if (groupSelected.size === 0 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: Array.from(groupSelected),
          title: groupTitle.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? t("Failed to create group"));
        return;
      }
      const d = await res.json();
      const conv = d.conversation as Conversation;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv._id);
      setShowContacts(false);
      resetCompose();
    } finally {
      setCreatingGroup(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || sending || (!text.trim() && !attachedCase)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          ...(attachedCase ? { caseRef: { caseId: attachedCase.id, caseNumber: attachedCase.caseNumber, caseTitle: attachedCase.caseTitle } } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? t("Send failed"));
      } else {
        const d = await res.json();
        setMessages((prev) => [...prev, d.message]);
        lastTsRef.current = d.message.createdAt;
        setText("");
        setAttachedCase(null);
        setCasePickerOpen(false);
      }
    } finally { setSending(false); }
  }

  async function sendVoice(audioUrl: string, durationSec: number) {
    if (!activeId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl, audioDurationSec: durationSec, text: "" }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? t("Voice send failed"));
      } else {
        const d = await res.json();
        setMessages((prev) => [...prev, d.message]);
        lastTsRef.current = d.message.createdAt;
      }
    } finally { setSending(false); }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t("Delete this conversation? All messages are removed for both sides."))) return;
    const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? t("Failed"));
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
      alert(d.error ?? t("Failed"));
      return;
    }
    const d = await res.json();
    setMessages((prev) => prev.map((m) => m._id === id ? { ...m, text: d.message.text, editedAt: d.message.editedAt } : m));
    setEditingId(null);
  }

  async function deleteMessage(id: string) {
    if (!confirm(t("Delete this message?"))) return;
    const res = await fetch(`/api/chat/messages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? t("Failed"));
      return;
    }
    setMessages((prev) => prev.filter((m) => m._id !== id));
  }

  function peerOf(c: Conversation): User | undefined {
    return c.participants.find((p) => p._id !== currentUserId);
  }

  /** Display label for a conversation row / header — peer name for DMs,
   *  the explicit group title (or a comma-joined member list) for groups. */
  function convLabel(c: Conversation & { title?: string }): string {
    if (c.type === "group") {
      if (c.title) return c.title;
      const others = c.participants.filter((p) => p._id !== currentUserId);
      const names = others.slice(0, 3).map((p) => p.name.split(" ")[0]).join(", ");
      return others.length > 3 ? `${names} +${others.length - 3}` : names || t("Group");
    }
    return peerOf(c)?.name ?? t("Unknown");
  }

  function convSubtitle(c: Conversation): string {
    if (c.type === "group") {
      return `${c.participants.length} members`;
    }
    return peerOf(c)?.role ?? "";
  }

  const active = conversations.find((c) => c._id === activeId) as (Conversation & { title?: string }) | undefined;
  const activePeer = active && active.type === "dm" ? peerOf(active) : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 h-[calc(100vh-160px)]">
      {/* Sidebar */}
      <aside className="rounded-xl border border-(--border) bg-(--surface) overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b border-(--border) flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-(--muted)">
            {showContacts ? (composeMode === "group" ? t("New group") : t("Start chat")) : t("Chats")}
          </p>
          {currentUserRole !== "community" && (
            <button onClick={() => { if (showContacts) resetCompose(); setShowContacts(!showContacts); }}
              className="text-xs px-2 py-0.5 rounded-md text-(--accent-contrast) font-bold"
              style={{ background: "var(--accent)" }}>
              {showContacts ? "✕" : "＋"}
            </button>
          )}
        </div>

        {showContacts ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mode toggle — hidden for community since they can only DM
                their assigned social worker. */}
            {canCreateGroups && (
              <div className="px-3 pt-2 pb-2 flex gap-1">
                {(["dm", "group"] as const).map((m) => (
                  <button key={m} onClick={() => { setComposeMode(m); if (m === "dm") setGroupSelected(new Set()); }}
                    className="flex-1 text-xs px-2 py-1.5 rounded-md font-semibold transition-colors"
                    style={{
                      background: composeMode === m ? "var(--accent)" : "var(--bg)",
                      color: composeMode === m ? "var(--accent-contrast)" : "var(--muted)",
                      border: "1px solid var(--border)",
                    }}>
                    {m === "dm" ? t("Direct") : t("Group")}
                  </button>
                ))}
              </div>
            )}

            {/* Group meta — title + selected count + create button */}
            {composeMode === "group" && (
              <div className="px-3 pb-2 space-y-2 border-b border-(--border)">
                <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder={t("Group name (optional)")} maxLength={80}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-(--muted)">
                    {groupSelected.size === 0 ? t("Pick members below") : `${groupSelected.size} selected`}
                  </p>
                  <button onClick={createGroup} disabled={groupSelected.size === 0 || creatingGroup}
                    className="text-[11px] px-2.5 py-1 rounded-md font-bold disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    {creatingGroup ? t("Creating…") : t("Create group")}
                  </button>
                </div>
              </div>
            )}

            {/* Contacts list */}
            <div className="overflow-y-auto flex-1">
              {contacts.length === 0 ? (
                <ul className="divide-y divide-(--border)">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="px-3 py-2"><SkeletonRow trailing={false} /></li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y divide-(--border)">
                  {contacts.map((u) => {
                    const checked = groupSelected.has(u._id);
                    return (
                      <li key={u._id}>
                        <button onClick={() => composeMode === "group" ? toggleGroupMember(u._id) : openConvWith(u._id)}
                          className="w-full px-3 py-2 text-left hover:bg-(--accent-subtle) transition-colors flex items-center gap-2"
                          style={composeMode === "group" && checked ? { background: "var(--accent-subtle)" } : undefined}>
                          {composeMode === "group" && (
                            <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                              style={{
                                background: checked ? "var(--accent)" : "transparent",
                                borderColor: checked ? "var(--accent)" : "var(--border)",
                                color: "var(--accent-contrast)",
                              }}>
                              {checked && <span className="text-[10px] leading-none">✓</span>}
                            </span>
                          )}
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
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-xs text-center text-(--muted)">
                {t("No chats yet — tap")} <strong>＋</strong>.
              </p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {conversations.map((c) => {
                  const isActive = c._id === activeId;
                  const label = convLabel(c);
                  const subtitle = convSubtitle(c);
                  const isGroup = c.type === "group";
                  return (
                    <li key={c._id} className="relative group">
                      <button onClick={() => setActiveId(c._id)}
                        className="w-full px-3 py-2.5 text-left transition-colors flex items-start gap-2"
                        style={{ background: isActive ? "var(--accent-subtle)" : "transparent" }}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                          {isGroup ? "👥" : initials(label)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <p className="text-sm font-semibold text-(--text) truncate">{label}</p>
                            {c.lastMessageAt && (
                              <span className="text-[10px] text-(--muted) shrink-0">
                                {timeAgo(c.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          {c.lastMessagePreview ? (
                            <p className="text-xs text-(--muted) truncate mt-0.5">{c.lastMessagePreview}</p>
                          ) : (
                            <p className="text-[10px] text-(--muted) capitalize mt-0.5">{subtitle}</p>
                          )}
                        </div>
                      </button>
                      <button onClick={(e) => deleteConversation(c._id, e)}
                        title={t("Delete chat")}
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
            <p className="text-sm text-(--muted)">{t("Pick a conversation or start a new one.")}</p>
          </div>
        ) : (
          <>
            <header className="px-4 py-2.5 border-b border-(--border) flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                {active?.type === "group" ? "👥" : initials(activePeer?.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-(--text) truncate">
                  {active ? convLabel(active) : t("Conversation")}
                </p>
                <p className="text-[10px] text-(--muted) capitalize truncate">
                  {active?.type === "group"
                    ? active.participants.map((p) => p.name).join(", ")
                    : activePeer?.role}
                </p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {messages.length === 0 ? (
                <p className="text-xs text-center text-(--muted) py-6">{t("No messages yet.")}</p>
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
                            title={t("Edit")} className="text-[10px] px-1.5 py-0.5 rounded border border-(--border) text-(--muted) hover:text-(--text)">
                            ✎
                          </button>
                          <button onClick={() => deleteMessage(m._id)}
                            title={t("Delete")} className="text-[10px] px-1.5 py-0.5 rounded text-(--error-text)"
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
                                {t("Cancel")}
                              </button>
                              <button onClick={() => saveEdit(m._id)}
                                className="text-[10px] px-2 py-0.5 rounded font-semibold text-(--accent-contrast)"
                                style={{ background: "var(--accent)" }}>
                                {t("Save")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {m.audioUrl && (
                              <audio controls preload="metadata" src={m.audioUrl}
                                className="block max-w-full mb-1" style={{ minWidth: "12rem" }} />
                            )}
                            {m.caseRef?.case && (() => {
                              const href = caseHref(m.caseRef.case);
                              const inner = (
                                <span className="flex items-center gap-2">
                                  <span className="text-base leading-none">📎</span>
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold truncate">{m.caseRef!.caseTitle || t("Case")}</span>
                                    {m.caseRef!.caseNumber && <span className="block text-[10px] font-mono opacity-70">{m.caseRef!.caseNumber}</span>}
                                  </span>
                                </span>
                              );
                              return href
                                ? <a href={href} className="block mb-1 px-2.5 py-1.5 rounded-lg border hover:opacity-90" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>{inner}</a>
                                : <div className="block mb-1 px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>{inner}</div>;
                            })()}
                            {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                            <p className="text-[10px] opacity-60 mt-0.5 text-right">
                              {m.audioUrl && typeof m.audioDurationSec === "number" && `🎤 ${m.audioDurationSec}s · `}
                              {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {m.editedAt && ` · ${t("edited")}`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} className="p-2 border-t border-(--border) space-y-2">
              {/* Attached case chip */}
              {attachedCase && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg)", borderColor: "var(--accent)" }}>
                  <span>📎</span>
                  <span className="flex-1 min-w-0 truncate text-(--text)">
                    <span className="font-mono font-semibold">{attachedCase.caseNumber}</span>
                    {attachedCase.caseTitle && <span className="text-(--muted)"> · {attachedCase.caseTitle}</span>}
                  </span>
                  <button type="button" onClick={() => setAttachedCase(null)} className="text-(--muted) hover:text-(--text)" title={t("Remove")}>✕</button>
                </div>
              )}

              {/* Case picker */}
              {casePickerOpen && (
                <div className="rounded-lg border p-2 space-y-2" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <input value={caseQuery} onChange={(e) => setCaseQuery(e.target.value)} autoFocus
                    placeholder={t("Search a case to attach…")}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-(--border) bg-(--surface) text-(--text) focus:outline-none" />
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {caseOptions === null ? (
                      <p className="text-xs text-(--muted) px-1 py-2">{t("Loading…")}</p>
                    ) : (
                      caseOptions
                        .filter((c) => `${c.caseNumber} ${c.caseTitle}`.toLowerCase().includes(caseQuery.trim().toLowerCase()))
                        .slice(0, 12)
                        .map((c) => (
                          <button key={c.id} type="button"
                            onClick={() => { setAttachedCase(c); setCasePickerOpen(false); setCaseQuery(""); }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-(--surface)">
                            <span className="font-mono font-semibold text-(--accent)">{c.caseNumber || "—"}</span>
                            <span className="text-(--text)"> · {c.caseTitle}</span>
                          </button>
                        ))
                    )}
                    {caseOptions && caseOptions.length === 0 && <p className="text-xs text-(--muted) px-1 py-2">{t("No cases available.")}</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <VoiceRecorder compact disabled={sending} onUploaded={sendVoice} />
                <button type="button" onClick={() => { setCasePickerOpen((o) => !o); loadCaseOptions(); }} disabled={sending}
                  title={t("Attach a case")}
                  className="px-2.5 py-2 rounded-lg border border-(--border) text-(--muted) hover:text-(--text) hover:border-(--accent) disabled:opacity-40"
                  style={{ background: casePickerOpen ? "var(--bg-secondary)" : "var(--bg)" }}>
                  📎
                </button>
                <input value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={t("Type a message or tap 🎤 to record…")} disabled={sending} maxLength={4000}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
                <button type="submit" disabled={sending || (!text.trim() && !attachedCase)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-40"
                  style={{ background: "var(--accent)" }}>
                  ➤
                </button>
              </div>
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
