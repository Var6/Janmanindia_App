import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function AdminDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/login");

  await connectDB();

  const [allCases, litigationMembers, totalUsers, unassignedCases] = await Promise.all([
    Case.find({})
      .sort({ updatedAt: -1 })
      .limit(15)
      .populate("litigationMember", "name")
      .populate("citizen", "name")
      .lean(),
    User.find({ role: "litigation", isActive: true })
      .select("name litigationProfile.activeCaseCount litigationProfile.location")
      .lean(),
    User.countDocuments({}),
    Case.countDocuments({ litigationMember: { $exists: false }, status: "Open" }),
  ]);

  const totalCases = allCases.length;
  const openCases = allCases.filter((c) => c.status === "Open").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Platform overview and management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers },
          { label: "Total Cases", value: totalCases },
          { label: "Open Cases", value: openCases, highlight: true },
          { label: "Unassigned Cases", value: unassignedCases, highlight: unassignedCases > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <p className="text-xs text-[var(--muted)]">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.highlight ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Cases */}
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">Recent Cases</h2>
            <Link href="/admin/cases" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {allCases.slice(0, 8).map((c) => {
              const lm = c.litigationMember as unknown as { name: string } | null;
              const citizen = c.citizen as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{c.caseTitle}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {citizen?.name} &middot; {lm ? `Assigned: ${lm.name}` : "Unassigned"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Litigation Members Workload */}
        <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">Litigation Workload</h2>
            <Link href="/admin/assign" className="text-xs text-[var(--accent)] hover:underline">Reassign</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {litigationMembers.map((lm) => (
              <div key={String(lm._id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{lm.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {lm.litigationProfile?.location?.district ?? "—"}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--accent)]">
                  {lm.litigationProfile?.activeCaseCount ?? 0} cases
                </span>
              </div>
            ))}
            {litigationMembers.length === 0 && (
              <p className="px-6 py-6 text-sm text-[var(--muted)] text-center">No litigation members found.</p>
            )}
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/admin/users", label: "Manage Users" },
          { href: "/admin/assign", label: "Reassign Cases" },
          { href: "/admin/cases", label: "All Cases" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-sm font-medium text-center text-[var(--text)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
