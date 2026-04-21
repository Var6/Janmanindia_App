import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import EodReport from "@/models/EodReport";
import SosAlert from "@/models/SosAlert";

export default async function SuperAdminDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "superadmin") redirect("/login");

  await connectDB();

  const [
    totalCases,
    openCases,
    totalUsers,
    activeUsers,
    pendingInvoices,
    openSos,
    unverifiedUsers,
    roleBreakdown,
  ] = await Promise.all([
    Case.countDocuments({}),
    Case.countDocuments({ status: "Open" }),
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    EodReport.countDocuments({ invoiceStatus: "pending" }),
    SosAlert.countDocuments({ status: "open" }),
    User.countDocuments({ "citizenProfile.verificationStatus": "pending" }),
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const recentCases = await Case.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("citizen", "name")
    .populate("litigationMember", "name")
    .lean();

  const recentUsers = await User.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email role isActive createdAt")
    .lean();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Super Admin — Platform Overview</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Full system visibility and control</p>
      </div>

      {/* System KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cases", value: totalCases },
          { label: "Open Cases", value: openCases, highlight: true },
          { label: "Total Users", value: totalUsers },
          { label: "Active Users", value: activeUsers },
          { label: "Pending Invoices", value: pendingInvoices, highlight: pendingInvoices > 0 },
          { label: "Open SOS Alerts", value: openSos, highlight: openSos > 0 },
          { label: "Unverified Citizens", value: unverifiedUsers, highlight: unverifiedUsers > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <p className="text-xs text-[var(--muted)]">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.highlight ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Role Breakdown */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h2 className="font-semibold text-[var(--text)] mb-4">Users by Role</h2>
        <div className="flex flex-wrap gap-3">
          {roleBreakdown.map((rb: { _id: string; count: number }) => (
            <div key={rb._id} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm">
              <span className="capitalize text-[var(--text)]">{rb._id}</span>
              <span className="ml-2 font-bold text-[var(--accent)]">{rb.count}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">Recent Cases</h2>
            <Link href="/admin/cases" className="text-xs text-[var(--accent)] hover:underline">All cases</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentCases.map((c) => {
              const citizen = c.citizen as unknown as { name: string } | null;
              const lm = c.litigationMember as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="px-6 py-3">
                  <p className="text-sm font-medium text-[var(--text)]">{c.caseTitle}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {citizen?.name} &middot; {lm ? lm.name : "Unassigned"} &middot; {c.status}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Users */}
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">Recent Registrations</h2>
            <Link href="/admin/users" className="text-xs text-[var(--accent)] hover:underline">All users</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentUsers.map((u) => (
              <div key={String(u._id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{u.name}</p>
                  <p className="text-xs text-[var(--muted)]">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] capitalize">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Navigation to sub-panels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/admin", label: "Admin Panel" },
          { href: "/hr", label: "HR Panel" },
          { href: "/finance", label: "Finance Panel" },
          { href: "/socialworker", label: "Social Worker View" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-sm font-medium text-center text-[var(--text)]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
