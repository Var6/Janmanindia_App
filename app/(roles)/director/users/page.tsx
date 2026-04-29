import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

const ROLE_COLORS: Record<string, string> = {
  community: "bg-blue-100 text-blue-700",
  socialworker: "bg-purple-100 text-purple-700",
  litigation: "bg-indigo-100 text-indigo-700",
  hr: "bg-teal-100 text-teal-700",
  finance: "bg-emerald-100 text-emerald-700",
  administrator: "bg-amber-100 text-amber-700",
  director: "bg-orange-100 text-orange-700",
  superadmin: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

const ASSIGNABLE_ROLES = [
  "community",
  "socialworker",
  "litigation",
  "hr",
  "finance",
  "administrator",
  "director",
  "superadmin",
] as const;

const ROLE_LABEL: Record<string, string> = {
  community: "Community", socialworker: "Social Worker", litigation: "Litigation",
  hr: "HR", finance: "Finance", administrator: "Administrator",
  director: "Director", superadmin: "Superadmin", pending: "Pending",
};

const TAB_FILTERS = ["active", "past", "all"] as const;
type Tab = (typeof TAB_FILTERS)[number];

interface PageProps { searchParams: Promise<{ tab?: string; role?: string }> }

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  const sp = await searchParams;
  const tab: Tab = (TAB_FILTERS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab) : "active";
  const roleFilter = sp.role && (ASSIGNABLE_ROLES as readonly string[]).includes(sp.role) ? sp.role : null;

  const dbOk = await tryConnectDB();
  const allUsers = dbOk
    ? await User.find({})
        .select("name email role isActive createdAt joinedAt exitedAt employeeId communityProfile.verificationStatus")
        .sort({ exitedAt: -1, createdAt: -1 })
        .lean()
    : [];

  const activeUsers = allUsers.filter((u) => u.isActive);
  const pastUsers   = allUsers.filter((u) => !u.isActive);
  const pendingUsers = allUsers.filter((u) => u.role === "pending");

  const baseList = tab === "active" ? activeUsers : tab === "past" ? pastUsers : allUsers;
  const visibleUsers = roleFilter ? baseList.filter((u) => u.role === roleFilter) : baseList;

  // Per-role counts (for chip display) — always over the active set so the
  // sidebar reflects current org composition, not historical totals.
  const byRole = activeUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">User Management</h1>
        <p className="text-sm text-(--muted) mt-1">
          {activeUsers.length} active · {pastUsers.length} past employee{pastUsers.length === 1 ? "" : "s"} · {allUsers.length} total accounts.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"].map((r) => (
          <Link key={r}
            href={`/director/users?tab=${tab}${roleFilter === r ? "" : `&role=${r}`}`}
            className={`p-2 rounded-xl border text-center text-xs ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-600"} ${roleFilter === r ? "ring-2" : ""}`}
            style={roleFilter === r ? { boxShadow: "0 0 0 2px var(--accent)" } : undefined}>
            <p className="text-lg font-bold">{byRole[r] ?? 0}</p>
            <p className="capitalize">{r}</p>
          </Link>
        ))}
      </div>

      {pendingUsers.length > 0 && (
        <section className="rounded-2xl overflow-hidden border"
          style={{ background: "var(--warning-bg)", borderColor: "color-mix(in srgb,var(--warning) 30%,transparent)" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "color-mix(in srgb,var(--warning) 25%,transparent)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--warning)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--warning-text)" }}>
              Pending Google sign-ups ({pendingUsers.length})
            </h2>
            <span className="text-xs" style={{ color: "var(--warning-text)" }}>
              · waiting for you to pick a role before they can use the app
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "color-mix(in srgb,var(--warning) 20%,transparent)" }}>
            {pendingUsers.map((u) => (
              <div key={String(u._id)} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--text)">{u.name}</p>
                  <p className="text-xs text-(--muted)">{u.email}</p>
                </div>
                <form method="POST" action="/api/users/set-role" className="flex items-center gap-2">
                  <input type="hidden" name="id" value={String(u._id)} />
                  <select name="role" required defaultValue=""
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                    <option value="" disabled>Pick a role…</option>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                    ))}
                  </select>
                  <button type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    Assign role
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {TAB_FILTERS.map((t) => {
          const count = t === "active" ? activeUsers.length : t === "past" ? pastUsers.length : allUsers.length;
          const label = t === "active" ? "Active" : t === "past" ? "Past employees" : "All";
          const href = `/director/users?tab=${t}${roleFilter ? `&role=${roleFilter}` : ""}`;
          return (
            <Link key={t} href={href}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "var(--accent-contrast)" : "var(--muted)",
              }}>
              {label} <span className="opacity-70">({count})</span>
            </Link>
          );
        })}
        {roleFilter && (
          <Link href={`/director/users?tab=${tab}`}
            className="px-3 py-1.5 rounded-lg text-xs text-(--muted) hover:text-(--text)">
            Clear role filter
          </Link>
        )}
      </div>

      {visibleUsers.length === 0 ? (
        <div className="py-16 text-center bg-(--surface) rounded-2xl border border-(--border)">
          <p className="text-sm text-(--muted)">
            {dbOk ? (tab === "past" ? "No past employees yet." : "No users match this view.") : "Connect database."}
          </p>
        </div>
      ) : (
        <div className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-(--border) text-xs font-semibold text-(--muted) uppercase tracking-wide"
            style={{ background: "var(--bg-secondary)" }}>
            <span>User</span>
            <span className="px-4">{tab === "past" ? "Last role" : "Role"}</span>
            <span className="px-4">{tab === "past" ? "Exited" : "Status"}</span>
            <span className="px-4">Action</span>
          </div>
          <div className="divide-y divide-(--border)">
            {visibleUsers.map((u) => {
              const exitedAt = u.exitedAt ? new Date(u.exitedAt) : null;
              const tenure = u.joinedAt && exitedAt
                ? Math.max(1, Math.round((exitedAt.getTime() - new Date(u.joinedAt).getTime()) / (30 * 86400000)))
                : null;
              return (
                <div key={String(u._id)} className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3 hover:bg-(--bg) transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text) truncate">
                      {u.name}
                      {u.employeeId && (
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                          {u.employeeId}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-(--muted)">{u.email}</p>
                  </div>
                  <span className={`mx-4 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                  {!u.isActive ? (
                    <span className="mx-4 text-xs text-(--muted)">
                      {exitedAt
                        ? exitedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                      {tenure ? <span className="block text-[10px] opacity-70">~{tenure} mo</span> : null}
                    </span>
                  ) : (
                    <span className="mx-4 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  )}
                  <div className="flex items-center gap-2 px-4 flex-wrap">
                    {/* Set-role dropdown — submits straight to /api/users/set-role
                        on change. Hidden submit lets non-JS browsers still post. */}
                    {u.isActive && u.role !== "pending" && (
                      <form method="POST" action="/api/users/set-role"
                        className="flex items-center gap-1">
                        <input type="hidden" name="id" value={String(u._id)} />
                        <select name="role" defaultValue={u.role}
                          className="px-2 py-1 rounded-lg border text-xs"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs font-semibold text-(--accent) hover:underline">
                          Set
                        </button>
                      </form>
                    )}
                    <form method="POST" action={`/api/users/toggle?id=${String(u._id)}&active=${u.isActive ? "false" : "true"}`}>
                      <button type="submit" className={`text-xs font-semibold hover:underline ${u.isActive ? "text-red-500" : "text-green-600"}`}>
                        {u.isActive ? "Mark past employee" : "Reinstate"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
