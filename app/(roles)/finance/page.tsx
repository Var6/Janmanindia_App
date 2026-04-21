import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import User from "@/models/User";

export default async function FinanceDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  await connectDB();

  const approvedReports = await EodReport.find({ invoiceStatus: "approved" })
    .sort({ date: -1 })
    .populate("submittedBy", "name email")
    .lean();

  // Aggregate by social worker
  const byWorker: Record<
    string,
    { name: string; email: string; totalAmount: number; reports: number }
  > = {};

  for (const r of approvedReports) {
    const sw = r.submittedBy as unknown as { _id: string; name: string; email: string };
    const id = String(sw?._id);
    if (!byWorker[id]) {
      byWorker[id] = { name: sw?.name ?? "Unknown", email: sw?.email ?? "", totalAmount: 0, reports: 0 };
    }
    const expTotal = r.expenses.reduce((s, e) => s + e.amount, 0);
    byWorker[id].totalAmount += expTotal;
    byWorker[id].reports += 1;
  }

  const workerEntries = Object.entries(byWorker);
  const grandTotal = workerEntries.reduce((s, [, v]) => s + v.totalAmount, 0);

  // Current month reports
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthlyReports = approvedReports.filter((r) => new Date(r.date) >= thisMonth);
  const monthlyTotal = monthlyReports.reduce(
    (s, r) => s + r.expenses.reduce((es, e) => es + e.amount, 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Finance Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Approved invoices and expense management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Approved Invoices", value: approvedReports.length },
          { label: "This Month Expenses", value: `₹${monthlyTotal.toLocaleString("en-IN")}` },
          { label: "Total Disbursed", value: `₹${grandTotal.toLocaleString("en-IN")}` },
          { label: "Social Workers", value: workerEntries.length },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <p className="text-xs text-[var(--muted)]">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1 text-[var(--accent)]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Per-worker breakdown */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Expense Breakdown by Social Worker</h2>
          <Link href="/finance/expenses" className="text-xs text-[var(--accent)] hover:underline">Details</Link>
        </div>
        {workerEntries.length === 0 ? (
          <p className="px-6 py-6 text-sm text-[var(--muted)] text-center">No approved expenses yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {workerEntries.map(([id, data]) => (
              <div key={id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{data.name}</p>
                  <p className="text-xs text-[var(--muted)]">{data.email} &middot; {data.reports} report(s)</p>
                </div>
                <span className="text-sm font-bold text-[var(--text)]">₹{data.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Approved Invoices */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Recent Approved Invoices</h2>
          <Link href="/finance/salaries" className="text-xs text-[var(--accent)] hover:underline">Salaries</Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {approvedReports.slice(0, 10).map((r) => {
            const sw = r.submittedBy as unknown as { name: string };
            const total = r.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={String(r._id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{sw?.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(r.date).toLocaleDateString("en-IN")} &middot; {r.hoursWorked}h
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600">₹{total.toLocaleString("en-IN")}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
