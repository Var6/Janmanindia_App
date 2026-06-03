import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import UserActions from "./UserActions";

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

  const t = await getServerT();
  const sp = await searchParams;
  const tab: Tab = (TAB_FILTERS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab) : "active";
  const roleFilter = sp.role && (ASSIGNABLE_ROLES as readonly string[]).includes(sp.role) ? sp.role : null;

  const dbOk = await tryConnectDB();
  const allUsers = dbOk
    ? await User.find({})
        .select("name email role roles isActive createdAt joinedAt exitedAt employeeId communityProfile.verificationStatus")
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
        <h1 className="text-2xl font-bold text-(--text)">{t("User Management")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {activeUsers.length} {t("active")} · {pastUsers.length} {t("NPA")} · {allUsers.length} {t("total accounts.")}
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
              {t("Pending Google sign-ups")} ({pendingUsers.length})
            </h2>
            <span className="text-xs" style={{ color: "var(--warning-text)" }}>
              {t("· waiting for you to pick a role before they can use the app")}
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
                    <option value="" disabled>{t("Pick a role…")}</option>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                    ))}
                  </select>
                  <button type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                    {t("Assign role")}
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
        {TAB_FILTERS.map((tabKey) => {
          const count = tabKey === "active" ? activeUsers.length : tabKey === "past" ? pastUsers.length : allUsers.length;
          const label = tabKey === "active" ? t("Active") : tabKey === "past" ? t("NPA") : t("All");
          const href = `/director/users?tab=${tabKey}${roleFilter ? `&role=${roleFilter}` : ""}`;
          return (
            <Link key={tabKey} href={href}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === tabKey ? "var(--accent)" : "transparent",
                color: tab === tabKey ? "var(--accent-contrast)" : "var(--muted)",
              }}>
              {label} <span className="opacity-70">({count})</span>
            </Link>
          );
        })}
        {roleFilter && (
          <Link href={`/director/users?tab=${tab}`}
            className="px-3 py-1.5 rounded-lg text-xs text-(--muted) hover:text-(--text)">
            {t("Clear role filter")}
          </Link>
        )}
      </div>

      {visibleUsers.length === 0 ? (
        <div className="py-16 text-center bg-(--surface) rounded-2xl border border-(--border)">
          <p className="text-sm text-(--muted)">
            {dbOk ? (tab === "past" ? t("No NPA users yet.") : t("No users match this view.")) : t("Connect database.")}
          </p>
        </div>
      ) : (
        <div className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-(--muted) uppercase tracking-wide"
                  style={{ background: "var(--bg-secondary)" }}>
                  <th className="text-left font-semibold px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>{t("User")}</th>
                  <th className="text-left font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    {tab === "past" ? t("Last role") : t("Role")}
                  </th>
                  <th className="text-left font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    {tab === "past" ? t("NPA since") : t("Status")}
                  </th>
                  <th className="text-left font-semibold px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u, i) => {
                  const exitedAt = u.exitedAt ? new Date(u.exitedAt) : null;
                  const tenure = u.joinedAt && exitedAt
                    ? Math.max(1, Math.round((exitedAt.getTime() - new Date(u.joinedAt).getTime()) / (30 * 86400000)))
                    : null;
                  const isLast = i === visibleUsers.length - 1;
                  const cellBorder = isLast ? "" : "border-b";
                  return (
                    <tr key={String(u._id)} className="hover:bg-(--bg) transition-colors align-middle">
                      <td className={`px-5 py-3 ${cellBorder}`} style={{ borderColor: "var(--border)" }}>
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
                      </td>
                      <td className={`px-4 py-3 ${cellBorder}`} style={{ borderColor: "var(--border)" }}>
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${cellBorder}`} style={{ borderColor: "var(--border)" }}>
                        {!u.isActive ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">{t("NPA")}</span>
                            <span className="text-[10px] text-(--muted)">
                              {exitedAt ? exitedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                              {tenure ? ` · ~${tenure} ${t("mo")}` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {t("Active")}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${cellBorder}`} style={{ borderColor: "var(--border)" }}>
                        <UserActions
                          userId={String(u._id)}
                          userName={u.name}
                          currentRole={u.role}
                          currentRoles={(u as { roles?: string[] }).roles ?? []}
                          isActive={u.isActive}
                          roles={ASSIGNABLE_ROLES}
                          roleLabels={ROLE_LABEL}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
