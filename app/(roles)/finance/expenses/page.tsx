import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function FinanceExpensesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const reports = dbOk
    ? await EodReport.find({ invoiceStatus: "approved", date: { $gte: monthStart } })
        .populate("submittedBy", "name role")
        .sort({ date: -1 })
        .lean()
    : [];

  const allExpenses = reports.flatMap((r) => {
    const sw = r.submittedBy as unknown as { name: string; role: string } | null;
    return r.expenses.map((ex) => ({
      date: r.date,
      staff: sw?.name ?? "—",
      role: sw?.role ?? "—",
      description: ex.description,
      amount: ex.amount,
    }));
  });

  const totalByRole = allExpenses.reduce<Record<string, number>>((acc, ex) => {
    acc[ex.role] = (acc[ex.role] ?? 0) + ex.amount;
    return acc;
  }, {});

  const grandTotal = allExpenses.reduce((s, ex) => s + ex.amount, 0);

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Expenses</h1>
        <p className="text-sm text-(muted) mt-1">
          All HR-approved expense claims for {monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(totalByRole).map(([role, total]) => (
          <div key={role} className="p-4 rounded-xl border bg-(surface) border-(border)">
            <p className="text-lg font-bold text-(text)">₹{total.toLocaleString("en-IN")}</p>
            <p className="text-xs text-(muted) capitalize mt-0.5">{role}</p>
          </div>
        ))}
        <div className="p-4 rounded-xl border bg-(accent)/10 border-(accent)/30">
          <p className="text-lg font-bold text-(text)">₹{grandTotal.toLocaleString("en-IN")}</p>
          <p className="text-xs text-(muted) mt-0.5">Grand Total</p>
        </div>
      </div>

      {allExpenses.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No approved expenses this month." : "Connect database."}</p>
        </div>
      ) : (
        <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] px-5 py-3 border-b border-(border) text-xs font-semibold text-(muted) uppercase tracking-wide">
            <span className="pr-4">Date</span>
            <span>Description</span>
            <span className="px-4">Staff</span>
            <span className="pl-4 text-right">Amount</span>
          </div>
          <div className="divide-y divide-(border)">
            {allExpenses.map((ex, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-3 hover:bg-(bg) transition-colors">
                <p className="pr-4 text-xs text-(muted) whitespace-nowrap">
                  {new Date(ex.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
                <p className="text-sm text-(text) truncate">{ex.description}</p>
                <p className="px-4 text-xs text-(muted) whitespace-nowrap">{ex.staff}</p>
                <p className="pl-4 text-sm font-semibold text-(text) text-right">₹{ex.amount.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-(border) flex justify-between bg-(bg)">
            <p className="text-sm font-semibold text-(text)">Total</p>
            <p className="text-sm font-bold text-(text)">₹{grandTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
