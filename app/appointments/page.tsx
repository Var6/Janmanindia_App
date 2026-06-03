"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookAppointmentForm from "@/components/appointments/BookAppointmentForm";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

type UserRef = { _id: string; name: string; email: string; role?: string };
type Hearing = {
  _id: string;
  caseTitle: string;
  caseNumber?: string;
  nextHearingDate: string;
  courtName?: string;
  courtType?: string;
  status: string;
};
type Appointment = {
  _id: string;
  status: string;
  reason: string;
  proposedDate: string;
  endDate?: string;
  community?: UserRef | null;
  socialWorker?: UserRef | null;
  litigationMember?: UserRef | null;
  requester?: UserRef | null;
  requestee?: UserRef | null;
  coAttendees?: UserRef[];
  responseNotes?: string;
  swNotes?: string;
  litigationNotes?: string;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:              { bg: "var(--warning-bg)", text: "var(--warning-text)", label: "Awaiting their response" },
  pending_sw:           { bg: "var(--warning-bg)", text: "var(--warning-text)", label: "Awaiting Social Worker" },
  approved_sw:          { bg: "var(--info-bg)",    text: "var(--info-text)",    label: "Approved — Awaiting Lawyer" },
  confirmed_litigation: { bg: "var(--success-bg)", text: "var(--success-text)", label: "Confirmed" },
  confirmed:            { bg: "var(--success-bg)", text: "var(--success-text)", label: "Confirmed" },
  rejected:             { bg: "var(--error-bg)",   text: "var(--error-text)",   label: "Declined" },
  cancelled:            { bg: "var(--bg-secondary)", text: "var(--muted)",      label: "Cancelled" },
};

export default function AppointmentsHub() {
  const t = useT();
  const [me, setMe] = useState<{ _id: string; role: string } | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [meRes, listRes, hearingsRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/appointments"),
        // Endpoint silently returns [] for roles without case access, so it's
        // safe to call unconditionally and gate the section on .length.
        fetch("/api/cases/hearings"),
      ]);
      const meData = await meRes.json();
      const listData = await listRes.json();
      const hearingsData = await hearingsRes.json();
      if (meData.user) setMe({ _id: meData.user._id, role: meData.user.role });
      setAppts(listData.appointments ?? []);
      setHearings(hearingsData.hearings ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function respond(id: string, decision: "approve" | "reject") {
    await fetch("/api/appointments", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, action: "respond", decision }),
    });
    load();
  }
  async function cancel(id: string) {
    await fetch("/api/appointments", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, action: "cancel" }),
    });
    load();
  }
  /** Litigation chain action — used when a social worker has handed an
   *  appointment off to a lawyer (status "approved_sw") and the lawyer has
   *  to confirm or decline it. */
  async function decideLitigation(id: string, decision: "approve" | "reject") {
    await fetch("/api/appointments", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: id,
        action: decision === "approve" ? "confirm_litigation" : "reject_litigation",
      }),
    });
    load();
  }

  const myId = me?._id;
  // The "incoming" bucket is for direct peer-to-peer requests (status pending)
  // that the current user must respond to. The "litigationPending" bucket is the
  // legacy SW-routed flow where a lawyer has to confirm an appointment a social
  // worker already approved on their behalf.
  const incoming = appts.filter(a => myId && a.requestee?._id === myId && a.status === "pending");
  const litigationPending = appts.filter(a =>
    myId && me?.role === "litigation"
    && a.status === "approved_sw"
    && a.litigationMember?._id === myId
  );
  const outgoing = appts.filter(a => myId && a.requester?._id === myId && ["pending", "confirmed", "rejected", "cancelled"].includes(a.status));
  // Confirmed / upcoming meetings — include ones the user was invited to as a
  // co-attendee so group meetings actually show up in their list.
  const upcoming = appts.filter(a => {
    if (litigationPending.includes(a)) return false;
    if (!["confirmed", "confirmed_litigation", "approved_sw"].includes(a.status)) return false;
    return true;
  });
  const handled = new Set([...incoming, ...litigationPending, ...outgoing, ...upcoming]);
  const others   = appts.filter(a => !handled.has(a));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">{t("Appointments")}</h1>
          <p className="text-sm text-(--muted) mt-1">
            {t("Book a slot with anyone in the org. Calendar conflicts are checked before sending.")}
          </p>
        </div>
        {me && (
          <BookAppointmentForm
            allowedRoles={
              me.role === "community"
                ? ["socialworker", "litigation", "hr", "finance"]
                : ["socialworker", "litigation", "hr", "finance", "community", "director"]
            }
            onCreated={load}
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : (
        <>
          <HearingsSection hearings={hearings} role={me?.role} />
          {litigationPending.length > 0 && (
            <Section title={`${t("Awaiting your confirmation")} (${litigationPending.length})`}
              empty="" appts={litigationPending}
              myId={myId} onRespond={respond} onCancel={cancel}
              onLitigationDecide={decideLitigation} />
          )}
          <Section title={`${t("Incoming requests")}${incoming.length ? ` (${incoming.length})` : ""}`}
            empty={t("No pending requests need your response.")} appts={incoming}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title={`${t("Upcoming")}${upcoming.length ? ` (${upcoming.length})` : ""}`}
            empty={t("No confirmed meetings scheduled.")} appts={upcoming}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title={t("My outgoing requests")} empty={t("You haven't requested any meetings yet.")} appts={outgoing}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title={t("Other")} empty="" appts={others}
            myId={myId} onRespond={respond} onCancel={cancel} />
        </>
      )}
    </div>
  );
}

function Section({ title, empty, appts, myId, onRespond, onCancel, onLitigationDecide }: {
  title: string;
  empty: string;
  appts: Appointment[];
  myId?: string;
  onRespond: (id: string, decision: "approve" | "reject") => void;
  onCancel: (id: string) => void;
  /** Optional — only the litigation-chain section passes this in. */
  onLitigationDecide?: (id: string, decision: "approve" | "reject") => void;
}) {
  const t = useT();
  if (appts.length === 0 && !empty) return null;
  return (
    <section>
      <h2 className="font-semibold text-(--text) mb-3">{title}</h2>
      {appts.length === 0 ? (
        <p className="text-sm text-(--muted) px-1">{empty}</p>
      ) : (
        <div className="space-y-3">
          {appts.map(a => {
            const stat = STATUS_STYLE[a.status] ?? { bg: "var(--bg-secondary)", text: "var(--muted)", label: a.status };
            const isRequestee = a.requestee?._id === myId;
            const isRequester = a.requester?._id === myId;
            const otherParty = isRequestee ? a.requester : a.requestee;
            const startStr = new Date(a.proposedDate).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <article key={a._id} className="rounded-2xl border p-4"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-(--text)">
                      {isRequester ? `→ ${otherParty?.name ?? a.socialWorker?.name ?? "—"}` : `← from ${otherParty?.name ?? a.community?.name ?? "—"}`}
                    </p>
                    <p className="text-xs text-(--muted)">{startStr}{a.endDate && ` – ${new Date(a.endDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0"
                    style={{ background: stat.bg, color: stat.text }}>{stat.label}</span>
                </div>
                <p className="text-sm text-(--text)">{a.reason}</p>
                {a.coAttendees && a.coAttendees.length > 0 && (
                  <p className="text-xs text-(--muted) mt-1">
                    {t("Also invited:")} {a.coAttendees.map((u) => u.name).join(", ")}
                  </p>
                )}
                {a.responseNotes && <p className="text-xs text-(--muted) mt-1">{t("Note:")} {a.responseNotes}</p>}
                {a.swNotes && <p className="text-xs text-(--muted) mt-1">{t("SW note:")} {a.swNotes}</p>}
                {a.litigationNotes && <p className="text-xs text-(--muted) mt-1">{t("Lawyer note:")} {a.litigationNotes}</p>}

                {isRequestee && a.status === "pending" && (
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => onRespond(a._id, "approve")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--success)", color: "#fff" }}>{t("Approve")}</button>
                    <button onClick={() => onRespond(a._id, "reject")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{t("Decline")}</button>
                  </div>
                )}
                {onLitigationDecide && a.status === "approved_sw" && a.litigationMember?._id === myId && (
                  <div className="flex flex-col gap-2 mt-3">
                    {a.swNotes && (
                      <p className="text-xs text-(--muted)">{t("Social worker note:")} {a.swNotes}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => onLitigationDecide(a._id, "approve")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                        {t("Confirm appointment")}
                      </button>
                      <button onClick={() => onLitigationDecide(a._id, "reject")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                        {t("Decline")}
                      </button>
                    </div>
                  </div>
                )}
                {isRequester && (a.status === "pending" || a.status === "confirmed") && (
                  <div className="mt-3">
                    <button onClick={() => onCancel(a._id)}
                      className="px-3 py-1 rounded-lg text-xs"
                      style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>{t("Cancel request")}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HearingsSection({ hearings, role }: { hearings: Hearing[]; role?: string }) {
  const t = useT();
  if (hearings.length === 0) return null;
  const baseHref = role === "litigation" ? "/litigation/cases" : role === "director" || role === "superadmin" ? "/director/cases" : null;
  if (!baseHref) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <section>
      <h2 className="font-semibold text-(--text) mb-3">
        {t("Upcoming court hearings")}
        <span className="ml-2 text-xs font-normal text-(--muted)">
          ({hearings.length} {t("in next 60 days")})
        </span>
      </h2>
      <div className="space-y-2">
        {hearings.map((h) => {
          const d = new Date(h.nextHearingDate);
          const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
          const courtLabel = h.courtName
            ?? (h.courtType === "supreme" ? t("Supreme Court")
              : h.courtType === "district" ? t("District Court")
              : t("High Court"));
          return (
            <Link key={h._id} href={`${baseHref}/${h._id}`}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl border transition-colors hover:border-(--accent)"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5"
                style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                {t("Hearing")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--text) truncate">{h.caseTitle}</p>
                <p className="text-xs text-(--muted) mt-0.5 truncate">
                  {h.caseNumber ? `${h.caseNumber} · ` : ""}{courtLabel} · {h.status}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-(--text)">
                  {d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
                <p className="text-[10px]"
                  style={{ color: days <= 3 ? "var(--error-text)" : "var(--muted)" }}>
                  {days === 0 ? t("Today") : days === 1 ? t("Tomorrow") : `in ${days}d`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
