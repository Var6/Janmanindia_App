import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import Appointment from "@/models/Appointment";
import User from "@/models/User";
import { getCalendarEmbedUrl } from "@/lib/gcal";
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function LitigationDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const dbOk = await tryConnectDB();

  let allCases: any[] = [];
  let upcomingHearings: any[] = [];
  let pendingAppointments: any[] = [];
  let litigationUser: any = null;

  if (dbOk && mongoose.Types.ObjectId.isValid(session.id)) {
    const litigationId = new mongoose.Types.ObjectId(session.id);
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    [allCases, upcomingHearings, pendingAppointments, litigationUser] = await Promise.all([
      Case.find({ litigationMember: litigationId, status: { $in: ["Open", "Pending", "Escalated"] } })
        .sort({ updatedAt: -1 }).limit(8).lean(),
      Case.find({ litigationMember: litigationId, nextHearingDate: { $gte: new Date(), $lte: sevenDaysOut } })
        .sort({ nextHearingDate: 1 }).limit(5).lean(),
      Appointment.find({ litigationMember: litigationId, status: "approved_sw" })
        .sort({ proposedDate: 1 }).limit(5).populate("citizen", "name email").lean(),
      User.findById(litigationId).lean(),
    ]);
  }

  const calendarEmbedUrl = litigationUser?.email ? getCalendarEmbedUrl(litigationUser.email) : null;

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}
      <TodoWidget userId={session.id} />

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Litigation Dashboard</h1>
        <p className="text-sm text-(--muted) mt-1">Welcome, {session.name}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Cases",           value: allCases.length },
          { label: "Upcoming Hearings",      value: upcomingHearings.length },
          { label: "Pending Appointments",   value: pendingAppointments.length },
          { label: "Location",               value: litigationUser?.litigationProfile?.location?.district ?? "—" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-2xl p-5">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1 text-(--accent)">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border)">
            <h2 className="font-semibold text-(--text)">Upcoming Hearings (7 days)</h2>
          </div>
          {upcomingHearings.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">
              {dbOk ? "No hearings in the next 7 days." : "Connect database to see hearings."}
            </p>
          ) : (
            <div className="divide-y divide-(--border)">
              {upcomingHearings.map((c) => (
                <Link key={String(c._id)} href={`/litigation/cases/${c._id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-(--accent)/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{c.caseTitle}</p>
                    <p className="text-xs text-(--muted) mt-0.5">#{c.caseNumber}</p>
                  </div>
                  <span className="text-xs text-(--accent) font-medium shrink-0">
                    {new Date(c.nextHearingDate!).toLocaleDateString("en-IN")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Pending Appointments */}
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">Appointments Awaiting Confirmation</h2>
            <Link href="/litigation/appointments" className="text-xs text-(--accent) hover:underline">View all</Link>
          </div>
          {pendingAppointments.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">
              {dbOk ? "No pending appointments." : "Connect database to see appointments."}
            </p>
          ) : (
            <div className="divide-y divide-(--border)">
              {pendingAppointments.map((apt) => {
                const citizen = apt.citizen as unknown as { name: string; email: string };
                return (
                  <div key={String(apt._id)} className="px-6 py-4">
                    <p className="text-sm font-medium text-(--text)">{citizen?.name}</p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {new Date(apt.proposedDate).toLocaleDateString("en-IN")} · {apt.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Active Cases Table */}
      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">My Cases</h2>
          <Link href="/litigation/cases" className="text-xs text-(--accent) hover:underline">All cases</Link>
        </div>
        {allCases.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">
            {dbOk ? "No active cases." : "Connect database to see cases."}
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {allCases.map((c) => (
              <Link key={String(c._id)} href={`/litigation/cases/${c._id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-(--accent)/5 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--text) truncate">{c.caseTitle}</p>
                  <p className="text-xs text-(--muted) mt-0.5">#{c.caseNumber} · {c.path === "criminal" ? "Criminal" : "High Court"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Calendar Embed */}
      {calendarEmbedUrl && (
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border)">
            <h2 className="font-semibold text-(--text)">My Calendar</h2>
          </div>
          <div className="p-4">
            <iframe src={calendarEmbedUrl} width="100%" height="400"
              className="rounded-lg border border-(--border)" title="Google Calendar" />
          </div>
        </section>
      )}
    </div>
  );
}
