"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TrainingFileType } from "./types";

const FILE_TYPES: { value: TrainingFileType; label: string }[] = [
  { value: "pdf",   label: "PDF" },
  { value: "doc",   label: "Document (DOC, DOCX, TXT)" },
  { value: "ppt",   label: "Presentation (PPT, PPTX)" },
  { value: "image", label: "Image (JPG, PNG, GIF)" },
  { value: "video", label: "Video (MP4, YouTube link)" },
  { value: "other", label: "Other" },
];

export default function UploadForm() {
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
      title:       String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      category:    String(fd.get("category") ?? "").trim(),
      fileUrl:     String(fd.get("fileUrl") ?? "").trim(),
      fileType:    String(fd.get("fileType") ?? "") as TrainingFileType,
    };

    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-(--surface) rounded-2xl border border-(--border) p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-(--text)">Upload Training Material</h2>
        <p className="text-xs text-(--muted) mt-1">
          Submit a link to a document, slide deck, image, or video. HR will review before it appears in the library.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="title" required placeholder="Title"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          <input name="category" placeholder="Category (e.g. Civil Rights)"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
        </div>

        <textarea name="description" rows={2} placeholder="Short description (optional)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
          <input name="fileUrl" required type="url" placeholder="https://… (Drive, S3, YouTube, etc.)"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          <select name="fileType" required defaultValue=""
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
            <option value="" disabled>Select file type…</option>
            {FILE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {error && (
          <div className="px-3 py-2 text-xs rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}
        {success && (
          <div className="px-3 py-2 text-xs rounded-lg" style={{ background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }}>
            Submitted — pending HR approval.
          </div>
        )}

        <button type="submit" disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
          style={{ background: "var(--accent)" }}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </section>
  );
}
