import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

const ROLE_COLORS: Record<string, string> = {
  user: "bg-blue-100 text-blue-700",
  socialworker: "bg-purple-100 text-purple-700",
  litigation: "bg-indigo-100 text-indigo-700",
  hr: "bg-teal-100 text-teal-700",
  finance: "bg-emerald-100 text-emerald-700",
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

export default async function AdminUsersPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();
  const users = dbOk
    ? await User.find({}).select("name email role isActive createdAt communityProfile.verificationStatus").sort({ createdAt: -1 }).lean()
    : [];

  const byRole = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  // Pending Google sign-ups (@janmanindia.org first-timers awaiting role assignment).
  const pendingUsers = users.filter((u) => u.role === "pending");

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">User Management</h1>
        <p className="text-sm text-(muted) mt-1">{users.length} total accounts.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"].map((r) => (
          <div key={r} className={`p-2 rounded-xl border text-center text-xs ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-600"}`}>
            <p className="text-lg font-bold">{byRole[r] ?? 0}</p>
            <p className="capitalize">{r}</p>
          </div>
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
                  <p className="text-sm font-medium text-(text)">{u.name}</p>
                  <p className="text-xs text-(muted)">{u.email}</p>
                </div>
                <form method="POST" action="/api/users/set-role" className="flex items-center gap-2">
                  <input type="hidden" name="id" value={String(u._id)} />
                  <select name="role" required defaultValue=""
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                    <option value="" disabled>Pick a role…</option>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
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

      {users.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No users found." : "Connect database."}</p>
        </div>
      ) : (
        <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-(border) text-xs font-semibold text-(muted) uppercase tracking-wide">
            <span>User</span>
            <span className="px-4">Role</span>
            <span className="px-4">Status</span>
            <span className="px-4">Action</span>
          </div>
          <div className="divide-y divide-(border)">
            {users.map((u) => (
              <div key={String(u._id)} className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3 hover:bg-(bg) transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(text) truncate">{u.name}</p>
                  <p className="text-xs text-(muted)">{u.email}</p>
                </div>
                <span className={`mx-4 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {u.role}
                </span>
                <span className={`mx-4 text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {u.isActive ? "Active" : "Inactive"}
                </span>
                <div className="flex gap-2 px-4">
                  <form method="POST" action={`/api/users/toggle?id=${String(u._id)}&active=${u.isActive ? "false" : "true"}`}>
                    <button type="submit" className={`text-xs font-semibold hover:underline ${u.isActive ? "text-red-500" : "text-green-600"}`}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  {u.role !== "hr" && (
                    <form method="POST" action={`/api/users/appoint-hr?id=${String(u._id)}`}>
                      <button type="submit" className="text-xs font-semibold text-(accent) hover:underline">
                        Make HR
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
