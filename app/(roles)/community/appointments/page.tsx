"use client";

import { useEffect, useRef, useState } from "react";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { CommunityCasesTabs } from "@/components/community/SectionTabs";

type UserRef = { _id: string; name: string; email?: string; phone?: string; role?: string };
type Appointment = {
  _id: string;
  reason: string;
  proposedDate: string;
  endDate?: string;
  status: string;
  swNotes?: string;
  litigationNotes?: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: "warn" | "info" | "ok" | "bad" }> = {
  pending_sw:           { label: "Awaiting Social Worker",      tone: "warn" },
  approved_sw:          { label: "Approved — Awaiting Lawyer",  tone: "info" },
  confirmed:            { label: "Confirmed",                    tone: "ok"   },
  confirmed_litigation: { label: "Confirmed",                    tone: "ok"   },
  rejected:             { label: "Rejected",                     tone: "bad"  },
  cancelled:            { label: "Cancelled",                    tone: "bad"  },
  pending:              { label: "Awaiting Response",            tone: "warn" },
};

const TONE_STYLE: Record<string, string> = {
  warn: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
  ok:   "bg-green-100 text-green-700",
  bad:  "bg-red-100 text-red-700",
};

/** Combine the next half-hour boundary as the default proposed time so the
 *  datetime-local input doesn't open at "now" (which we'd reject anyway). */
function defaultDateTime(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (d.getMinutes() === 0) d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Either the social worker already assigned to this community member, or
  // null if none — in which case we expose a search box so they can pick one.
  const [assignedSw, setAssignedSw] = useState<UserRef | null>(null);
  const [pickedSw, setPickedSw] = useState<UserRef | null>(null);

  // Inline social worker search — same UX as the staff booking form, only
  // smaller because community members rarely meet many staff.
  const [swQuery, setSwQuery] = useState("");
  const [swResults, setSwResults] = useState<UserRef[]>([]);
  const swDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form fields
  const [reason, setReason] = useState("");
  const [proposedDate, setProposedDate] = useState(defaultDateTime);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    Promise.all([
      fetch("/api/appointments").then((r) => r.json()).catch(() => ({})),
      fetch("/api/users/me").then((r) => r.json()).catch(() => ({})),
    ]).then(([apts, me]) => {
      setAppointments(apts.appointments ?? []);
      const sw = me?.user?.communityProfile?.assignedSocialWorker;
      if (sw && typeof sw === "object" && sw._id) {
        setAssignedSw(sw as UserRef);
        setPickedSw(sw as UserRef);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (assignedSw) return;
    if (swQuery.trim().length < 2) { setSwResults([]); return; }
    if (swDebounceRef.current) clearTimeout(swDebounceRef.current);
    swDebounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(swQuery)}&role=socialworker`);
      const data = await res.json();
      if (res.ok) setSwResults(data.users ?? []);
    }, 250);
  }, [swQuery, assignedSw]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!pickedSw) { setError("Pick a social worker first."); return; }
    if (reason.trim().length < 5) { setError("Add a brief reason (5+ characters)."); return; }
    if (!proposedDate) { setError("Pick a date and time."); return; }

    const start = new Date(proposedDate);
    if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
      setError("Pick a future time.");
      return;
    }
    const end = new Date(start.getTime() + duration * 60_000);

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          proposedDate: start.toISOString(),
          endDate: end.toISOString(),
          socialWorkerId: pickedSw._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to request appointment.");
        return;
      }
      setAppointments((prev) => [data.appointment, ...prev]);
      setSuccess(`Request sent to ${pickedSw.name}. They'll be in touch.`);
      setShowForm(false);
      setReason("");
      setProposedDate(defaultDateTime());
      setDuration(30);
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <CommunityCasesTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(text)">Appointments</h1>
          <p className="text-sm text-(muted) mt-1">
            Request a meeting with your social worker. They&apos;ll confirm the time and route you to a lawyer if needed.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="px-4 py-2 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ Request"}
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-(surface) rounded-2xl border border-(border) p-5 space-y-4">
          <h2 className="font-semibold text-(text)">New Appointment Request</h2>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {/* Social worker — assigned by default, switchable when none */}
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Social worker <span className="text-red-500">*</span>
            </label>
            {assignedSw ? (
              <div className="rounded-xl border border-(border) bg-(bg) px-3.5 py-2.5 text-sm">
                <p className="font-medium text-(text)">{assignedSw.name}</p>
                {assignedSw.email && <p className="text-xs text-(muted) mt-0.5">{assignedSw.email}</p>}
              </div>
            ) : pickedSw ? (
              <div className="rounded-xl border border-(border) bg-(bg) px-3.5 py-2.5 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-(text)">{pickedSw.name}</p>
                  {pickedSw.email && <p className="text-xs text-(muted) mt-0.5">{pickedSw.email}</p>}
                </div>
                <button type="button" onClick={() => { setPickedSw(null); setSwQuery(""); }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-(--bg-secondary, #f3f4f6) text-(muted) shrink-0">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Type at least 2 letters of a social worker's name"
                  value={swQuery}
                  onChange={(e) => setSwQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
                />
                {swResults.length > 0 && (
                  <ul className="mt-2 rounded-xl border border-(border) divide-y overflow-hidden">
                    {swResults.map((u) => (
                      <li key={u._id}>
                        <button type="button"
                          onClick={() => { setPickedSw(u); setSwResults([]); setSwQuery(""); }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-(--bg-secondary, #f3f4f6) transition-colors">
                          <p className="text-sm font-medium text-(text)">{u.name}</p>
                          {u.email && <p className="text-xs text-(muted)">{u.email}</p>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-(muted) mt-1">
                  No social worker assigned yet — search for one and we&apos;ll route the request to them.
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What do you need to discuss?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 resize-none placeholder:text-(muted)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-(text) mb-1.5">
                Date &amp; time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(text) mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border divide-y divide-(--border)"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><SkeletonRow trailing={true} /></div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-(muted) text-sm">No appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const s = STATUS_LABELS[apt.status] ?? { label: apt.status, tone: "warn" as const };
            return (
              <div key={apt._id} className="bg-(surface) rounded-2xl border border-(border) p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-(text)">{apt.reason}</p>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${TONE_STYLE[s.tone]}`}>{s.label}</span>
                </div>
                <p className="text-xs text-(muted)">
                  Proposed: {new Date(apt.proposedDate).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                {apt.swNotes && (
                  <p className="text-xs text-(muted) mt-1">Social Worker note: {apt.swNotes}</p>
                )}
                {apt.litigationNotes && (
                  <p className="text-xs text-(muted) mt-1">Lawyer note: {apt.litigationNotes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
