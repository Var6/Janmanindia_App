"use client";

import { useState } from "react";

type MediaItem = { url: string; label: string; district: string; addedAt: string };

export default function MediaUploadPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Upload failed.");
      } else {
        const d = await res.json();
        setItems((prev) => [d.item, ...prev]);
        setSuccess("Media uploaded successfully.");
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(text)">Media Upload</h1>
        <p className="text-sm text-(muted) mt-1">
          Upload photos, videos, or news clippings documenting local injustice. These become part of the case study materials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-(surface) rounded-2xl border border-(border) p-6 space-y-5">
        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-(text) mb-1.5">
            File (image, video, or PDF) <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            name="file"
            required
            accept="image/*,video/*,application/pdf"
            className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-(accent)/10 file:text-(accent)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              Label / Caption <span className="text-red-500">*</span>
            </label>
            <input
              name="label"
              required
              placeholder="e.g. FIR denial at District HQ"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">
              District <span className="text-red-500">*</span>
            </label>
            <input
              name="district"
              required
              placeholder="e.g. Lucknow"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-(text) mb-1.5">Source (optional)</label>
          <input
            name="source"
            placeholder="e.g. Dainik Jagran, 21 April 2026"
            className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40 placeholder:text-(muted)"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Uploading…" : "Upload Media"}
        </button>
      </form>

      {items.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Uploaded This Session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, i) => (
              <div key={i} className="bg-(surface) rounded-xl border border-(border) p-4">
                <p className="text-sm font-medium text-(text)">{item.label}</p>
                <p className="text-xs text-(muted) mt-0.5">📍 {item.district}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="p-4 rounded-xl bg-(accent)/5 border border-(accent)/20">
        <p className="text-xs text-(muted)">
          <span className="font-medium text-(text)">Tip:</span> Upload news clippings as PDF or high-resolution photos. Videos are accepted up to 100 MB. All uploads are reviewed before being attached to case files.
        </p>
      </div>
    </div>
  );
}
