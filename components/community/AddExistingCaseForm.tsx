"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_TYPES, lookupCaseType } from "@/lib/case-types";

/** Community-side companion to CreateCaseForm. Used when a community member
 *  already has a case running elsewhere (police station, lower court) and
 *  just wants Janman to track it — no fresh filing.
 *
 *  Posts to /api/cases with `isExistingCase: true`, which:
 *   • flags the case in the dashboard ("Existing" badge)
 *   • makes it visible to litigation members so a lawyer can claim it
 *   • keeps the workflow stages at "not done" until the team updates them */
export default function AddExistingCaseForm() {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [caseTitle, setCaseTitle]     = useState("");
  const [caseType, setCaseType]       = useState("");
  const [status, setStatus]           = useState<"Open" | "Pending" | "Escalated">("Open");
  const [currentStep, setCurrentStep] = useState("");
  const [history, setHistory]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  function reset() {
    setOpen(false);
    setCaseTitle("");
    setCaseType("");
    setStatus("Open");
    setCurrentStep("");
    setHistory("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseTitle.trim()) { setError("Add a short case title."); return; }
    if (!caseType)         { setError("Pick a case type."); return; }
    const meta = lookupCaseType(caseType);
    if (!meta)             { setError("That case type isn't recognised."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseTitle: caseTitle.trim(),
          caseType,
          path: meta.path,
          status,
          isExistingCase: true,
          currentStep:   currentStep.trim() || undefined,
          existingNotes: history.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add case.");
      } else {
        reset();
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-(--bg-secondary)"
        style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
      >
        + Add existing case
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-5 space-y-3 max-w-xl"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-(--text)">Add existing case</h2>
          <p className="text-xs text-(--muted) mt-0.5">
            Already have a case running elsewhere? Tell us where it stands and a lawyer will see it.
          </p>
        </div>
        <button type="button" onClick={reset}
          className="text-xs text-(--muted) hover:text-(--text) px-2 py-1 rounded-lg hover:bg-(--bg-secondary) transition-colors">
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg text-sm"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">
          Case title <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} required
          placeholder="Brief description"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">
            Case type <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <select value={caseType} onChange={(e) => setCaseType(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
            <option value="" disabled>Pick a type…</option>
            {CASE_TYPES.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.types.map((t) => (
                  <option key={t.code + g.group} value={t.code}>
                    {t.code} — {t.name}{t.hi ? ` · ${t.hi}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">
            Current status
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "Open" | "Pending" | "Escalated")}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
            <option value="Open">Active</option>
            <option value="Pending">Waiting on the other side</option>
            <option value="Escalated">Needs urgent help</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">
          Where is it right now?
        </label>
        <input value={currentStep} onChange={(e) => setCurrentStep(e.target.value)} maxLength={300}
          placeholder="e.g. FIR filed at Patna Bypass PS, awaiting chargesheet"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">
          What&apos;s already happened?
        </label>
        <textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3}
          placeholder="FIR number, hearing dates so far, lawyer involved, anything we should know…"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      </div>

      <button type="submit" disabled={submitting || !caseTitle.trim() || !caseType}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
        {submitting ? "Adding…" : "Add case to tracker"}
      </button>
    </form>
  );
}
