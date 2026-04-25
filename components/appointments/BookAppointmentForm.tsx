"use client";

import { useEffect, useRef, useState } from "react";

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
  const [proposedDate, setProposedDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function reset() {
    setQ(""); setResults([]); setPicked(null); setProposedDate(""); setReason("");
    setError(""); setSuccess(""); setDuration(30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) { setError("Choose someone to meet first."); return; }
    if (!proposedDate) { setError("Pick a date and time."); return; }
    if (reason.trim().length < 5) { setError("Add a brief reason (5+ characters)."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const start = new Date(proposedDate);
      const end = new Date(start.getTime() + duration * 60_000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesteeId: picked._id,
          proposedDate: start.toISOString(),
          endDate: end.toISOString(),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Booking failed."); return; }
      setSuccess(`Request sent to ${picked.name}. They'll be notified.`);
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
    <form onSubmit={submit} className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-(--text)">Book an appointment</h3>
        <button type="button" onClick={() => { setOpen(false); reset(); }}
          className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel</button>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
      {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>{success}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={role} onChange={e => { setRole(e.target.value); setPicked(null); }}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          {visible.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input value={q} onChange={e => { setQ(e.target.value); setPicked(null); }}
          placeholder="Search by name or email…"
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </div>

      {results.length > 0 && !picked && (
        <ul className="rounded-xl border overflow-hidden divide-y" style={{ borderColor: "var(--border)" }}>
          {results.map(u => (
            <li key={u._id}>
              <button type="button" onClick={() => { setPicked(u); setQ(u.name); setResults([]); }}
                className="w-full text-left px-3 py-2 hover:bg-(--bg-secondary) transition-colors">
                <p className="text-sm font-medium text-(--text)">{u.name}</p>
                <p className="text-xs text-(--muted)">{u.email} · {u.role}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div className="rounded-xl border p-3 flex items-center justify-between gap-3"
          style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--text)">{picked.name}</p>
            <p className="text-xs text-(--muted)">{picked.email}</p>
          </div>
          <button type="button" onClick={() => { setPicked(null); setQ(""); }}
            className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Change</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="datetime-local" value={proposedDate} onChange={e => setProposedDate(e.target.value)}
          required className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm"
          min={new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16)}
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        <select value={duration} onChange={e => setDuration(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
        </select>
      </div>

      <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={2}
        placeholder="What's this meeting about?"
        className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />

      <button type="submit" disabled={busy}
        className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {busy ? "Sending…" : "Send Request"}
      </button>
      <p className="text-[11px] text-(--muted)">
        We'll automatically check that both calendars are free for that slot.
      </p>
    </form>
  );
}
