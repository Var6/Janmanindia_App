import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";

export default async function FinanceDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const approvedReports = dbOk
    ? await EodReport.find({ invoiceStatus: "approved" })
        .sort({ date: -1 })
        .populate("submittedBy", "name email")
        .lean()
    : [];

  const byWorker: Record<string, { name: string; email: string; totalAmount: number; reports: number }> = {};
  for (const r of approvedReports) {
    const sw = r.submittedBy as unknown as { _id: string; name: string; email: string };
    const id = String(sw?._id);
    if (!byWorker[id]) byWorker[id] = { name: sw?.name ?? "Unknown", email: sw?.email ?? "", totalAmount: 0, reports: 0 };
    byWorker[id].totalAmount += r.expenses.reduce((s, e) => s + e.amount, 0);
    byWorker[id].reports += 1;
  }

  const workerEntries = Object.entries(byWorker);
  const grandTotal = workerEntries.reduce((s, [, v]) => s + v.totalAmount, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthlyTotal = approvedReports
    .filter((r) => new Date(r.date) >= thisMonth)
    .reduce((s, r) => s + r.expenses.reduce((es, e) => es + e.amount, 0), 0);

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}
      <TodoWidget userId={session.id} />

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Finance Dashboard</h1>
        <p className="text-sm text-(--muted) mt-1">Approved invoices and expense management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Approved Invoices",      value: approvedReports.length },
          { label: "This Month Expenses",    value: `₹${monthlyTotal.toLocaleString("en-IN")}` },
          { label: "Total Disbursed",        value: `₹${grandTotal.toLocaleString("en-IN")}` },
          { label: "Social Workers",         value: workerEntries.length },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-(--surface) rounded-2xl border border-(--border) p-5">
            <p className="text-xs text-(--muted)">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1 text-(--accent)">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Per-worker breakdown */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">Expense Breakdown by Social Worker</h2>
          <Link href="/finance/expenses" className="text-xs text-(--accent) hover:underline">Details</Link>
        </div>
        {workerEntries.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No approved expenses yet." : "Connect database to see expenses."}</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {workerEntries.map(([id, data]) => (
              <div key={id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-(--text)">{data.name}</p>
                  <p className="text-xs text-(--muted)">{data.email} · {data.reports} report(s)</p>
                </div>
                <span className="text-sm font-bold text-(--text)">₹{data.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Approved Invoices */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <h2 className="font-semibold text-(--text)">Recent Approved Invoices</h2>
          <Link href="/finance/salaries" className="text-xs text-(--accent) hover:underline">Salaries</Link>
        </div>
        {approvedReports.length === 0 ? (
          <p className="px-6 py-6 text-sm text-(--muted) text-center">{dbOk ? "No approved invoices yet." : "Connect database to see invoices."}</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {approvedReports.slice(0, 10).map((r) => {
              const sw = r.submittedBy as unknown as { name: string };
              const total = r.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={String(r._id)} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{sw?.name}</p>
                    <p className="text-xs text-(--muted)">{new Date(r.date).toLocaleDateString("en-IN")} · {r.hoursWorked}h</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">₹{total.toLocaleString("en-IN")}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
