import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function SWCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({ socialWorker: session.id })
        .populate("citizen", "name email")
        .populate("litigationMember", "name")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  // ID verification queue
  const pendingVerifications = dbOk
    ? await User.find({ role: "user", "citizenProfile.verificationStatus": "pending" })
        .select("name email citizenProfile")
        .lean()
    : [];

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Cases</h1>
        <p className="text-sm text-(muted) mt-1">All cases assigned to you and pending ID verifications.</p>
      </div>

      {pendingVerifications.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-semibold text-amber-800 text-sm">ID Verification Queue ({pendingVerifications.length})</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingVerifications.map((u) => (
              <div key={String(u._id)} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-(text)">{u.name}</p>
                  <p className="text-xs text-(muted)">{u.email} · {u.citizenProfile?.govtIdType}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form method="POST" action="/api/users/verify-id">
                    <input type="hidden" name="userId" value={String(u._id)} />
                    <input type="hidden" name="status" value="verified" />
                    <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                      Verify
                    </button>
                  </form>
                  <form method="POST" action="/api/users/verify-id">
                    <input type="hidden" name="userId" value={String(u._id)} />
                    <input type="hidden" name="status" value="rejected" />
                    <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-(text) mb-3">Assigned Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
            <p className="text-sm text-(muted)">{dbOk ? "No cases assigned yet." : "Connect database to see cases."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => {
              const citizen = c.citizen as unknown as { name: string; email: string } | null;
              const lawyer = c.litigationMember as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="bg-(surface) rounded-2xl border border-(border) p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-(text)">{c.caseTitle}</p>
                      <p className="text-xs text-(muted) mt-0.5">
                        {c.path === "criminal" ? "Criminal" : "High Court"} · Citizen: {citizen?.name ?? "—"} · Lawyer: {lawyer?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.nextHearingDate && (
                    <p className="text-xs text-(muted)">
                      Next hearing: {new Date(c.nextHearingDate).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
