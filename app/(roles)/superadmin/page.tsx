import { redirect } from "next/navigation";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import EodReport from "@/models/EodReport";
import SosAlert from "@/models/SosAlert";
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";
import { getServerT } from "@/lib/i18n-server";

export default async function SuperAdminDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "superadmin") redirect("/login");
  const t = await getServerT();

  const dbOk = await tryConnectDB();

  const [
    totalCases, openCases, totalUsers, activeUsers,
    pendingInvoices, openSos, unverifiedUsers, roleBreakdown,
    recentCases, recentUsers,
  ] = dbOk
    ? await Promise.all([
        Case.countDocuments({ isPrivate: { $ne: true } }),
        Case.countDocuments({ status: "Open", isPrivate: { $ne: true } }),
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        EodReport.countDocuments({ invoiceStatus: "pending" }),
        SosAlert.countDocuments({ status: "open" }),
        User.countDocuments({ "communityProfile.verificationStatus": "pending" }),
        User.aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Case.find({ isPrivate: { $ne: true } }).sort({ createdAt: -1 }).limit(5)
          .populate("community", "name").populate("litigationMember", "name").lean(),
        User.find({}).sort({ createdAt: -1 }).limit(5)
          .select("name email role isActive createdAt").lean(),
      ])
    : [0, 0, 0, 0, 0, 0, 0, [] as { _id: string; count: number }[], [], []] as const;

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}
      <TodoWidget userId={session.id} />

      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Super Admin — Platform Overview")}</h1>
        <p className="text-sm text-(--muted) mt-1">{t("Full system visibility and control")}</p>
      </div>

      {/* System KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("Total Cases"),         value: totalCases,      icon: "📋", accent: "var(--accent)",  bg: "var(--accent-subtle)" },
          { label: t("Open Cases"),          value: openCases,       icon: "🟢", accent: "var(--success)", bg: "var(--success-bg)",  highlight: true },
          { label: t("Total Users"),         value: totalUsers,      icon: "👥", accent: "var(--info)",    bg: "var(--info-bg)" },
          { label: t("Active Users"),        value: activeUsers,     icon: "🟩", accent: "var(--success)", bg: "var(--success-bg)" },
          { label: t("Pending Invoices"),    value: pendingInvoices, icon: "🧾", accent: "var(--warning)", bg: "var(--warning-bg)", highlight: pendingInvoices > 0 },
          { label: t("Open SOS Alerts"),     value: openSos,         icon: "🚨", accent: "var(--error)",   bg: "var(--error-bg)",   highlight: openSos > 0 },
          { label: t("Unverified Community"), value: unverifiedUsers, icon: "🪪", accent: "var(--warning)", bg: "var(--warning-bg)", highlight: unverifiedUsers > 0 },
        ].map((kpi) => (
          <StatCard key={String(kpi.label)} label={kpi.label} value={kpi.value} icon={kpi.icon}
            accent={kpi.accent} bg={kpi.bg} highlight={kpi.highlight} />
        ))}
      </div>

      {/* Role Breakdown */}
      {roleBreakdown.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-(--text) mb-4">{t("Users by Role")}</h2>
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
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">{t("Recent Cases")}</h2>
            <Link href="/director/cases" className="text-xs text-(--accent) hover:underline">{t("All cases")}</Link>
          </div>
          {recentCases.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? t("No cases yet.") : t("Connect database to see cases.")}</p>
          ) : (
            <div className="divide-y divide-(--border)">
              {recentCases.map((c) => {
                const community = c.community as unknown as { name: string } | null;
                const lm = c.litigationMember as unknown as { name: string } | null;
                return (
                  <div key={String(c._id)} className="px-6 py-3">
                    <p className="text-sm font-medium text-(--text)">{c.caseTitle}</p>
                    <p className="text-xs text-(--muted) mt-0.5">{community?.name} · {lm ? lm.name : t("Unassigned")} · {c.status}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Users */}
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">{t("Recent Registrations")}</h2>
            <Link href="/director/users" className="text-xs text-(--accent) hover:underline">{t("All users")}</Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? t("No users yet.") : t("Connect database to see users.")}</p>
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
          { href: "/director",    label: t("Admin Panel") },
          { href: "/hr",       label: t("HR Panel") },
          { href: "/finance",  label: t("Finance Panel") },
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
