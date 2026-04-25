"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import { CASE_TYPES, lookupCaseType } from "@/lib/case-types";

export default function FileCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const caseType = String(fd.get("caseType") ?? "");
    const description = String(fd.get("description") ?? "").trim();

    // Either typed or spoken description must be present
    if (!description && !voiceUrl) {
      setError("Please describe what happened — type it, or record your voice.");
      setLoading(false);
      return;
    }

    const body = {
      caseTitle: fd.get("caseTitle"),
      caseType,
      path: lookupCaseType(caseType)?.path,
      description,
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
        return;
      }
      const data = await res.json();
      const caseId = data?.case?._id;

      // Attach the recorded voice clip as a case document
      if (caseId && voiceUrl) {
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addDocument: {
              label: `Voice description by community (${voiceDuration}s)`,
              url: voiceUrl,
              category: "general",
            },
          }),
        });
      }

      setSuccess(true);
      setTimeout(() => router.push("/community/case-tracker"), 1500);
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
            hint="Pick the closest match. If you're not sure, pick FIR or 'Other' — your social worker will reclassify after review."
            example="FIR for refused complaint · POCSO for child abuse · MACT for road accident · WP(C) for writ petition"
          >
            <Select name="caseType" required defaultValue="">
              <option value="" disabled>Choose a case type…</option>
              {CASE_TYPES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.types.map((t) => (
                    <option key={t.code + g.group} value={t.code}>
                      {t.code} — {t.name}{t.hi ? ` · ${t.hi}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field
            label="What happened?"
            hint="Tell us the full story. Include who, when, where, and what — like you'd tell a friend. If you can't write, record your voice below instead."
            example="On 18 April around 7pm, two men forced their way into our shop in Purnia and demanded money. We went to Khajanchi Hat police station but the SHO refused to register an FIR…">
            <Textarea name="description" rows={6} placeholder="Describe the incident in detail…" />
          </Field>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-(--text)">
              Or record your voice <span className="font-normal text-(--muted)">(हिंदी या आपकी भाषा में)</span>
            </label>
            <p className="text-xs text-(--muted) -mt-1">
              Tap the mic to start, tap again to stop. Your voice will be attached to the case so the social worker hears it directly.
            </p>
            {voiceUrl ? (
              <div className="rounded-xl border p-3 flex items-center gap-3"
                style={{ background: "var(--success-bg)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)" }}>
                <span className="text-xl">🎤</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>Voice recorded ({voiceDuration}s)</p>
                  <audio controls preload="metadata" src={voiceUrl} className="block w-full mt-1" />
                </div>
                <button type="button" onClick={() => { setVoiceUrl(null); setVoiceDuration(0); }}
                  className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                  Re-record
                </button>
              </div>
            ) : (
              <VoiceRecorder onUploaded={(url, dur) => { setVoiceUrl(url); setVoiceDuration(dur); }} />
            )}
          </div>

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
