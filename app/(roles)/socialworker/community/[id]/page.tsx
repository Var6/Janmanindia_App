"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

type CommunityProfile = {
  govtIdUrl?: string;
  govtIdType?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: { name: string; role: string };
  verifiedAt?: string;
  rejectionReason?: string;
  district?: string;
  village?: string;
  assignedSocialWorker?: { name: string; email: string; phone?: string };
  voiceIntroUrl?: string;
  voiceIntroDurationSec?: number;
  preferredLanguage?: string;
  plvStatus?: "none" | "requested" | "approved" | "rejected";
  plvMotivation?: string;
};

type UserDoc = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  communityProfile?: CommunityProfile;
};

type CaseRow = {
  _id: string;
  caseNumber: string;
  caseTitle: string;
  status: string;
  path: "criminal" | "highcourt";
  district?: string;
  causeTitle?: string;
  nextHearingDate?: string;
  createdAt: string;
  updatedAt: string;
  litigationMember?: { name: string };
  socialWorker?: { name: string };
};

type CarePlanRow = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  case?: string;
  createdBy?: { name: string };
  sessions?: unknown[];
};

const VERIF_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "var(--warning-bg)", text: "var(--warning-text)", label: "Pending verification" },
  verified: { bg: "var(--success-bg)", text: "var(--success-text)", label: "Verified" },
  rejected: { bg: "var(--error-bg)",   text: "var(--error-text)",   label: "Rejected" },
};

const PRIO_STYLE: Record<string, { bg: string; text: string }> = {
  low:      { bg: "var(--bg-secondary)", text: "var(--muted)" },
  medium:   { bg: "var(--info-bg)",      text: "var(--info-text)" },
  high:     { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  critical: { bg: "var(--error-bg)",     text: "var(--error-text)" },
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CommunityMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const [user, setUser]           = useState<UserDoc | null>(null);
  const [cases, setCases]         = useState<CaseRow[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlanRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Approve / reject UX state — kept local because the SW dashboard already
  // owns the queue list; this page only mutates the one record we're viewing.
  const [busy, setBusy]                       = useState(false);
  const [rejectReason, setRejectReason]       = useState("");
  const [showReject, setShowReject]           = useState(false);
  const [approvalError, setApprovalError]     = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/users/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Failed to load community member."));
        return;
      }
      setUser(data.user);
      setCases(data.cases ?? []);
      setCarePlans(data.carePlans ?? []);
    } catch {
      setError(t("Network error."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function approve() {
    setBusy(true); setApprovalError("");
    try {
      const res = await fetch("/api/users/verify-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status: "verified" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setApprovalError(d.error ?? t("Failed to approve."));
        return;
      }
      load();
    } catch {
      setApprovalError(t("Network error."));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!rejectReason.trim()) { setApprovalError(t("Reason is required.")); return; }
    setBusy(true); setApprovalError("");
    try {
      const res = await fetch("/api/users/verify-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status: "rejected", rejectionReason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setApprovalError(d.error ?? t("Failed to reject."));
        return;
      }
      setShowReject(false);
      setRejectReason("");
      load();
    } catch {
      setApprovalError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (
    <div className="space-y-5">
      <Skeleton w={140} h={11} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={4} />
    </div>
  );

  if (error || !user) return (
    <div className="py-16 text-center rounded-2xl border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-sm" style={{ color: "var(--error-text)" }}>{error || t("User not found.")}</p>
      <Link href="/socialworker" className="mt-3 inline-block text-sm hover:underline" style={{ color: "var(--accent)" }}>{t("← Back to dashboard")}</Link>
    </div>
  );

  const cp = user.communityProfile;
  const verif = cp ? VERIF_STYLE[cp.verificationStatus] ?? VERIF_STYLE.pending : null;

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-(--muted)">
        <Link href="/socialworker" className="hover:text-(--text) transition-colors">{t("Dashboard")}</Link>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M6 4l4 4-4 4"/></svg>
        <span className="font-semibold text-(--text)">{user.name}</span>
      </nav>

      {/* Profile header */}
      <div className="rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: "var(--accent-muted)", color: "var(--sidebar-active-text)" }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-(--text)">{user.name}</h1>
              <p className="text-xs text-(--muted) mt-0.5">
                {user.email}{user.phone ? ` · ${user.phone}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full uppercase"
                  style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{user.role}</span>
                {verif && (
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: verif.bg, color: verif.text }}>{t(verif.label)}</span>
                )}
                {!user.isActive && (
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("Inactive")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Approval actions — only when this is a community member that's
              still pending verification. The endpoint enforces the same rule
              server-side; the UI just hides the buttons in other states. */}
          {user.role === "community" && cp?.verificationStatus === "pending" && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={approve} disabled={busy}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "var(--success)", color: "white" }}>
                  {busy ? "…" : t("Approve")}
                </button>
                <button type="button" onClick={() => setShowReject(s => !s)} disabled={busy}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-(--bg-secondary)"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  {t("Reject")}
                </button>
              </div>
              {showReject && (
                <div className="flex flex-col gap-2 w-72">
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    rows={2} placeholder={t("Reason for rejection (required)")}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  <button type="button" onClick={reject} disabled={busy || !rejectReason.trim()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: "var(--error)", color: "white" }}>
                    {t("Confirm rejection")}
                  </button>
                </div>
              )}
              {approvalError && (
                <p className="text-xs" style={{ color: "var(--error-text)" }}>{approvalError}</p>
              )}
            </div>
          )}
        </div>

        {/* Community profile facts */}
        {cp && (
          <div className="mt-5 pt-5 border-t grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm"
            style={{ borderColor: "var(--border)" }}>
            <Fact label={t("District")} value={cp.district} />
            <Fact label={t("Village")} value={cp.village} />
            <Fact label={t("Preferred language")} value={cp.preferredLanguage} />
            <Fact label={t("ID type")} value={cp.govtIdType} />
            <Fact label={t("Joined")} value={fmtDate(user.createdAt)} />
            <Fact label={t("Last login")} value={fmtDate(user.lastLoginAt)} />
            <Fact label={t("Assigned SW")} value={cp.assignedSocialWorker?.name} />
            <Fact label={t("PLV status")} value={cp.plvStatus && cp.plvStatus !== "none" ? cp.plvStatus : undefined} />
            {cp.verifiedAt && (
              <Fact label={`${t("Verified")}${cp.verifiedBy ? ` ${t("by")} ${cp.verifiedBy.name}` : ""}`} value={fmtDate(cp.verifiedAt)} />
            )}
          </div>
        )}

        {/* Govt ID + voice intro */}
        {cp && (cp.govtIdUrl || cp.voiceIntroUrl) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cp.govtIdUrl && (
              <a href={cp.govtIdUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border hover:border-(--accent) transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                {t("View ID document")}
              </a>
            )}
            {cp.voiceIntroUrl && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "var(--border)" }}>
                <span className="text-xs text-(--muted)">{t("Voice intro")}{cp.voiceIntroDurationSec ? ` (${cp.voiceIntroDurationSec}s)` : ""}</span>
                <audio controls preload="metadata" src={cp.voiceIntroUrl} className="h-7" />
              </div>
            )}
          </div>
        )}

        {cp?.rejectionReason && (
          <div className="mt-4 p-3 rounded-lg text-xs"
            style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            <span className="font-semibold">{t("Previously rejected:")} </span>{cp.rejectionReason}
          </div>
        )}
      </div>

      {/* Cases */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-(--text)">{t("Cases")}</h2>
          <p className="text-xs text-(--muted)">{cases.length}</p>
        </div>
        {cases.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm text-(--muted)">{t("No cases on record.")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map(c => (
              <Link key={c._id} href={`/socialworker/cases/${c._id}`}
                className="block rounded-xl border p-4 transition-colors hover:border-(--accent)"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-(--accent)">{c.caseNumber}</p>
                    <p className="text-sm font-medium text-(--text) mt-0.5">{c.caseTitle}</p>
                    <p className="text-xs text-(--muted) mt-1">
                      {c.path === "criminal" ? t("⚖ Criminal") : t("🏛 High Court")}
                      {c.district ? ` · ${c.district}` : ""}
                      {c.litigationMember?.name ? ` · ${t("Lawyer:")} ${c.litigationMember.name}` : ` · ${t("Unassigned")}`}
                    </p>
                    {c.nextHearingDate && (
                      <p className="text-xs text-(--muted) mt-0.5">{t("Next hearing:")} {fmtDate(c.nextHearingDate)}</p>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{c.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Care plans */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-(--text)">{t("Care Plans")}</h2>
          <p className="text-xs text-(--muted)">{carePlans.length}</p>
        </div>
        {carePlans.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm text-(--muted)">{t("No care plans yet. Open a case and click + New Care Plan inside the case detail to create one.")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carePlans.map(p => {
              const prio = PRIO_STYLE[p.priority] ?? PRIO_STYLE.medium;
              const href = p.case ? `/socialworker/cases/${String(p.case)}` : "#";
              return (
                <Link key={p._id} href={href}
                  className="block rounded-xl border p-4 transition-colors hover:border-(--accent)"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--text)">{p.title}</p>
                      <p className="text-xs text-(--muted) mt-0.5">
                        <span className="capitalize">{p.category.replace(/_/g, " ")}</span>
                        {p.createdBy?.name ? ` · ${p.createdBy.name}` : ""}
                        {` · ${(p.sessions?.length ?? 0)} ${(p.sessions?.length ?? 0) === 1 ? t("session") : t("sessions")}`}
                        {` · ${t("updated")} ${fmtDate(p.updatedAt)}`}
                      </p>
                      {p.summary && (
                        <p className="text-xs text-(--muted) mt-1 line-clamp-2">{p.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: prio.bg, color: prio.text }}>{p.priority}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{p.status.replace("_", " ")}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-(--muted) uppercase tracking-wide">{label}</p>
      <p className="text-sm text-(--text) mt-0.5">{value || <span className="text-(--muted) italic">—</span>}</p>
    </div>
  );
}
