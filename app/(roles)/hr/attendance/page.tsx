import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function HrAttendancePage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "hr" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [socialWorkers, todayReports] = dbOk
    ? await Promise.all([
        User.find({ role: "socialworker", isActive: true })
          .select("name email lastLoginAt socialWorkerProfile")
          .lean(),
        EodReport.find({ date: { $gte: todayStart, $lte: todayEnd } })
          .select("submittedBy")
          .lean(),
      ])
    : [[], []];

  const submittedIds = new Set(todayReports.map((r) => String(r.submittedBy)));

  const present = socialWorkers.filter((sw) => {
    const lastLogin = sw.lastLoginAt ? new Date(sw.lastLoginAt) : null;
    return lastLogin && lastLogin >= todayStart;
  });
  const absent = socialWorkers.filter((sw) => {
    const lastLogin = sw.lastLoginAt ? new Date(sw.lastLoginAt) : null;
    return !lastLogin || lastLogin < todayStart;
  });
  const missingEod = socialWorkers.filter((sw) => !submittedIds.has(String(sw._id)));

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Attendance — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
        <p className="text-sm text-(muted) mt-1">Social worker presence based on last login and EOD report submission.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-green-50 border-green-200 text-green-700">
          <p className="text-2xl font-bold">{present.length}</p>
          <p className="text-xs mt-0.5">Logged in today</p>
        </div>
        <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-700">
          <p className="text-2xl font-bold">{absent.length}</p>
          <p className="text-xs mt-0.5">No login today</p>
        </div>
        <div className="p-4 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-700">
          <p className="text-2xl font-bold">{missingEod.length}</p>
          <p className="text-xs mt-0.5">Missing EOD report</p>
        </div>
      </div>

      {absent.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Absent / Not Logged In</h2>
          <div className="bg-(surface) rounded-2xl border border-red-200 overflow-hidden">
            <div className="divide-y divide-(border)">
              {absent.map((sw) => (
                <div key={String(sw._id)} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-(text)">{sw.name}</p>
                    <p className="text-xs text-(muted)">
                      {sw.email} · Last seen: {sw.lastLoginAt ? new Date(sw.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-red-600">Absent</span>
                    <form method="POST" action={`/api/hr/mark-absent?id=${String(sw._id)}`}>
                      <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                        Mark Absent
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {missingEod.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Missing EOD Report Today</h2>
          <div className="bg-(surface) rounded-2xl border border-yellow-200 overflow-hidden">
            <div className="divide-y divide-(border)">
              {missingEod.map((sw) => (
                <div key={String(sw._id)} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-(text)">{sw.name}</p>
                    <p className="text-xs text-(muted)">
                      SLA breaches: {sw.socialWorkerProfile?.slaBreaches ?? 0} · Open tickets: {sw.socialWorkerProfile?.openTickets ?? 0}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-yellow-600">No EOD</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {present.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Present ({present.length})</h2>
          <div className="bg-(surface) rounded-2xl border border-green-200 overflow-hidden">
            <div className="divide-y divide-(border)">
              {present.map((sw) => (
                <div key={String(sw._id)} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-(text)">{sw.name}</p>
                    <p className="text-xs text-(muted)">
                      Last login: {sw.lastLoginAt ? new Date(sw.lastLoginAt).toLocaleTimeString("en-IN") : "—"}
                      {submittedIds.has(String(sw._id)) ? " · EOD submitted ✓" : " · EOD pending"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600">Present</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
