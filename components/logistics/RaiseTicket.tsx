"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { v: "equipment",   l: "Equipment (chair, table, laptop, …)" },
  { v: "transport",   l: "Transport (vehicle for community/team)" },
  { v: "supplies",    l: "Supplies (stationery, consumables)" },
  { v: "maintenance", l: "Maintenance (repairs, internet, electrical)" },
  { v: "office",      l: "Office (room booking, new setup)" },
  { v: "other",       l: "Other" },
];

export default function RaiseTicket() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const payload = {
      category:    String(fd.get("category") ?? ""),
      urgency:     String(fd.get("urgency") ?? "normal"),
      title:       String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      beneficiary: String(fd.get("beneficiary") ?? "").trim() || undefined,
      district:    String(fd.get("district") ?? "").trim() || undefined,
      location:    String(fd.get("location") ?? "").trim() || undefined,
    };
    try {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Failed");
      else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  return (
    <section className="bg-(--surface) rounded-2xl border border-(--border) p-5">
      <div className="mb-3">
        <h2 className="font-semibold text-(--text)">Raise a Logistics Request</h2>
        <p className="text-xs text-(--muted) mt-1">
          Need office equipment, transport for a community member, supplies, or repairs? Send it to the Administrator.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
          <select name="category" required defaultValue=""
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
            <option value="" disabled>Category…</option>
            {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <select name="urgency" defaultValue="normal"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <input name="title" required maxLength={200} placeholder="Short title (e.g. New chair for desk in Patna office)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />

        <textarea name="description" required rows={3}
          placeholder="What is needed? Quantity, specifications, when needed by, why…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) resize-none focus:outline-none focus:border-(--accent)" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input name="beneficiary" placeholder="Who is it for? (optional)"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          <input name="district" placeholder="District"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          <input name="location" placeholder="Location detail (office / address)"
            className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
        </div>

        {error && <div className="px-3 py-2 text-xs rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</div>}
        {success && <div className="px-3 py-2 text-xs rounded-lg" style={{ background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }}>Sent to Administrator.</div>}

        <button type="submit" disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
          style={{ background: "var(--accent)" }}>
          {busy ? "Sending…" : "Submit request"}
        </button>
      </form>
    </section>
  );
}
