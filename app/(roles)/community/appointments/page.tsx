"use client";

import { useState, useEffect } from "react";

type Appointment = {
  _id: string;
  reason: string;
  proposedDate: string;
  status: string;
  swNotes?: string;
  litigationNotes?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_sw: { label: "Awaiting Social Worker", color: "bg-yellow-100 text-yellow-700" },
  approved_sw: { label: "Approved — Awaiting Lawyer", color: "bg-blue-100 text-blue-700" },
  confirmed_litigation: { label: "Confirmed", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: fd.get("reason"),
          proposedDate: fd.get("proposedDate"),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to request appointment.");
      } else {
        const d = await res.json();
        setAppointments((prev) => [d.appointment, ...prev]);
        setSuccess("Appointment request sent to your social worker.");
        setShowForm(false);
        setTimeout(() => setSuccess(""), 4000);
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(text)">Appointments</h1>
          <p className="text-sm text-(muted) mt-1">
            Request a meeting with your legal team. Your social worker approves first, then the lawyer confirms.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              required
              rows={3}
              placeholder="What do you need to discuss?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 resize-none placeholder:text-(muted)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Preferred Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="proposedDate"
              required
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
            />
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
        <div className="py-12 text-center text-sm text-(muted)">Loading appointments…</div>
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-(muted) text-sm">No appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const s = STATUS_LABELS[apt.status] ?? { label: apt.status, color: "bg-gray-100 text-gray-600" };
            return (
              <div key={apt._id} className="bg-(surface) rounded-2xl border border-(border) p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-(text)">{apt.reason}</p>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <p className="text-xs text-(muted)">
                  Proposed: {new Date(apt.proposedDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
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
