"use client";

/**
 * QueriesBox — surfaces the existing chat infrastructure as a focused
 * "queries" widget on role dashboards. SW is the single point of contact
 * (the "face of the NGO"), so this widget always frames the conversation
 * with that lens:
 *
 *   - Community session  → "Ask your social worker"
 *                          (DM with the assigned SW; quick send box)
 *   - SW session         → "Incoming queries"
 *                          (recent threads, unread first; click to open chat)
 *   - Other staff        → "Ask a social worker"
 *                          (recent SW threads + a "start new" picker)
 *
 * The widget never renders the full chat UI — for that, users follow the
 * "Open Chat →" link to /chat. This keeps the dashboard surface light while
 * still letting CMs fire off a quick query without leaving home.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role =
  | "community" | "socialworker" | "litigation"
  | "hr" | "finance" | "administrator" | "director" | "superadmin" | "pending";

type Participant = { _id: string; name: string; role: Role };
type Conversation = {
  _id: string;
  type: "dm" | "group";
  participants: Participant[];
  /** Group-only — DMs don't have a title. */
  title?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
};

type Contact = { _id: string; name: string; role: Role };

interface Props {
  /** Current session — drives which variant the widget renders. Accepts the
   *  raw string `session.role` from the JWT so callers don't need to narrow. */
  currentUserId: string;
  currentUserRole: string;
  /** Optional title override (defaults vary by role). */
  title?: string;
  /** When true, the box uses a more compact layout — useful for staff
   *  dashboards where it's a side widget rather than a primary surface. */
  compact?: boolean;
}

function fmtRelative(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const ROLE_LABEL: Record<Role, string> = {
  community: "Community", socialworker: "Social Worker", litigation: "Lawyer",
  hr: "HR", finance: "Finance", administrator: "Admin",
  director: "Director", superadmin: "Super Admin", pending: "—",
};

export default function QueriesBox({ currentUserId, currentUserRole, title, compact }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Community-only: composing a quick message inline. Other variants always
  // bounce out to /chat for actual sending — keeps the widget small.
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cRes, uRes, kRes] = await Promise.all([
        fetch("/api/chat/conversations"),
        fetch("/api/chat/unread"),
        fetch("/api/chat/contacts"),
      ]);
      const [cData, uData, kData] = await Promise.all([cRes.json(), uRes.json(), kRes.json()]);
      setConversations(cData.conversations ?? []);
      setUnread(uData.byConversation ?? {});
      setContacts(kData.contacts ?? []);
    } catch {
      setError("Couldn't load queries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /** Other participant in a DM (the user that isn't us). */
  function peer(c: Conversation): Participant | undefined {
    return c.participants.find(p => p._id !== currentUserId);
  }

  // ── COMMUNITY VARIANT ───────────────────────────────────────────────────
  // Prefer the existing DM with a social worker; fall back to "start one"
  // if the community member hasn't messaged anyone yet.
  const swConversation = useMemo(
    () => conversations.find(c => c.type === "dm" && peer(c)?.role === "socialworker"),
    [conversations, currentUserId]
  );
  const firstSwContact = useMemo(
    () => contacts.find(c => c.role === "socialworker"),
    [contacts]
  );

  async function startDmAndSend() {
    if (!draft.trim()) return;
    setSending(true); setSendError("");
    try {
      let convId = swConversation?._id;
      // No existing thread — open one with the first available SW. The
      // server filters contacts by chat permissions, so for community this
      // list is already restricted to social workers.
      if (!convId) {
        if (!firstSwContact) {
          setSendError("No social worker is available right now. Please try again later.");
          return;
        }
        const r = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerId: firstSwContact._id }),
        });
        const d = await r.json();
        if (!r.ok) {
          setSendError(d.error ?? "Couldn't open the chat.");
          return;
        }
        convId = String(d.conversation._id);
      }
      const r = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      if (!r.ok) {
        const d = await r.json();
        setSendError(d.error ?? "Couldn't send your message.");
        return;
      }
      setDraft("");
      load();
    } catch {
      setSendError("Network error.");
    } finally {
      setSending(false);
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────
  const headerTitle = title ?? (
    currentUserRole === "community"     ? "Ask Your Social Worker"
    : currentUserRole === "socialworker" ? "Incoming Queries"
    :                                      "Ask a Social Worker"
  );
  const headerSub = (
    currentUserRole === "community"      ? "Direct line to your SW. Replies usually within 24 hours."
    : currentUserRole === "socialworker"  ? "Messages from community members and the team."
    :                                       "SW is the single contact point — start a thread when you need one."
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border overflow-hidden ${compact ? "" : ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 5%, var(--surface))" }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-(--text)">{headerTitle}</h2>
            {Object.keys(unread).length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                {Object.values(unread).reduce((a, b) => a + b, 0)} new
              </span>
            )}
          </div>
          <p className="text-[11px] text-(--muted) mt-0.5 leading-snug">{headerSub}</p>
        </div>
        <Link href="/chat" className="text-xs font-semibold shrink-0 hover:underline" style={{ color: "var(--accent)" }}>
          Open Chat →
        </Link>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-center text-xs text-(--muted)">Loading…</div>
      ) : error ? (
        <div className="px-5 py-6 text-center text-xs" style={{ color: "var(--error-text)" }}>{error}</div>
      ) : currentUserRole === "community" ? (
        <CommunityVariant
          swConversation={swConversation}
          firstSwContact={firstSwContact}
          peer={swConversation ? peer(swConversation) : undefined}
          unread={swConversation ? unread[swConversation._id] ?? 0 : 0}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          sendError={sendError}
          onSend={startDmAndSend}
        />
      ) : currentUserRole === "socialworker" ? (
        <SwVariant
          conversations={conversations}
          unread={unread}
          peer={peer}
          compact={compact}
        />
      ) : (
        <StaffVariant
          conversations={conversations}
          contacts={contacts}
          unread={unread}
          peer={peer}
          compact={compact}
        />
      )}
    </div>
  );
}

/* ── Community: inline draft + last message preview ────────────────────── */
function CommunityVariant({
  swConversation, firstSwContact, peer, unread, draft, setDraft, sending, sendError, onSend,
}: {
  swConversation?: Conversation;
  firstSwContact?: Contact;
  peer?: Participant;
  unread: number;
  draft: string;
  setDraft: (s: string) => void;
  sending: boolean;
  sendError: string;
  onSend: () => void;
}) {
  // No SW reachable at all — happens before any social worker has been
  // registered in the system. Block the input rather than fail on send.
  if (!swConversation && !firstSwContact) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-sm text-(--muted)">
          No social worker is available right now. Please check back soon — you can also use SOS for emergencies.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
        <p className="text-xs font-semibold text-(--text)">
          {peer?.name ?? firstSwContact?.name}
          <span className="ml-2 text-[10px] font-normal text-(--muted)">Social Worker</span>
          {unread > 0 && (
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {unread} new
            </span>
          )}
        </p>
        {swConversation?.lastMessagePreview ? (
          <p className="text-xs text-(--muted) mt-1 line-clamp-2">
            {swConversation.lastMessagePreview}
            <span className="text-(--muted) ml-2">· {fmtRelative(swConversation.lastMessageAt)}</span>
          </p>
        ) : (
          <p className="text-xs text-(--muted) italic mt-1">No messages yet — say hello below.</p>
        )}
      </div>

      <div>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
          placeholder="Type your question… your social worker will reply."
          className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-(--muted)">
            Replies are private. For emergencies, use <Link href="/community/sos" className="underline" style={{ color: "var(--error)" }}>SOS</Link> instead.
          </p>
          <button type="button" onClick={onSend} disabled={sending || !draft.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {sendError && <p className="text-xs mt-1" style={{ color: "var(--error-text)" }}>{sendError}</p>}
      </div>
    </div>
  );
}

/* ── SW: incoming threads list, unread first ──────────────────────────── */
function SwVariant({
  conversations, unread, peer, compact,
}: {
  conversations: Conversation[];
  unread: Record<string, number>;
  peer: (c: Conversation) => Participant | undefined;
  compact?: boolean;
}) {
  // Sort: any unread first (highest count), then most-recent message first.
  const sorted = [...conversations].sort((a, b) => {
    const ua = unread[a._id] ?? 0;
    const ub = unread[b._id] ?? 0;
    if (ua !== ub) return ub - ua;
    const ta = new Date(a.lastMessageAt ?? 0).getTime();
    const tb = new Date(b.lastMessageAt ?? 0).getTime();
    return tb - ta;
  });
  const visible = sorted.slice(0, compact ? 4 : 8);

  if (visible.length === 0) {
    return <div className="px-5 py-6 text-center text-xs text-(--muted)">No queries yet.</div>;
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
      {visible.map(c => {
        const p = peer(c);
        const u = unread[c._id] ?? 0;
        return (
          <Link key={c._id} href="/chat"
            className="block px-5 py-3 hover:bg-(--bg-secondary) transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-(--text) truncate">
                  {p?.name ?? c.title ?? "Conversation"}
                  {p && (
                    <span className="ml-2 text-[10px] font-normal text-(--muted)">{ROLE_LABEL[p.role] ?? p.role}</span>
                  )}
                </p>
                {c.lastMessagePreview && (
                  <p className="text-xs text-(--muted) truncate mt-0.5">{c.lastMessagePreview}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-(--muted)">{fmtRelative(c.lastMessageAt)}</span>
                {u > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                    {u}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Other staff: recent SW threads + "start new" picker ──────────────── */
function StaffVariant({
  conversations, contacts, unread, peer, compact,
}: {
  conversations: Conversation[];
  contacts: Contact[];
  unread: Record<string, number>;
  peer: (c: Conversation) => Participant | undefined;
  compact?: boolean;
}) {
  const swThreads = conversations.filter(c => peer(c)?.role === "socialworker").slice(0, compact ? 3 : 5);
  const swContacts = contacts.filter(c => c.role === "socialworker");

  return (
    <div className="px-5 py-4 space-y-3">
      {swThreads.length > 0 ? (
        <div className="space-y-1.5">
          {swThreads.map(c => {
            const p = peer(c);
            const u = unread[c._id] ?? 0;
            return (
              <Link key={c._id} href="/chat"
                className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-(--bg-secondary) transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-(--text) truncate">{p?.name}</p>
                  {c.lastMessagePreview && (
                    <p className="text-xs text-(--muted) truncate">{c.lastMessagePreview}</p>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] text-(--muted)">{fmtRelative(c.lastMessageAt)}</span>
                  {u > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                      {u}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-(--muted)">No SW threads yet.</p>
      )}

      {swContacts.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1.5">Start new</p>
          <div className="flex flex-wrap gap-1.5">
            {swContacts.slice(0, 6).map(c => (
              <Link key={c._id} href="/chat"
                className="text-xs px-2.5 py-1 rounded-lg border hover:border-(--accent) transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
