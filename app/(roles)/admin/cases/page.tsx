import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function AdminCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({})
        .populate("citizen", "name")
        .populate("litigationMember", "name")
        .populate("socialWorker", "name")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean()
    : [];

  const byStatus = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">All Cases</h1>
        <p className="text-sm text-(muted) mt-1">{cases.length} total cases across all litigation members.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["Open", "Pending", "Escalated", "Closed", "Dismissed"].map((s) => (
          <div key={s} className={`p-3 rounded-xl border text-center ${STATUS_COLORS[s]}`}>
            <p className="text-xl font-bold">{byStatus[s] ?? 0}</p>
            <p className="text-xs mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {cases.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No cases in the system yet." : "Connect database."}</p>
        </div>
      ) : (
        <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-(border) text-xs font-semibold text-(muted) uppercase tracking-wide">
            <span>Case</span>
            <span className="text-center px-3">Type</span>
            <span className="text-center px-3">Lawyer</span>
            <span className="text-center px-3">Status</span>
            <span className="text-center px-3">Action</span>
          </div>
          <div className="divide-y divide-(border)">
            {cases.map((c) => {
              const citizen = c.citizen as unknown as { name: string } | null;
              const lawyer = c.litigationMember as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-3 hover:bg-(bg) transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(text) truncate">{c.caseTitle}</p>
                    <p className="text-xs text-(muted)">{citizen?.name ?? "—"}</p>
                  </div>
                  <span className="px-3 text-xs text-(muted)">{c.path === "criminal" ? "Criminal" : "HC"}</span>
                  <span className="px-3 text-xs text-(text)">{lawyer?.name ?? <span className="text-(muted)">Unassigned</span>}</span>
                  <span className={`mx-3 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                  <Link
                    href={`/admin/assign?caseId=${String(c._id)}`}
                    className="px-3 text-xs text-(accent) hover:underline"
                  >
                    Reassign
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
