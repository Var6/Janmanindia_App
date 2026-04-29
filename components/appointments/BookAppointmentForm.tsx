"use client";

import { useEffect, useRef, useState } from "react";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";

type FoundUser = { _id: string; name: string; email: string; role: string };

const ROLE_OPTIONS = [
  { value: "socialworker", label: "Social Worker" },
  { value: "litigation",   label: "Lawyer / Advocate" },
  { value: "hr",           label: "HR" },
  { value: "finance",      label: "Finance" },
  { value: "community",    label: "Community Member" },
  { value: "director",     label: "Director" },
];

interface Props {
  /** Roles the current user is allowed to search; pass undefined to use defaults. */
  allowedRoles?: string[];
  onCreated?: () => void;
}

export default function BookAppointmentForm({ allowedRoles, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("socialworker");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [picked, setPicked] = useState<FoundUser | null>(null);
  // Optional additional invitees — same search UX as the primary requestee,
  // but multi-select. Selected entries show as removable chips.
  const [coRole, setCoRole]   = useState("socialworker");
  const [coQ, setCoQ]         = useState("");
  const [coResults, setCoResults] = useState<FoundUser[]>([]);
  const [coAttendees, setCoAttendees] = useState<FoundUser[]>([]);
  const [coOpen, setCoOpen]   = useState(false);
  const [proposedDate, setProposedDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // When the API returns a 409 calendar_conflict, it includes a list of
  // alternative slots that work for everyone whose calendar we can read.
  // Stash those so the user can pick one with a single click.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [conflictNames, setConflictNames] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = allowedRoles ? ROLE_OPTIONS.filter(r => allowedRoles.includes(r.value)) : ROLE_OPTIONS;

  useEffect(() => {
    if (!open) return;
    if (q.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&role=${role}`);
      const data = await res.json();
      if (res.ok) setResults(data.users ?? []);
    }, 250);
  }, [q, role, open]);

  useEffect(() => {
    if (!open || !coOpen) return;
    if (coQ.length < 2) { setCoResults([]); return; }
    if (coDebounceRef.current) clearTimeout(coDebounceRef.current);
    coDebounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(coQ)}&role=${coRole}`);
      const data = await res.json();
      if (res.ok) setCoResults(data.users ?? []);
    }, 250);
  }, [coQ, coRole, open, coOpen]);

  function reset() {
    setQ(""); setResults([]); setPicked(null); setProposedDate(""); setReason("");
    setError(""); setSuccess(""); setDuration(30);
    setCoQ(""); setCoResults([]); setCoAttendees([]); setCoOpen(false);
    setSuggestions([]); setConflictNames([]);
  }

  /** Convert an ISO instant (what the API returns) into the local-naïve
   *  string a `<input type="datetime-local">` expects ("YYYY-MM-DDTHH:mm").
   *  We deliberately drop the timezone — the input is local-time, and the
   *  user already saw the same wall-clock when they picked the original. */
  function isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  /** Friendly display for a suggestion chip — "Wed 4 Apr · 14:30". */
  function formatSuggestion(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  function applySuggestion(iso: string) {
    setProposedDate(isoToLocalInput(iso));
    setSuggestions([]);
    setConflictNames([]);
    setError("");
  }

  function addCoAttendee(u: FoundUser) {
    if (picked && u._id === picked._id) return;
    if (coAttendees.some((x) => x._id === u._id)) return;
    setCoAttendees((prev) => [...prev, u]);
    setCoQ("");
    setCoResults([]);
  }
  function removeCoAttendee(id: string) {
    setCoAttendees((prev) => prev.filter((u) => u._id !== id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) { setError("Choose someone to meet first."); return; }
    if (!proposedDate) { setError("Pick a date and time."); return; }
    if (reason.trim().length < 5) { setError("Add a brief reason (5+ characters)."); return; }
    setBusy(true); setError(""); setSuccess(""); setSuggestions([]); setConflictNames([]);
    try {
      const start = new Date(proposedDate);
      const end = new Date(start.getTime() + duration * 60_000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesteeId: picked._id,
          coAttendeeIds: coAttendees.map((u) => u._id),
          proposedDate: start.toISOString(),
          endDate: end.toISOString(),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Calendar conflict returns slot suggestions — surface those so the
        // user can pick a free time without leaving the form.
        if (res.status === 409 && data?.code === "calendar_conflict" && Array.isArray(data.suggestions)) {
          setError(data.error ?? "Calendar clash — try another slot.");
          setSuggestions(data.suggestions as string[]);
          setConflictNames(Array.isArray(data.conflicts) ? data.conflicts.map((c: { name: string }) => c.name) : []);
          return;
        }
        setError(data.error ?? "Booking failed.");
        return;
      }
      const extra = coAttendees.length > 0
        ? ` and ${coAttendees.length} other${coAttendees.length === 1 ? "" : "s"}`
        : "";
      setSuccess(`Request sent to ${picked.name}${extra}. They'll be notified.`);
      reset();
      setOpen(false);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); reset(); }}
        className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
        + Book Appointment
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-6 space-y-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-(--text)">Book an appointment</h3>
          <p className="text-xs text-(--muted) mt-0.5">
            Find a teammate, propose a time, and we'll check both calendars before sending the request.
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); reset(); }}
          className="text-xs px-2.5 py-1 rounded-lg shrink-0"
          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel</button>
      </div>

      {error && suggestions.length === 0 && (
        <p className="text-xs px-3 py-2 rounded-xl flex items-start gap-2"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </p>
      )}

      {/* Calendar conflict — show the busy person + the next free slots that
          work for everyone whose calendar we can read. One click on a chip
          rewrites the proposed time so the user can submit again. */}
      {suggestions.length > 0 && (
        <div className="rounded-xl border p-3 space-y-2.5"
          style={{ background: "var(--warning-bg)", borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)" }}>
          <div className="flex items-start gap-2 text-xs" style={{ color: "var(--warning-text)" }}>
            <span aria-hidden className="text-base shrink-0">📅</span>
            <div className="space-y-0.5">
              <p className="font-semibold">{conflictNames.length > 0
                ? `${conflictNames.join(", ")} ${conflictNames.length === 1 ? "is" : "are"} busy at that time.`
                : "That slot doesn't work."}</p>
              <p>Pick one of these free slots instead — they work for everyone in this meeting.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((iso) => (
              <button key={iso} type="button" onClick={() => applySuggestion(iso)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-95"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                {formatSuggestion(iso)}
              </button>
            ))}
          </div>
          <button type="button"
            onClick={() => { setSuggestions([]); setConflictNames([]); setError(""); }}
            className="text-[11px] underline" style={{ color: "var(--warning-text)" }}>
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <p className="text-xs px-3 py-2 rounded-xl flex items-start gap-2"
          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
          <span aria-hidden>✓</span>
          <span>{success}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Who do you want to meet?" required htmlFor="appt-role"
          hint="Pick the role first — we'll only search inside that role.">
          <Select id="appt-role" value={role}
            onChange={e => { setRole(e.target.value); setPicked(null); }}>
            {visible.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Search by name or email" htmlFor="appt-q"
          example="Anita Kumar  or  anita@janmanindia.org">
          <Input id="appt-q" value={q}
            onChange={e => { setQ(e.target.value); setPicked(null); }}
            placeholder="Type at least 2 letters" />
        </Field>
      </div>

      {results.length > 0 && !picked && (
        <ul className="rounded-xl border overflow-hidden divide-y -mt-2" style={{ borderColor: "var(--border)" }}>
          {results.map(u => (
            <li key={u._id}>
              <button type="button" onClick={() => { setPicked(u); setQ(u.name); setResults([]); }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-(--bg-secondary) transition-colors">
                <p className="text-sm font-medium text-(--text)">{u.name}</p>
                <p className="text-xs text-(--muted)">{u.email} · {u.role}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3"
          style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-(--accent) font-semibold">Meeting with</p>
            <p className="text-sm font-semibold text-(--text) mt-0.5">{picked.name}</p>
            <p className="text-xs text-(--muted)">{picked.email} · {picked.role}</p>
          </div>
          <button type="button" onClick={() => { setPicked(null); setQ(""); }}
            className="text-xs px-2.5 py-1 rounded-lg shrink-0"
            style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Change</button>
        </div>
      )}

      {/* Optional co-attendees — collapsed by default so the form stays simple
          for 1:1 meetings; expand to make it a group meeting. */}
      <Field label="Also invite"
        hint="Add anyone else who should be on this call. Each person gets a Google Calendar invite.">
        <div className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => setCoOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-(--muted) hover:text-(--text) transition-colors">
            <span>
              {coAttendees.length === 0
                ? <span className="italic">No one extra — keep it 1-on-1</span>
                : <span className="font-semibold text-(--text)">{coAttendees.length} other{coAttendees.length === 1 ? "" : "s"} invited</span>}
            </span>
            <span className="opacity-60">{coOpen ? "▲" : "▼"}</span>
          </button>
          {coOpen && (
            <div className="border-t px-3.5 py-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              {coAttendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {coAttendees.map((u) => (
                    <span key={u._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
                      style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                      {u.name}
                      <button type="button" onClick={() => removeCoAttendee(u._id)}
                        aria-label={`Remove ${u.name}`}
                        className="text-(--muted) hover:text-(--error) text-base leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={coRole} onChange={(e) => setCoRole(e.target.value)}>
                  {visible.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <Input value={coQ} onChange={(e) => setCoQ(e.target.value)}
                  placeholder="Search by name or email" />
              </div>
              {coResults.length > 0 && (
                <ul className="rounded-xl border overflow-hidden divide-y" style={{ borderColor: "var(--border)" }}>
                  {coResults
                    .filter((u) => u._id !== picked?._id && !coAttendees.some((x) => x._id === u._id))
                    .map((u) => (
                      <li key={u._id}>
                        <button type="button" onClick={() => addCoAttendee(u)}
                          className="w-full text-left px-3.5 py-2 hover:bg-(--bg-secondary) transition-colors">
                          <p className="text-sm font-medium text-(--text)">{u.name}</p>
                          <p className="text-xs text-(--muted)">{u.email} · {u.role}</p>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Field label="Proposed date & time" required htmlFor="appt-when"
            hint="Pick a future slot. We'll auto-check both calendars before sending."
            example="04 Apr 2026, 14:30">
            <Input id="appt-when" type="datetime-local" required
              value={proposedDate} onChange={e => setProposedDate(e.target.value)}
              min={new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16)} />
          </Field>
        </div>
        <Field label="Duration" htmlFor="appt-duration">
          <Select id="appt-duration" value={duration} onChange={e => setDuration(Number(e.target.value))}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
          </Select>
        </Field>
      </div>

      <Field label="Reason" required htmlFor="appt-reason"
        hint="A short note so they know what the meeting is about."
        example="Discuss FIR draft for the SC/ST Act case (community member: Sita Devi)">
        <Textarea id="appt-reason" value={reason} onChange={e => setReason(e.target.value)}
          required rows={3}
          placeholder="What's this meeting about?" />
      </Field>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t"
        style={{ borderColor: "var(--border)" }}>
        <p className="text-[11px] text-(--muted)">
          We'll automatically check both calendars are free before sending.
        </p>
        <button type="submit" disabled={busy}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
