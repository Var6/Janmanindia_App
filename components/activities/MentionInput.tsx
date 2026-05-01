"use client";

import { useEffect, useRef, useState } from "react";

export interface MentionMember {
  _id: string;
  name: string;
  role?: string;
}

interface Props {
  /** Current text in the input. */
  value: string;
  /** People the user is allowed to `@`-reference (assignee + co-assignees). */
  members: MentionMember[];
  /** Fires on every keystroke with the current text and the resolved
   *  mention ids that survived in the text. Caller decides what to do —
   *  typically: keep state, then call onCommit on Enter / blur. */
  onChange: (text: string, mentionIds: string[]) => void;
  /** Fires when the user wants to save (Enter, or external save trigger). */
  onCommit: () => void;
  /** Optional cancel handler — called on Escape. */
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/** Tokenise a string into plain runs and mention runs. A mention is the
 *  literal "@<name>" if and only if `<name>` matches a known member's name
 *  (case-insensitive, exact). This deliberately ignores partial matches so
 *  unfinished typing like "@ri" doesn't get highlighted as a mention. */
export function tokenizeMentions(text: string, members: MentionMember[]): { type: "text" | "mention"; value: string; userId?: string }[] {
  if (!members.length) return [{ type: "text", value: text }];
  // Sort longest-name-first so "@John Doe" wins over "@John" when both exist.
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const out: { type: "text" | "mention"; value: string; userId?: string }[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      // Look for the longest matching member name starting after @.
      const rest = text.slice(i + 1);
      let matched: MentionMember | null = null;
      for (const m of sorted) {
        if (rest.toLowerCase().startsWith(m.name.toLowerCase())) {
          // Make sure the next char (if any) is NOT a name-character so
          // "@John" doesn't accidentally match against "Johnson".
          const next = rest[m.name.length];
          if (!next || /[\s.,!?;:()\[\]{}@\-]/.test(next)) {
            matched = m;
            break;
          }
        }
      }
      if (matched) {
        out.push({ type: "mention", value: `@${matched.name}`, userId: matched._id });
        i += 1 + matched.name.length;
        continue;
      }
    }
    // Plain run — accumulate until the next "@" or end.
    let j = i + 1;
    while (j < text.length && text[j] !== "@") j++;
    out.push({ type: "text", value: text.slice(i, j) });
    i = j;
  }
  return out;
}

/** Read every confirmed mention out of `text` and return the unique user ids,
 *  preserving first-seen order. */
export function extractMentionIds(text: string, members: MentionMember[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of tokenizeMentions(text, members)) {
    if (tok.type === "mention" && tok.userId && !seen.has(tok.userId)) {
      seen.add(tok.userId);
      out.push(tok.userId);
    }
  }
  return out;
}

/** Single-line text input with WhatsApp-style `@`-mention autocomplete.
 *  Shows a dropdown of `members` filtered by the partial name typed after
 *  the most recent `@`, inserts "@Full Name" on selection, and keeps a
 *  mention-id list in sync via onChange. */
export default function MentionInput({
  value, members, onChange, onCommit, onCancel,
  placeholder, autoFocus, className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The state of the @-popover. `start` is the index of the "@" in the text;
  // `query` is the typed partial after it. Null when the popover is closed.
  const [popover, setPopover] = useState<{ start: number; query: string } | null>(null);
  const [highlight, setHighlight] = useState(0);

  // Filter members against the active query. Min 0 chars so a bare "@"
  // shows the full list — handy when there are only a few options.
  const filtered = popover
    ? members.filter((m) => m.name.toLowerCase().includes(popover.query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => { setHighlight(0); }, [popover?.query, popover?.start]);

  /** Inspect the text + caret to decide whether to open / update / close
   *  the popover. The popover is "open" when the caret sits inside an
   *  unbroken `@<word>` run (no spaces between the @ and the caret). */
  function syncPopover(text: string, caret: number) {
    // Walk backwards from the caret looking for "@" or whitespace.
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") {
        // The @ must be at start-of-string or preceded by whitespace —
        // otherwise an email "foo@bar" would trigger the popover.
        if (i === 0 || /\s/.test(text[i - 1])) {
          const query = text.slice(i + 1, caret);
          // Drop the popover if a space snuck into the query — the user has
          // moved past the mention.
          if (/\s/.test(query)) { setPopover(null); return; }
          setPopover({ start: i, query });
          return;
        }
        setPopover(null);
        return;
      }
      if (/\s/.test(ch)) { setPopover(null); return; }
      i--;
    }
    setPopover(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    const caret = e.target.selectionStart ?? text.length;
    syncPopover(text, caret);
    onChange(text, extractMentionIds(text, members));
  }

  function pick(member: MentionMember) {
    if (!popover || !inputRef.current) return;
    const el = inputRef.current;
    const before = value.slice(0, popover.start);
    const after  = value.slice(popover.start + 1 + popover.query.length);
    // Insert "@Full Name " — trailing space so the user can keep typing.
    const insert = `@${member.name} `;
    const next   = before + insert + after;
    setPopover(null);
    onChange(next, extractMentionIds(next, members));
    // Restore caret to right after the inserted mention.
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (popover && filtered.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % filtered.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight((h) => (h - 1 + filtered.length) % filtered.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(filtered[highlight]);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setPopover(null); return; }
    }
    if (e.key === "Enter")  { e.preventDefault(); onCommit(); return; }
    if (e.key === "Escape") { e.preventDefault(); onCancel?.(); return; }
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Close the popover, but defer so a click on a suggestion still
          // fires through.
          setTimeout(() => setPopover(null), 120);
        }}
        placeholder={placeholder}
        className={className ?? "w-full px-2 py-1 rounded-md border text-xs bg-(--surface) focus:outline-none focus:border-(--accent)"}
        style={className ? undefined : { borderColor: "var(--border)" }}
      />
      {popover && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg w-56"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
          {filtered.map((m, i) => (
            <li key={m._id}>
              <button
                type="button"
                // onMouseDown so it fires before the input's onBlur closes the popover.
                onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                onMouseEnter={() => setHighlight(i)}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                style={{ background: i === highlight ? "var(--bg-secondary, #f3f4f6)" : "transparent", color: "var(--text)" }}
              >
                <span className="font-medium truncate">{m.name}</span>
                {m.role && <span className="text-(--muted) text-[10px] uppercase tracking-wide">{m.role}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only renderer that displays the same text the input produced, with
 *  mentions highlighted as small chips. Used on the saved-todo row so a user
 *  can see at a glance who's on the hook for a sub-task. */
export function MentionText({ text, members, struck }: { text: string; members: MentionMember[]; struck?: boolean }) {
  const tokens = tokenizeMentions(text, members);
  return (
    <span className={`text-xs ${struck ? "line-through text-(--muted)" : "text-(--text)"}`}>
      {tokens.map((t, i) =>
        t.type === "mention" ? (
          <span key={i}
            className="inline-block px-1 rounded font-semibold"
            style={{
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              color: "var(--accent)",
            }}>
            {t.value}
          </span>
        ) : (
          <span key={i}>{t.value}</span>
        )
      )}
    </span>
  );
}
