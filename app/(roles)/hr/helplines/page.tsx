"use client";

import { useEffect, useState, useCallback } from "react";

interface Helpline {
  _id: string;
  district: string;
  primaryName: string;
  primaryPhone: string;
  secondaryName?: string;
  secondaryPhone?: string;
  notes?: string;
  setBy?: { name: string } | null;
  updatedAt: string;
}

export default function HrHelplinesPage() {
  const [items, setItems] = useState<Helpline[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/helplines");
      const d = await res.json();
      setItems(d.helplines ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/hr/helplines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        district:       fd.get("district"),
        primaryName:    fd.get("primaryName"),
        primaryPhone:   fd.get("primaryPhone"),
        secondaryName:  fd.get("secondaryName"),
        secondaryPhone: fd.get("secondaryPhone"),
        notes:          fd.get("notes"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed");
    } else {
      form.reset();
      await load();
    }
  }

  async function remove(district: string) {
    if (!confirm(`Remove helpline for ${district}?`)) return;
    const res = await fetch(`/api/hr/helplines/${encodeURIComponent(district)}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">District Helplines</h1>
        <p className="text-sm text-(--muted) mt-1">
          Community members see these numbers from their SOS screen <em>only when their assigned Social Worker isn&apos;t reachable</em>.
          Kept as a district-level safety net.
        </p>
      </div>

      <section className="bg-(--surface) rounded-2xl border border-(--border) p-5">
        <h2 className="font-semibold text-(--text) mb-3">Assign / update a district helpline</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input name="district" required placeholder="District (e.g. Purnia)"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
            <input name="primaryName" required placeholder="Primary contact name"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
            <input name="primaryPhone" required type="tel" placeholder="Primary phone (+91…)"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input name="secondaryName" placeholder="Secondary name (optional)"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
            <input name="secondaryPhone" type="tel" placeholder="Secondary phone (optional)"
              className="px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>
          <input name="notes" placeholder="Notes (office hours, coverage area, etc.)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-(--border) bg-(--bg) text-(--text) focus:outline-none focus:border-(--accent)" />
          <button type="submit" disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {busy ? "Saving…" : "Save helpline"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-(--text) mb-3">Configured ({items.length})</h2>
        {loading ? (
          <p className="text-sm text-(--muted) py-6 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
            <p className="text-2xl mb-2">📞</p>
            <p className="text-sm text-(--muted)">No helplines configured yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((h) => (
              <article key={h._id} className="rounded-2xl border border-(--border) bg-(--surface) p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-(--text)">{h.district}</p>
                  <p className="text-xs text-(--muted) mt-0.5">
                    Primary: <span className="font-medium text-(--text)">{h.primaryName}</span> · <span className="font-mono" style={{ color: "var(--accent)" }}>{h.primaryPhone}</span>
                  </p>
                  {h.secondaryPhone && (
                    <p className="text-xs text-(--muted)">
                      Secondary: {h.secondaryName ?? "—"} · <span className="font-mono">{h.secondaryPhone}</span>
                    </p>
                  )}
                  {h.notes && <p className="text-xs text-(--muted) mt-1">Note: {h.notes}</p>}
                </div>
                <button onClick={() => remove(h.district)}
                  className="text-xs font-semibold px-3 py-1 rounded-lg shrink-0"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
