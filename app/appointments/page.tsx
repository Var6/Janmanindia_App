"use client";

import { useEffect, useState } from "react";
import BookAppointmentForm from "@/components/appointments/BookAppointmentForm";

type UserRef = { _id: string; name: string; email: string; role?: string };
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
  const [me, setMe] = useState<{ _id: string; role: string } | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [meRes, listRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/appointments"),
      ]);
      const meData = await meRes.json();
      const listData = await listRes.json();
      if (meData.user) setMe({ _id: meData.user._id, role: meData.user.role });
      setAppts(listData.appointments ?? []);
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

  const myId = me?._id;
  const incoming = appts.filter(a => myId && a.requestee?._id === myId && a.status === "pending");
  const outgoing = appts.filter(a => myId && a.requester?._id === myId && ["pending", "confirmed", "rejected", "cancelled"].includes(a.status));
  const upcoming = appts.filter(a => ["confirmed", "confirmed_litigation", "approved_sw"].includes(a.status));
  const others   = appts.filter(a => !incoming.includes(a) && !outgoing.includes(a) && !upcoming.includes(a));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Appointments</h1>
          <p className="text-sm text-(--muted) mt-1">
            Book a slot with anyone in the org. Calendar conflicts are checked before sending.
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

      {loading ? <p className="text-sm text-(--muted)">Loading…</p> : (
        <>
          <Section title={`Incoming requests${incoming.length ? ` (${incoming.length})` : ""}`}
            empty="No pending requests need your response." appts={incoming}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title={`Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}`}
            empty="No confirmed meetings scheduled." appts={upcoming}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title="My outgoing requests" empty="You haven't requested any meetings yet." appts={outgoing}
            myId={myId} onRespond={respond} onCancel={cancel} />
          <Section title="Other" empty="" appts={others}
            myId={myId} onRespond={respond} onCancel={cancel} />
        </>
      )}
    </div>
  );
}

function Section({ title, empty, appts, myId, onRespond, onCancel }: {
  title: string;
  empty: string;
  appts: Appointment[];
  myId?: string;
  onRespond: (id: string, decision: "approve" | "reject") => void;
  onCancel: (id: string) => void;
}) {
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
                {a.responseNotes && <p className="text-xs text-(--muted) mt-1">Note: {a.responseNotes}</p>}
                {a.swNotes && <p className="text-xs text-(--muted) mt-1">SW note: {a.swNotes}</p>}
                {a.litigationNotes && <p className="text-xs text-(--muted) mt-1">Lawyer note: {a.litigationNotes}</p>}

                {isRequestee && a.status === "pending" && (
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => onRespond(a._id, "approve")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--success)", color: "#fff" }}>Approve</button>
                    <button onClick={() => onRespond(a._id, "reject")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>Decline</button>
                  </div>
                )}
                {isRequester && (a.status === "pending" || a.status === "confirmed") && (
                  <div className="mt-3">
                    <button onClick={() => onCancel(a._id)}
                      className="px-3 py-1 rounded-lg text-xs"
                      style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>Cancel request</button>
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
