"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "harassment",     label: "Harassment"        },
  { value: "discrimination", label: "Discrimination"    },
  { value: "workload",       label: "Workload / Hours"  },
  { value: "compensation",   label: "Compensation / Pay"},
  { value: "facilities",     label: "Facilities / Equipment" },
  { value: "interpersonal",  label: "Interpersonal Conflict" },
  { value: "policy",         label: "Policy Concern"    },
  { value: "other",          label: "Other"             },
];

export default function SubmitForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const payload = {
      category:         String(fd.get("category") ?? ""),
      subject:          String(fd.get("subject") ?? "").trim(),
      description:      String(fd.get("description") ?? "").trim(),
      incidentDate:     String(fd.get("incidentDate") ?? "") || undefined,
      incidentLocation: String(fd.get("incidentLocation") ?? "").trim() || undefined,
      involvedPersons:  String(fd.get("involvedPersons") ?? "").trim() || undefined,
      anonymous:        fd.get("anonymous") === "on",
    };

    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-(--surface) rounded-2xl border border-(--border) p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-(--text)">Submit a Grievance</h2>
        <p className="text-xs text-(--muted) mt-1">
          Send a confidential report directly to HR. Use this for workplace concerns, conflicts, or feedback you want addressed formally.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
          <select name="category" required defaultValue=""
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
            <option value="" disabled>Category…</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input name="subject" required maxLength={200} placeholder="Short subject line"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
        </div>

        <textarea name="description" required rows={5}
          placeholder="Describe what happened, when, where, and how it affected you. Include any relevant details."
          className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Incident date</label>
            <input name="incidentDate" type="date"
              className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Location</label>
            <input name="incidentLocation" placeholder="Office / field / remote"
              className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Person(s) involved</label>
            <input name="involvedPersons" placeholder="Optional"
              className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-(--text) cursor-pointer select-none">
          <input type="checkbox" name="anonymous" />
          Submit anonymously — HR will not see my name (you can still view the response from your own list)
        </label>

        {error && (
          <div className="px-3 py-2 text-xs rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}
        {success && (
          <div className="px-3 py-2 text-xs rounded-lg"
            style={{ background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }}>
            Submitted to HR. You&apos;ll see their response below once reviewed.
          </div>
        )}

        <button type="submit" disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
          style={{ background: "var(--accent)" }}>
          {busy ? "Submitting…" : "Send to HR"}
        </button>
      </form>
    </section>
  );
}
