import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function HrInvoicesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "hr" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();
  const reports = dbOk
    ? await EodReport.find({})
        .populate("submittedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    : [];

  const pending = reports.filter((r) => r.invoiceStatus === "pending");
  const actioned = reports.filter((r) => r.invoiceStatus !== "pending");

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Invoice Review</h1>
        <p className="text-sm text-(muted) mt-1">
          Review and approve or reject expense invoices submitted by social workers.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", count: pending.length, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
          { label: "Approved", count: actioned.filter((r) => r.invoiceStatus === "approved").length, color: "bg-green-50 border-green-200 text-green-700" },
          { label: "Rejected", count: actioned.filter((r) => r.invoiceStatus === "rejected").length, color: "bg-red-50 border-red-200 text-red-700" },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Pending Approval</h2>
          <div className="space-y-3">
            {pending.map((r) => {
              const sw = r.submittedBy as unknown as { name: string; email: string } | null;
              const totalExpenses = r.expenses.reduce((sum, ex) => sum + ex.amount, 0);
              return (
                <div key={String(r._id)} className="bg-(surface) rounded-2xl border border-(border) p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-(text)">{sw?.name ?? "—"}</p>
                      <p className="text-xs text-(muted)">{sw?.email} · {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-(text)">₹{totalExpenses.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-(muted)">{r.hoursWorked}h worked</p>
                    </div>
                  </div>
                  <p className="text-sm text-(muted) mb-3 line-clamp-2">{r.summary}</p>
                  {r.expenses.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {r.expenses.map((ex, i) => (
                        <div key={i} className="flex justify-between text-xs text-(muted)">
                          <span>{ex.description}</span>
                          <span className="font-medium">₹{ex.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <form method="POST" action={`/api/eod-reports?id=${String(r._id)}&action=approve`}>
                      <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl bg-green-500 text-white hover:bg-green-600">
                        Approve
                      </button>
                    </form>
                    <form method="POST" action={`/api/eod-reports?id=${String(r._id)}&action=reject`}>
                      <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {actioned.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Past Decisions</h2>
          <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
            <div className="divide-y divide-(border)">
              {actioned.map((r) => {
                const sw = r.submittedBy as unknown as { name: string } | null;
                return (
                  <div key={String(r._id)} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-(text)">{sw?.name ?? "—"}</p>
                      <p className="text-xs text-(muted)">{new Date(r.date).toLocaleDateString("en-IN")} · ₹{r.expenses.reduce((s, e) => s + e.amount, 0)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[r.invoiceStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.invoiceStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {reports.length === 0 && (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No invoices submitted yet." : "Connect database."}</p>
        </div>
      )}
    </div>
  );
}
