import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import Case from "@/models/Case";
import SosAlert from "@/models/SosAlert";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "var(--info-bg)",    text: "var(--info-text)"    },
  Escalated: { bg: "var(--error-bg)",   text: "var(--error-text)"   },
  Pending:   { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  Closed:    { bg: "var(--bg)",         text: "var(--muted)"        },
  Dismissed: { bg: "var(--bg)",         text: "var(--muted)"        },
};

export default async function SocialWorkerDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();

  let sw: any = null;
  let pendingVerifications: any[] = [];
  let openSos: any[] = [];
  let activeCases: any[] = [];
  
  if (dbOk && mongoose.Types.ObjectId.isValid(session.id)) {
    const swId = new mongoose.Types.ObjectId(session.id);
    [sw, pendingVerifications, openSos, activeCases] = await Promise.all([
      User.findById(swId).lean(),
      User.find({ role: "community", "citizenProfile.verificationStatus": "pending" }).limit(10).lean(),
      SosAlert.find({ status: "open" }).limit(10).lean(),
      Case.find({ socialWorker: swId, status: "Open" }).limit(10).lean(),
    ]);
  }

  const profile = sw?.socialWorkerProfile;

  const kpis = [
    {
      label: "Open Tickets",
      value: profile?.openTickets ?? 0,
      icon: "📂",
      accent: "var(--info)",
      bg: "var(--info-bg)",
      text: "var(--info-text)",
    },
    {
      label: "Resolved",
      value: profile?.resolvedTickets ?? 0,
      icon: "✅",
      accent: "var(--success)",
      bg: "var(--success-bg)",
      text: "var(--success-text)",
    },
    {
      label: "Avg Resolution",
      value: `${(profile?.avgResolutionTimeDays ?? 0).toFixed(1)}d`,
      icon: "⏱",
      accent: "var(--accent)",
      bg: "var(--accent-subtle)",
      text: "var(--sidebar-active-text)",
    },
    {
      label: "SLA Breaches",
      value: profile?.slaBreaches ?? 0,
      icon: (profile?.slaBreaches ?? 0) > 0 ? "⚠️" : "🎯",
      accent: (profile?.slaBreaches ?? 0) > 0 ? "var(--error)" : "var(--success)",
      bg: (profile?.slaBreaches ?? 0) > 0 ? "var(--error-bg)" : "var(--success-bg)",
      text: (profile?.slaBreaches ?? 0) > 0 ? "var(--error-text)" : "var(--success-text)",
    },
  ];

  return (
    <div className="space-y-7">
      {!dbOk && <NoDBBanner />}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Social Worker Dashboard</h1>
          <p className="text-sm text-(--muted) mt-0.5">Welcome back, {session.name}</p>
        </div>
        <Link href="/socialworker/reports"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-(--accent-contrast) hover:brightness-110 transition shrink-0"
          style={{ background: "var(--accent)" }}>
          + EOD Report
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label}
            className="rounded-2xl border border-(--border) p-5 flex flex-col gap-3"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-(--muted)">{kpi.label}</p>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: kpi.bg }}>
                {kpi.icon}
              </span>
            </div>
            <p className="text-3xl font-bold" style={{ color: kpi.accent }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ID Verification Queue */}
        <section className="rounded-2xl border border-(--border) overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-(--text)">ID Verification Queue</h2>
              {pendingVerifications.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                  {pendingVerifications.length}
                </span>
              )}
            </div>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm text-(--muted)">
                {dbOk ? "No pending verifications." : "Connect database to see queue."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {pendingVerifications.map((u) => (
                <div key={String(u._id)} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "var(--accent-muted)", color: "var(--sidebar-active-text)" }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--text) truncate">{u.name}</p>
                      <p className="text-xs text-(--muted) truncate">{u.citizenProfile?.govtIdType ?? "—"} · {u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {u.citizenProfile?.govtIdUrl && (
                      <a href={u.citizenProfile.govtIdUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-(--border) text-(--text) hover:border-(--accent) transition-colors">
                        View ID
                      </a>
                    )}
                    <VerifyButtons userId={String(u._id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Open SOS Alerts */}
        <section className="rounded-2xl border border-(--border) overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-(--text)">Open SOS Alerts</h2>
              {openSos.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                  {openSos.length}
                </span>
              )}
            </div>
            <Link href="/socialworker/escalate"
              className="text-xs font-medium text-(--accent) hover:underline">
              Manage →
            </Link>
          </div>

          {openSos.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-(--muted)">
                {dbOk ? "No open SOS alerts." : "Connect database to see alerts."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {openSos.map((sos) => (
                <div key={String(sos._id)} className="px-5 py-3.5 flex items-start gap-3">
                  <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ background: "var(--error)" }} />
                  <div className="min-w-0">
                    <p className="text-sm text-(--text) leading-snug">{sos.description}</p>
                    <p className="text-xs text-(--muted) mt-1">
                      📍 {sos.location} · {new Date((sos as unknown as { createdAt: Date }).createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Active Cases */}
      <section className="rounded-2xl border border-(--border) overflow-hidden"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text)">My Active Cases</h2>
          <Link href="/socialworker/cases" className="text-xs font-medium text-(--accent) hover:underline">
            All cases →
          </Link>
        </div>

        {activeCases.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm text-(--muted)">
              {dbOk ? "No active cases assigned." : "Connect database to see cases."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {activeCases.map((c) => {
              const sc = STATUS_COLORS[c.status] ?? { bg: "var(--bg)", text: "var(--muted)" };
              return (
                <div key={String(c._id)} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text) truncate">{c.caseTitle}</p>
                    <p className="text-xs text-(--muted) mt-0.5">#{c.caseNumber} · {c.path === "criminal" ? "Criminal" : "High Court"}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: sc.bg, color: sc.text }}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/socialworker/reports",      label: "Submit EOD Report", icon: "📄" },
          { href: "/socialworker/media-upload",  label: "Upload Media",      icon: "📤" },
          { href: "/socialworker/queries",       label: "Queries Inbox",     icon: "💬" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-3 p-4 rounded-xl border border-(--border) hover:border-(--accent) transition-colors"
            style={{ background: "var(--surface)" }}>
            <span className="text-xl">{link.icon}</span>
            <span className="text-sm font-medium text-(--text)">{link.label}</span>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5 text-(--muted) ml-auto">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

function VerifyButtons({ userId }: { userId: string }) {
  return (
    <div className="flex gap-1.5">
      <form action="/api/users/verify-id" method="POST">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="verified" />
        <button type="submit"
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
          Approve
        </button>
      </form>
      <form action="/api/users/verify-id" method="POST">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="rejected" />
        <button type="submit"
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          Reject
        </button>
      </form>
    </div>
  );
}
