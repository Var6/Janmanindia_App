import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import Appointment from "@/models/Appointment";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function QueriesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();

  const [pendingAppointments, recentCases] = dbOk
    ? await Promise.all([
        Appointment.find({ socialWorker: session.id, status: "pending_sw" })
          .populate("citizen", "name email phone")
          .sort({ requestedAt: -1 })
          .lean(),
        Case.find({ socialWorker: session.id, status: { $in: ["Open", "Escalated"] } })
          .populate("citizen", "name")
          .populate("litigationMember", "name")
          .sort({ updatedAt: -1 })
          .limit(20)
          .lean(),
      ])
    : [[], []];

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Queries &amp; Communications</h1>
        <p className="text-sm text-(muted) mt-1">
          Appointment requests from citizens and open case communications. SLA: resolve within 7–14 days.
        </p>
      </div>

      {/* Appointment approvals */}
      <section>
        <h2 className="font-semibold text-(text) mb-3">
          Appointment Requests Pending Approval
          {pendingAppointments.length > 0 && (
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {pendingAppointments.length}
            </span>
          )}
        </h2>
        {pendingAppointments.length === 0 ? (
          <div className="py-8 text-center bg-(surface) rounded-2xl border border-(border)">
            <p className="text-sm text-(muted)">{dbOk ? "No pending appointment requests." : "Connect database."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map((apt) => {
              const citizen = apt.citizen as unknown as { name: string; email: string; phone?: string } | null;
              const daysAgo = Math.floor((Date.now() - new Date(apt.requestedAt).getTime()) / 86400000);
              const overSla = daysAgo >= 7;
              return (
                <div key={String(apt._id)} className={`rounded-2xl border p-5 ${overSla ? "bg-red-50 border-red-200" : "bg-(surface) border-(border)"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-(text)">{citizen?.name ?? "Unknown"}</p>
                      <p className="text-xs text-(muted)">{citizen?.email}{citizen?.phone ? ` · ${citizen.phone}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-(muted)">{daysAgo}d ago</p>
                      {overSla && <span className="text-xs font-semibold text-red-600">SLA breach!</span>}
                    </div>
                  </div>
                  <p className="text-sm text-(muted) mb-1">Reason: {apt.reason}</p>
                  <p className="text-xs text-(muted) mb-3">
                    Proposed: {new Date(apt.proposedDate).toLocaleDateString("en-IN")}
                  </p>
                  <div className="flex gap-2">
                    <form method="POST" action={`/api/appointments?id=${String(apt._id)}&action=approve`}>
                      <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600">
                        Approve &amp; Pass to Lawyer
                      </button>
                    </form>
                    <form method="POST" action={`/api/appointments?id=${String(apt._id)}&action=reject`}>
                      <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-(bg) border border-(border) text-(text) hover:bg-red-50 hover:border-red-200 hover:text-red-700">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Open cases needing communication */}
      <section>
        <h2 className="font-semibold text-(text) mb-3">Active Cases — Communication Hub</h2>
        {recentCases.length === 0 ? (
          <div className="py-8 text-center bg-(surface) rounded-2xl border border-(border)">
            <p className="text-sm text-(muted)">{dbOk ? "No active cases." : "Connect database."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCases.map((c) => {
              const citizen = c.citizen as unknown as { name: string } | null;
              const lawyer = c.litigationMember as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="bg-(surface) rounded-2xl border border-(border) p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-(text)">{c.caseTitle}</p>
                      <p className="text-xs text-(muted) mt-0.5">
                        Citizen: {citizen?.name ?? "—"} · Lawyer: {lawyer?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
