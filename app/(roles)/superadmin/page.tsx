import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import EodReport from "@/models/EodReport";
import SosAlert from "@/models/SosAlert";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function SuperAdminDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "superadmin") redirect("/login");

  const dbOk = await tryConnectDB();

  const [
    totalCases, openCases, totalUsers, activeUsers,
    pendingInvoices, openSos, unverifiedUsers, roleBreakdown,
    recentCases, recentUsers,
  ] = dbOk
    ? await Promise.all([
        Case.countDocuments({}),
        Case.countDocuments({ status: "Open" }),
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        EodReport.countDocuments({ invoiceStatus: "pending" }),
        SosAlert.countDocuments({ status: "open" }),
        User.countDocuments({ "citizenProfile.verificationStatus": "pending" }),
        User.aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Case.find({}).sort({ createdAt: -1 }).limit(5)
          .populate("citizen", "name").populate("litigationMember", "name").lean(),
        User.find({}).sort({ createdAt: -1 }).limit(5)
          .select("name email role isActive createdAt").lean(),
      ])
    : [0, 0, 0, 0, 0, 0, 0, [] as { _id: string; count: number }[], [], []] as const;

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Super Admin — Platform Overview</h1>
        <p className="text-sm text-(--muted) mt-1">Full system visibility and control</p>
      </div>

      {/* System KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cases",        value: totalCases },
          { label: "Open Cases",         value: openCases,         highlight: true },
          { label: "Total Users",        value: totalUsers },
          { label: "Active Users",       value: activeUsers },
          { label: "Pending Invoices",   value: pendingInvoices,   highlight: pendingInvoices > 0 },
          { label: "Open SOS Alerts",    value: openSos,           highlight: openSos > 0 },
          { label: "Unverified Citizens",value: unverifiedUsers,   highlight: unverifiedUsers > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-(--surface) rounded-2xl border border-(--border) p-5">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.highlight ? "text-(--accent)" : "text-(--text)"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Role Breakdown */}
      {roleBreakdown.length > 0 && (
        <section className="bg-(--surface) rounded-2xl border border-(--border) p-6">
          <h2 className="font-semibold text-(--text) mb-4">Users by Role</h2>
          <div className="flex flex-wrap gap-3">
            {roleBreakdown.map((rb) => (
              <div key={rb._id} className="px-4 py-2 rounded-lg border border-(--border) text-sm">
                <span className="capitalize text-(--text)">{rb._id}</span>
                <span className="ml-2 font-bold text-(--accent)">{rb.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">Recent Cases</h2>
            <Link href="/admin/cases" className="text-xs text-(--accent) hover:underline">All cases</Link>
          </div>
          {recentCases.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No cases yet." : "Connect database to see cases."}</p>
          ) : (
            <div className="divide-y divide-(--border)">
              {recentCases.map((c) => {
                const citizen = c.citizen as unknown as { name: string } | null;
                const lm = c.litigationMember as unknown as { name: string } | null;
                return (
                  <div key={String(c._id)} className="px-6 py-3">
                    <p className="text-sm font-medium text-(--text)">{c.caseTitle}</p>
                    <p className="text-xs text-(--muted) mt-0.5">{citizen?.name} · {lm ? lm.name : "Unassigned"} · {c.status}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Users */}
        <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">Recent Registrations</h2>
            <Link href="/admin/users" className="text-xs text-(--accent) hover:underline">All users</Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No users yet." : "Connect database to see users."}</p>
          ) : (
            <div className="divide-y divide-(--border)">
              {recentUsers.map((u) => (
                <div key={String(u._id)} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{u.name}</p>
                    <p className="text-xs text-(--muted)">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-(--accent)/10 text-(--accent) capitalize">{u.role}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Navigation to sub-panels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/admin",    label: "Admin Panel" },
          { href: "/hr",       label: "HR Panel" },
          { href: "/finance",  label: "Finance Panel" },
          { href: "/dev",      label: "Dev Bypass Panel" },
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
