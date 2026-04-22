import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import Case from "@/models/Case";
import SosAlert from "@/models/SosAlert";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function SocialWorkerDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();

  const [sw, pendingVerifications, openSos, activeCases] = dbOk
    ? await Promise.all([
        User.findById(session.id).lean(),
        User.find({ role: "user", "citizenProfile.verificationStatus": "pending" }).limit(10).lean(),
        SosAlert.find({ status: "open" }).limit(10).lean(),
        Case.find({ socialWorker: session.id, status: "Open" }).limit(10).lean(),
      ])
    : [null, [], [], []] as const;

  const profile = sw?.socialWorkerProfile;

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Social Worker Dashboard</h1>
        <p className="text-sm text-(--muted) mt-1">Welcome, {session.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open Tickets",    value: profile?.openTickets ?? 0,                                  color: "text-blue-600" },
          { label: "Resolved",        value: profile?.resolvedTickets ?? 0,                              color: "text-green-600" },
          { label: "Avg Resolution",  value: `${(profile?.avgResolutionTimeDays ?? 0).toFixed(1)}d`,     color: "text-(--accent)" },
          { label: "SLA Breaches",    value: profile?.slaBreaches ?? 0,
            color: (profile?.slaBreaches ?? 0) > 0 ? "text-red-600" : "text-green-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-(--surface) rounded-2xl border border-(--border) p-5">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ID Verification Queue */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">
            ID Verification Queue
            {pendingVerifications.length > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{pendingVerifications.length}</span>
            )}
          </h2>
        </div>
        {pendingVerifications.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">
            {dbOk ? "No pending verifications." : "Connect database to see verification queue."}
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {pendingVerifications.map((u) => (
              <div key={String(u._id)} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm text-(--text)">{u.name}</p>
                  <p className="text-xs text-(--muted)">{u.email}</p>
                  <p className="text-xs text-(--muted) mt-0.5">ID Type: {u.citizenProfile?.govtIdType ?? "—"}</p>
                </div>
                <div className="flex gap-2">
                  {u.citizenProfile?.govtIdUrl && (
                    <a href={u.citizenProfile.govtIdUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg border border-(--border) hover:border-(--accent) text-(--text) transition-colors">
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
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">
            Open SOS Alerts
            {openSos.length > 0 && (
              <span className="ml-2 text-xs bg-orange-500 text-white rounded-full px-2 py-0.5">{openSos.length}</span>
            )}
          </h2>
          <Link href="/socialworker/escalate" className="text-xs text-(--accent) hover:underline">Manage</Link>
        </div>
        {openSos.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">
            {dbOk ? "No open SOS alerts." : "Connect database to see SOS alerts."}
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {openSos.map((sos) => (
              <div key={String(sos._id)} className="px-6 py-4">
                <p className="text-sm font-medium text-(--text)">{sos.description}</p>
                <p className="text-xs text-(--muted) mt-0.5">
                  Location: {sos.location} · {new Date((sos as unknown as { createdAt: Date }).createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Cases */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">My Active Cases</h2>
          <Link href="/socialworker/cases" className="text-xs text-(--accent) hover:underline">All cases</Link>
        </div>
        {activeCases.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">
            {dbOk ? "No active cases assigned." : "Connect database to see cases."}
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {activeCases.map((c) => (
              <div key={String(c._id)} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-(--text)">{c.caseTitle}</p>
                  <p className="text-xs text-(--muted) mt-0.5">#{c.caseNumber}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { href: "/socialworker/reports",      label: "Submit EOD Report" },
          { href: "/socialworker/media-upload",  label: "Upload Media" },
          { href: "/socialworker/queries",       label: "Queries Inbox" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="p-4 rounded-xl bg-(--surface) border border-(--border) hover:border-(--accent) transition-colors text-sm font-medium text-center text-(--text)">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function VerifyButtons({ userId }: { userId: string }) {
  return (
    <div className="flex gap-2">
      <form action="/api/users/verify-id" method="POST">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="verified" />
        <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">Approve</button>
      </form>
      <form action="/api/users/verify-id" method="POST">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="rejected" />
        <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Reject</button>
      </form>
    </div>
  );
}
