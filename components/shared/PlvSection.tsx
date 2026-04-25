"use client";

import { useEffect, useState } from "react";

type PlvStatus = "none" | "requested" | "approved" | "rejected";

type Profile = {
  role: string;
  communityProfile?: {
    plvStatus?: PlvStatus;
    plvMotivation?: string;
    plvRequestedAt?: string;
    plvDecidedAt?: string;
    plvRejectionReason?: string;
  };
};

const STATUS_STYLE: Record<PlvStatus, { bg: string; text: string; label: string; icon: string }> = {
  none:      { bg: "var(--bg-secondary)", text: "var(--muted)",        label: "Not yet requested", icon: "⚖️" },
  requested: { bg: "var(--warning-bg)",   text: "var(--warning-text)", label: "Awaiting social worker review", icon: "⏳" },
  approved:  { bg: "var(--success-bg)",   text: "var(--success-text)", label: "Approved Para Legal Volunteer", icon: "🏅" },
  rejected:  { bg: "var(--error-bg)",     text: "var(--error-text)",   label: "Application not accepted", icon: "✗" },
};

export default function PlvSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [motivation, setMotivation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (res.ok && data.user) setProfile(data.user as Profile);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading || !profile || profile.role !== "community") return null;

  const status = (profile.communityProfile?.plvStatus ?? "none") as PlvStatus;
  const style = STATUS_STYLE[status];
  const decidedAt = profile.communityProfile?.plvDecidedAt;
  const rejectionReason = profile.communityProfile?.plvRejectionReason;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (motivation.trim().length < 20) {
      setError("Please write at least 20 characters about your motivation.");
      return;
    }
    setBusy(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/users/me/plv-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivation: motivation.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      setSuccess(true);
      setMotivation("");
      load();
    } finally {
      setBusy(false);
    }
  }

  const canApply = status === "none" || status === "rejected";

  return (
    <section className="rounded-2xl border p-6 space-y-4 overflow-hidden relative"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-(--text) flex items-center gap-2">
            <span className="text-base">🏅</span> Become a Para Legal Volunteer (PLV)
          </h2>
          <p className="text-xs text-(--muted) mt-1 max-w-md leading-relaxed">
            PLVs are trained community members who help neighbours navigate FIRs, RTIs, and entitlements.
            You'll get free training and join a network of grassroots legal first-responders.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
          style={{ background: style.bg, color: style.text }}>
          {style.icon} {style.label}
        </span>
      </div>

      {status === "approved" && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)" }}>
          <p className="font-semibold text-(--success-text)">You're an approved PLV. Welcome to the team.</p>
          {decidedAt && <p className="text-xs text-(--muted) mt-1">Approved on {new Date(decidedAt).toLocaleDateString("en-IN")}.</p>}
          <p className="text-xs text-(--text) mt-2">Watch your dashboard for upcoming PLV training sessions and field assignments.</p>
        </div>
      )}

      {status === "requested" && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "color-mix(in srgb, var(--warning) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}>
          <p className="font-semibold text-(--warning-text)">Your application is with the social worker team.</p>
          <p className="text-xs text-(--muted) mt-1">You'll be notified once a decision is made — usually within 7 days.</p>
          {profile.communityProfile?.plvMotivation && (
            <p className="text-xs text-(--text) mt-2 italic">"{profile.communityProfile.plvMotivation}"</p>
          )}
        </div>
      )}

      {status === "rejected" && rejectionReason && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "color-mix(in srgb, var(--error) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
          <p className="font-semibold text-(--error-text)">Your previous application was not accepted.</p>
          <p className="text-xs text-(--text) mt-1"><span className="font-medium">Reason: </span>{rejectionReason}</p>
          <p className="text-xs text-(--muted) mt-2">You can re-apply below with updated context.</p>
        </div>
      )}

      {canApply && (
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{error}</p>}
          {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Request submitted — your social worker will review it shortly.</p>}
          <label className="block text-sm font-medium text-(--text)">Why do you want to become a PLV?</label>
          <textarea value={motivation} onChange={e => setMotivation(e.target.value)} required minLength={20} rows={4}
            placeholder="Tell us about your community, what kind of cases you've helped with informally, languages you speak, hours you can volunteer per week…"
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-(--muted)">{motivation.length} / 20+ characters</p>
            <button type="submit" disabled={busy || motivation.trim().length < 20}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
              {busy ? "Submitting…" : "Request to become a PLV"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
