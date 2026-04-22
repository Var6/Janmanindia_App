import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "var(--info-bg)",    text: "var(--info-text)"    },
  Closed:    { bg: "var(--bg)",         text: "var(--muted)"        },
  Escalated: { bg: "var(--error-bg)",   text: "var(--error-text)"   },
  Pending:   { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  Dismissed: { bg: "var(--bg)",         text: "var(--muted)"        },
};

export default async function AdminDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const [allCases, litigationMembers, totalUsers, unassignedCount] = dbOk
    ? await Promise.all([
        Case.find({}).sort({ updatedAt: -1 }).limit(15)
          .populate("litigationMember", "name")
          .populate("citizen", "name")
          .lean(),
        User.find({ role: "litigation", isActive: true })
          .select("name litigationProfile.activeCaseCount litigationProfile.location")
          .lean(),
        User.countDocuments({}),
        Case.countDocuments({ litigationMember: { $exists: false }, status: "Open" }),
      ])
    : [[], [], 0, 0] as const;

  const openCases = allCases.filter((c) => c.status === "Open").length;

  const kpis = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: "👥",
      bg: "var(--info-bg)",
      accent: "var(--info)",
    },
    {
      label: "Total Cases",
      value: allCases.length,
      icon: "📋",
      bg: "var(--accent-subtle)",
      accent: "var(--accent)",
    },
    {
      label: "Open Cases",
      value: openCases,
      icon: "🟢",
      bg: "var(--success-bg)",
      accent: "var(--success)",
    },
    {
      label: "Unassigned",
      value: unassignedCount,
      icon: unassignedCount > 0 ? "⚠️" : "✅",
      bg: unassignedCount > 0 ? "var(--warning-bg)" : "var(--success-bg)",
      accent: unassignedCount > 0 ? "var(--warning)" : "var(--success)",
    },
  ];

  return (
    <div className="space-y-7">
      {!dbOk && <NoDBBanner />}
      <TodoWidget userId={session.id} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Admin Dashboard</h1>
          <p className="text-sm text-(--muted) mt-0.5">Platform overview and management</p>
        </div>
        <Link href="/director/assign"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-(--accent-contrast) hover:brightness-110 transition shrink-0"
          style={{ background: "var(--accent)" }}>
          Reassign Cases
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
        {/* Recent Cases */}
        <section className="rounded-2xl border border-(--border) overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="text-sm font-semibold text-(--text)">Recent Cases</h2>
            <Link href="/director/cases" className="text-xs font-medium text-(--accent) hover:underline">
              View all →
            </Link>
          </div>

          {allCases.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm text-(--muted)">{dbOk ? "No cases yet." : "Connect database to see cases."}</p>
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {allCases.slice(0, 8).map((c) => {
                const lm = c.litigationMember as unknown as { name: string } | null;
                const citizen = c.citizen as unknown as { name: string } | null;
                const sc = STATUS_STYLES[c.status] ?? { bg: "var(--bg)", text: "var(--muted)" };
                return (
                  <div key={String(c._id)} className="px-5 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-(--text) truncate">{c.caseTitle}</p>
                      <p className="text-xs text-(--muted) mt-0.5 truncate">
                        {citizen?.name ?? "—"} · {lm ? lm.name : <span style={{ color: "var(--warning-text)" }}>Unassigned</span>}
                      </p>
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

        {/* Litigation Workload */}
        <section className="rounded-2xl border border-(--border) overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
            <h2 className="text-sm font-semibold text-(--text)">Litigation Workload</h2>
            <Link href="/director/assign" className="text-xs font-medium text-(--accent) hover:underline">
              Reassign →
            </Link>
          </div>

          {litigationMembers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">👨‍⚖️</p>
              <p className="text-sm text-(--muted)">{dbOk ? "No litigation members found." : "Connect database to see workload."}</p>
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {litigationMembers.map((lm) => {
                const count = lm.litigationProfile?.activeCaseCount ?? 0;
                const pct = Math.min(100, (count / 15) * 100);
                return (
                  <div key={String(lm._id)} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-medium text-(--text)">{lm.name}</p>
                        <p className="text-xs text-(--muted)">{lm.litigationProfile?.location?.district ?? "—"}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: count > 10 ? "var(--error)" : "var(--success)" }}>
                        {count} cases
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: count > 10 ? "var(--error)" : "var(--success)",
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/director/users",  label: "Manage Users",  icon: "👥" },
          { href: "/director/assign", label: "Reassign Cases", icon: "🔄" },
          { href: "/director/cases",  label: "All Cases",     icon: "📋" },
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
