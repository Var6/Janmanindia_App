import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";

export default async function HrDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "hr" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pendingInvoices, socialWorkers, slaBreached] = dbOk
    ? await Promise.all([
        EodReport.find({ invoiceStatus: "pending" }).sort({ createdAt: -1 }).limit(10)
          .populate("submittedBy", "name email").lean(),
        User.find({ role: "socialworker", isActive: true })
          .select("name email socialWorkerProfile lastLoginAt").lean(),
        User.find({ role: "socialworker", "socialWorkerProfile.slaBreaches": { $gt: 0 } })
          .select("name email socialWorkerProfile").lean(),
      ])
    : [[], [], []] as const;

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}
      <TodoWidget userId={session.id} />

      <div>
        <h1 className="text-2xl font-bold text-(--text)">HR Dashboard</h1>
        <p className="text-sm text-(--muted) mt-1">Manage social workers, invoices and attendance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Pending Invoices",       value: pendingInvoices.length, highlight: pendingInvoices.length > 0 },
          { label: "Active Social Workers",  value: socialWorkers.length },
          { label: "SLA Breaches",           value: slaBreached.length,     highlight: slaBreached.length > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-(--surface) rounded-2xl border border-(--border) p-5">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.highlight ? "text-red-500" : "text-(--text)"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Invoice Queue */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">
            Pending Invoices
            {pendingInvoices.length > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{pendingInvoices.length}</span>
            )}
          </h2>
          <Link href="/hr/invoices" className="text-xs text-(--accent) hover:underline">View all</Link>
        </div>
        {pendingInvoices.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No pending invoices." : "Connect database to see invoices."}</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {pendingInvoices.map((report) => {
              const sw = report.submittedBy as unknown as { name: string; email: string };
              const total = report.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={String(report._id)} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{sw?.name}</p>
                    <p className="text-xs text-(--muted) mt-0.5">
                      {new Date(report.date).toLocaleDateString("en-IN")} · {report.hoursWorked}h · ₹{total.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={`/api/hr/invoice/${report._id}/approve`} method="POST">
                      <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">Approve</button>
                    </form>
                    <form action={`/api/hr/invoice/${report._id}/reject`} method="POST">
                      <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Reject</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SLA Monitor */}
      {slaBreached.length > 0 && (
        <section className="bg-(--surface) rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-700">SLA Breach Monitor</h2>
          </div>
          <div className="divide-y divide-(--border)">
            {slaBreached.map((sw) => (
              <div key={String(sw._id)} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-(--text)">{sw.name}</p>
                  <p className="text-xs text-(--muted)">{sw.email}</p>
                </div>
                <span className="text-sm font-bold text-red-500">{sw.socialWorkerProfile?.slaBreaches ?? 0} breaches</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attendance Overview */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">Social Workers</h2>
          <Link href="/hr/attendance" className="text-xs text-(--accent) hover:underline">Attendance</Link>
        </div>
        {socialWorkers.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No social workers found." : "Connect database to see workers."}</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {socialWorkers.map((sw) => {
              const lastLogin = sw.lastLoginAt ? new Date(sw.lastLoginAt) : null;
              const isActiveToday = lastLogin && lastLogin >= today;
              return (
                <div key={String(sw._id)} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{sw.name}</p>
                    <p className="text-xs text-(--muted)">{sw.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isActiveToday ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {isActiveToday ? "Active today" : "Absent"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { href: "/hr/onboarding", label: "Onboard Social Worker" },
          { href: "/hr/invoices",   label: "Review Invoices" },
          { href: "/hr/attendance", label: "Mark Attendance" },
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
