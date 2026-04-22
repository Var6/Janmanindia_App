"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";

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
      caseTitle:   fd.get("caseTitle"),
      path:        fd.get("path"),
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
        setTimeout(() => router.push("/community/case-tracker"), 1500);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface) px-6 py-6">
        <Spotlight color="var(--accent)" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-1">Step 1 of 1</p>
          <h1 className="text-2xl font-bold text-(--text)">File a New Case</h1>
          <p className="text-sm text-(--muted) mt-1.5 leading-relaxed">
            Tell us what happened in your own words. A social worker will review within 48 hours and assign a lawyer.
          </p>
        </div>
      </header>

      {success ? (
        <div className="p-6 rounded-2xl text-center"
          style={{ background: "var(--success-bg, #dcfce7)", border: "1px solid color-mix(in srgb, var(--success, #16a34a) 30%, transparent)" }}>
          <p className="text-3xl mb-2">✅</p>
          <p className="font-semibold" style={{ color: "var(--success-text, #15803d)" }}>Case filed successfully!</p>
          <p className="text-sm mt-1" style={{ color: "var(--success-text, #15803d)", opacity: 0.8 }}>
            Redirecting to your case tracker…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-(--surface) rounded-2xl border border-(--border) p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {error}
            </div>
          )}

          <Field
            label="Case title"
            required
            hint="One short line — what's the main issue?"
            example="Police refused to file FIR for theft on April 18">
            <Input name="caseTitle" required maxLength={200} placeholder="Short summary of the issue" />
          </Field>

          <Field
            label="Type of case"
            required
            hint="Pick one. If unsure, choose Criminal — your social worker will guide you."
          >
            <Select name="path" required defaultValue="">
              <option value="" disabled>Choose…</option>
              <option value="criminal">Criminal — FIR, complaint, abuse, theft, harassment</option>
              <option value="highcourt">High Court — appeal, writ petition, PIL</option>
            </Select>
          </Field>

          <Field
            label="What happened?"
            required
            hint="Tell us the full story. Include who, when, where, and what — like you'd tell a friend."
            example="On 18 April around 7pm, two men forced their way into our shop in Purnia and demanded money. We went to Khajanchi Hat police station but the SHO refused to register an FIR…">
            <Textarea name="description" required rows={6} placeholder="Describe the incident in detail…" />
          </Field>

          <div className="p-4 rounded-xl flex gap-3"
            style={{ background: "var(--warning-bg, #fef3c7)", border: "1px solid color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent)" }}>
            <span className="text-lg shrink-0">📎</span>
            <div className="text-xs leading-relaxed" style={{ color: "var(--warning-text, #92400e)" }}>
              <p className="font-semibold">About documents</p>
              <p className="mt-0.5 opacity-90">
                You don't need to upload anything now. After review, your social worker will tell you exactly which documents to send (FIR copy, photos, ID proof, etc.).
              </p>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-(--accent-contrast) hover:brightness-110 transition disabled:opacity-60"
            style={{ background: "var(--accent)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            {loading ? "Filing your case…" : "Submit Case"}
          </button>

          <p className="text-[11px] text-center text-(--muted)">
            Your case is private. Only your assigned social worker and lawyer can see it.
          </p>
        </form>
      )}
    </div>
  );
}
