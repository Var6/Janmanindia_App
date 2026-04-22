import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import LogisticsTicket from "@/models/LogisticsTicket";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function AdministratorDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "administrator" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const [open, inProgress, fulfilled, byCategory, byDistrict, recent] = dbOk ? await Promise.all([
    LogisticsTicket.countDocuments({ status: "open" }),
    LogisticsTicket.countDocuments({ status: "in_progress" }),
    LogisticsTicket.countDocuments({ status: "fulfilled" }),
    LogisticsTicket.aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ["open", "in_progress"] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    LogisticsTicket.aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ["open", "in_progress"] }, district: { $ne: null } } },
      { $group: { _id: "$district", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    LogisticsTicket.find({ status: { $in: ["open", "in_progress"] } })
      .sort({ urgency: -1, createdAt: -1 }).limit(5)
      .populate("raisedBy", "name role employeeId")
      .lean(),
  ]) : [0, 0, 0, [], [], []];

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Administrator — Operations</h1>
        <p className="text-sm text-(--muted) mt-1">Office logistics, supplies, transport, and district operations.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open tickets",     value: open,       highlight: open > 0,       href: "/administrator/tickets?status=open" },
          { label: "In progress",      value: inProgress, highlight: false,          href: "/administrator/tickets?status=in_progress" },
          { label: "Fulfilled (total)", value: fulfilled,                            href: "/administrator/tickets?status=fulfilled" },
          { label: "Districts active", value: byDistrict.length,                     href: "/administrator/offices" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href}
            className="bg-(--surface) rounded-2xl border border-(--border) p-5 hover:border-(--accent) transition-colors">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.highlight ? "text-(--accent)" : "text-(--text)"}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By category */}
        <section className="bg-(--surface) rounded-2xl border border-(--border) p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-(--text) text-sm">Active tickets by category</h2>
            <Link href="/administrator/tickets" className="text-xs text-(--accent) hover:underline">All →</Link>
          </div>
          {byCategory.length === 0 ? (
            <p className="text-xs text-(--muted) text-center py-4">No active tickets.</p>
          ) : (
            <ul className="space-y-2">
              {byCategory.map((c) => {
                const max = byCategory[0].count;
                const pct = (c.count / max) * 100;
                return (
                  <li key={c._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-(--text) capitalize">{c._id}</span>
                      <span className="text-(--muted) font-mono">{c.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-(--bg) border border-(--border) overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* By district */}
        <section className="bg-(--surface) rounded-2xl border border-(--border) p-5">
          <h2 className="font-semibold text-(--text) text-sm mb-3">Active tickets by district</h2>
          {byDistrict.length === 0 ? (
            <p className="text-xs text-(--muted) text-center py-4">No district data yet.</p>
          ) : (
            <ul className="space-y-2">
              {byDistrict.map((d) => {
                const max = byDistrict[0].count;
                const pct = (d.count / max) * 100;
                return (
                  <li key={d._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-(--text)">{d._id}</span>
                      <span className="text-(--muted) font-mono">{d.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-(--bg) border border-(--border) overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: "var(--success, #16a34a)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent open queue */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">Most urgent open tickets</h2>
          <Link href="/administrator/tickets" className="text-xs text-(--accent) hover:underline">Inbox →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "Inbox clear — no open tickets." : "Connect DB to view."}</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {recent.map((t) => {
              const rb = t.raisedBy as unknown as { name: string; role: string; employeeId?: string } | null;
              return (
                <Link key={String(t._id)} href={`/administrator/tickets`}
                  className="block px-6 py-4 hover:bg-(--accent-subtle) transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                          style={{
                            background: t.urgency === "critical" ? "var(--error-bg)" : t.urgency === "high" ? "var(--warning-bg, #fef3c7)" : "var(--bg-secondary, #f3f4f6)",
                            color:      t.urgency === "critical" ? "var(--error-text)" : t.urgency === "high" ? "var(--warning-text, #92400e)" : "var(--muted)",
                          }}>
                          {t.urgency}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded text-(--muted) border border-(--border)">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-(--text) mt-1">{t.title}</p>
                      <p className="text-xs text-(--muted)">
                        {rb?.name ?? "—"}{rb?.employeeId ? ` (${rb.employeeId})` : ""}
                        {t.district ? ` · ${t.district}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
