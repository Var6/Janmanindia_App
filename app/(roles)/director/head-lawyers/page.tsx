"use client";

import { useEffect, useState } from "react";

type Lawyer = {
  _id: string;
  name: string;
  email: string;
  litigationProfile?: { location?: { district?: string; city?: string }; barCouncilId?: string };
};
type Head = {
  _id: string;
  district: string;
  notes?: string;
  user: Lawyer;
  assignedBy?: { _id: string; name: string };
  updatedAt: string;
};

export default function HeadLawyersPage() {
  const [heads, setHeads] = useState<Head[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [district, setDistrict] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [hRes, lRes] = await Promise.all([
      fetch("/api/head-lawyers"),
      fetch("/api/users?role=litigation"),
    ]);
    const h = await hRes.json();
    const l = await lRes.json();
    setHeads(h.heads ?? []);
    setLawyers(l.users ?? []);
  }
  useEffect(() => { load(); }, []);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/head-lawyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district: district.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setDistrict(""); setUserId("");
      load();
    } finally {
      setBusy(false);
    }
  }
  async function remove(d: string) {
    if (!confirm(`Remove the head lawyer for ${d}? Director will then approve invoices in that district directly.`)) return;
    await fetch(`/api/head-lawyers?district=${encodeURIComponent(d)}`, { method: "DELETE" });
    load();
  }

  // Districts where we have litigation members but no head lawyer assigned yet
  const heldDistricts = new Set(heads.map(h => h.district));
  const districtsWithLawyers = new Set(
    lawyers
      .map(l => l.litigationProfile?.location?.district?.trim())
      .filter((d): d is string => Boolean(d))
  );
  const unassigned = [...districtsWithLawyers].filter(d => !heldDistricts.has(d));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Head Lawyer Assignments</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Pick one head lawyer per district. They will approve litigation invoices in their district after HR has verified them.
          Districts with no head lawyer fall back to your direct approval.
        </p>
      </div>

      <form onSubmit={assign} className="rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <p className="text-sm font-bold text-(--text)">Assign / change a head lawyer</p>
        {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={district} onChange={e => setDistrict(e.target.value)} required
            placeholder="District (e.g. Patna)"
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <select value={userId} onChange={e => setUserId(e.target.value)} required
            className="sm:col-span-2 px-3 py-2 rounded-lg border text-sm"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
            <option value="" disabled>Choose a litigation member…</option>
            {lawyers.map(l => (
              <option key={l._id} value={l._id}>
                {l.name} {l.email && `· ${l.email}`}
                {l.litigationProfile?.location?.district && ` · ${l.litigationProfile.location.district}`}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy || !district || !userId}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {busy ? "Saving…" : "Assign"}
        </button>
      </form>

      <section>
        <h2 className="font-semibold text-(--text) mb-3">Active head lawyers ({heads.length})</h2>
        {heads.length === 0 ? (
          <p className="text-sm text-(--muted)">No districts have a head lawyer yet — you'll approve all litigation invoices.</p>
        ) : (
          <div className="space-y-2">
            {heads.map(h => (
              <div key={h._id} className="rounded-xl border p-4 flex items-start justify-between gap-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--text)">{h.district}</p>
                  <p className="text-xs text-(--muted)">
                    {h.user?.name} · {h.user?.email}
                    {h.assignedBy?.name && ` · assigned by ${h.assignedBy.name}`}
                  </p>
                </div>
                <button onClick={() => remove(h.district)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {unassigned.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Districts needing a head lawyer</h2>
          <p className="text-xs text-(--muted) mb-2">
            These districts have litigation staff but no head lawyer — invoices from there route directly to you.
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(d => (
              <span key={d} className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                {d}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
