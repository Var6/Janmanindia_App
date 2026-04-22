"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FileCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      caseTitle: fd.get("caseTitle"),
      path: fd.get("path"),
      description: fd.get("description"),
    };
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to file case. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/user/case-tracker"), 1500);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(text)">File a Case</h1>
        <p className="text-sm text-(muted) mt-1">
          Report an injustice or legal issue. Your social worker will review and assign a litigation team member.
        </p>
      </div>

      {success ? (
        <div className="p-6 rounded-2xl bg-green-50 border border-green-200 text-center">
          <p className="text-green-700 font-semibold">Case filed successfully!</p>
          <p className="text-sm text-green-600 mt-1">Redirecting to your case tracker…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-(surface) rounded-2xl border border-(border) p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Case Title <span className="text-red-500">*</span>
            </label>
            <input
              name="caseTitle"
              required
              placeholder="Brief description of the injustice or issue"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Case Type <span className="text-red-500">*</span>
            </label>
            <select
              name="path"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
            >
              <option value="">Select type…</option>
              <option value="criminal">Criminal Case (FIR / Complaint)</option>
              <option value="highcourt">High Court Escalation (Appeal / Writ)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={5}
              placeholder="Describe the incident in detail: what happened, when, where, who was involved…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 resize-none placeholder:text-(muted)"
            />
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 font-medium">Note on documents</p>
            <p className="text-xs text-amber-600 mt-0.5">
              You can upload supporting documents (FIR copy, photos, etc.) after your case is reviewed and assigned.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? "Filing case…" : "Submit Case"}
          </button>
        </form>
      )}
    </div>
  );
}
