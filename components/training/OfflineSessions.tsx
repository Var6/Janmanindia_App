"use client";

import { useEffect, useState } from "react";

type Session = {
  _id: string;
  title: string;
  description: string;
  topics: string[];
  venue: string;
  district?: string;
  date: string;
  endDate?: string;
  capacity: number;
  facilitators?: string;
  targetAudience?: string;
  language?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  highlights?: string;
  conductedBy?: { _id: string; name: string };
  enrollments: { _id: string; user: { _id: string; name: string } | string; enrolledAt: string; attended?: boolean }[];
  createdAt: string;
};

interface Props {
  currentUserId: string;
  canCreate: boolean;
}

export default function OfflineSessions({ currentUserId, canCreate }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/training-sessions?upcoming=true");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      description: fd.get("description"),
      topics: String(fd.get("topics") ?? "").split(",").map(s => s.trim()).filter(Boolean),
      venue: fd.get("venue"),
      district: fd.get("district") || undefined,
      date: fd.get("date"),
      endDate: fd.get("endDate") || undefined,
      capacity: Number(fd.get("capacity") || 30),
      facilitators: fd.get("facilitators") || undefined,
      targetAudience: fd.get("targetAudience") || undefined,
      language: fd.get("language") || undefined,
    };
    try {
      const res = await fetch("/api/training-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnroll(s: Session) {
    const enrolled = s.enrollments.some(e => (typeof e.user === "string" ? e.user : e.user?._id) === currentUserId);
    setBusy(true);
    try {
      const res = await fetch(`/api/training-sessions/${s._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: enrolled ? "unenroll" : "enroll" }),
      });
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-(--text) flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-full items-center justify-center text-base"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>📍</span>
            Live & Offline Sessions
          </h2>
          <p className="text-sm text-(--muted) mt-1">
            Hands-on training in your district — scheduled by social workers. Enroll early, seats are limited.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(s => !s)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: showForm ? "var(--bg-secondary)" : "var(--accent)", color: showForm ? "var(--muted)" : "var(--accent-contrast)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            {showForm ? "Cancel" : "+ Schedule Offline Session"}
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <form onSubmit={createSession} className="rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
          <input name="title" required maxLength={200} placeholder="Session title (e.g. 'Know Your Rights — Women's Safety Workshop')"
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <textarea name="description" required rows={2} placeholder="Hook the audience — what will they learn? Why does it matter?"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="venue" required placeholder="Venue (e.g. Janman Office, Patna)"
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="district" placeholder="District"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="date" type="datetime-local" required
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="endDate" type="datetime-local" placeholder="End"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="capacity" type="number" min={1} defaultValue={30} placeholder="Seats"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <input name="topics" placeholder="Topics (comma-separated, e.g. RTI, MGNREGA, FIR)"
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="facilitators" placeholder="Co-facilitators (optional)"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input name="targetAudience" placeholder="Target audience (e.g. Women, ages 18+)"
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <input name="language" placeholder="Language (default: Hindi & English)"
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button type="submit" disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {busy ? "Scheduling…" : "Schedule Session"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-(--muted)">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">🗓</p>
          <p className="text-sm text-(--muted)">No offline sessions scheduled yet. {canCreate ? "Be the first — schedule one above." : "Check back soon."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map(s => {
            const enrolled = s.enrollments.some(e => (typeof e.user === "string" ? e.user : e.user?._id) === currentUserId);
            const seatsLeft = s.capacity - s.enrollments.length;
            const startDate = new Date(s.date);
            return (
              <div key={s._id} className="rounded-2xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: enrolled ? "var(--accent)" : "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-(--text) leading-tight">{s.title}</p>
                    <p className="text-xs text-(--muted) mt-1">
                      {startDate.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {s.endDate && ` – ${new Date(s.endDate).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0"
                    style={{
                      background: seatsLeft <= 5 ? "var(--warning-bg)" : "var(--success-bg)",
                      color: seatsLeft <= 5 ? "var(--warning-text)" : "var(--success-text)",
                    }}>
                    {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
                  </span>
                </div>

                <p className="text-sm text-(--text) leading-relaxed">{s.description}</p>

                {s.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.topics.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-(--muted)">
                  <div>📍 <span className="text-(--text)">{s.venue}{s.district ? `, ${s.district}` : ""}</span></div>
                  <div>👤 <span className="text-(--text)">{s.conductedBy?.name ?? "TBA"}</span></div>
                  {s.targetAudience && <div className="col-span-2">🎯 <span className="text-(--text)">{s.targetAudience}</span></div>}
                  {s.language && <div className="col-span-2">🗣 {s.language}</div>}
                </div>

                <button onClick={() => toggleEnroll(s)} disabled={busy || (!enrolled && seatsLeft === 0)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: enrolled ? "var(--bg-secondary)" : "var(--accent)",
                    color: enrolled ? "var(--text)" : "var(--accent-contrast)",
                    boxShadow: enrolled ? undefined : "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}>
                  {enrolled ? "✓ Enrolled — Tap to leave" : seatsLeft === 0 ? "Session full" : `Enroll Free · Save my seat`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
