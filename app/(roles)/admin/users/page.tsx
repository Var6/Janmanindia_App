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
  admin: "bg-orange-100 text-orange-700",
  superadmin: "bg-red-100 text-red-700",
};

export default async function AdminUsersPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();
  const users = dbOk
    ? await User.find({}).select("name email role isActive createdAt citizenProfile.verificationStatus").sort({ createdAt: -1 }).lean()
    : [];

  const byRole = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">User Management</h1>
        <p className="text-sm text-(muted) mt-1">{users.length} total accounts.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {["user", "socialworker", "litigation", "hr", "finance", "admin", "superadmin"].map((r) => (
          <div key={r} className={`p-2 rounded-xl border text-center text-xs ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-600"}`}>
            <p className="text-lg font-bold">{byRole[r] ?? 0}</p>
            <p className="capitalize">{r}</p>
          </div>
        ))}
      </div>

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
