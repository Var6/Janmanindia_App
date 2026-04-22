import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function FinanceSalariesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [staff, approvedReports] = dbOk
    ? await Promise.all([
        User.find({ role: { $in: ["socialworker", "litigation", "hr", "finance"] }, isActive: true })
          .select("name email role")
          .lean(),
        EodReport.find({ invoiceStatus: "approved", date: { $gte: monthStart } })
          .select("submittedBy hoursWorked expenses")
          .lean(),
      ])
    : [[], []];

  const salaryMap = approvedReports.reduce<Record<string, { hours: number; expenses: number }>>((acc, r) => {
    const id = String(r.submittedBy);
    if (!acc[id]) acc[id] = { hours: 0, expenses: 0 };
    acc[id].hours += r.hoursWorked;
    acc[id].expenses += r.expenses.reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});

  const HOURLY_RATE: Record<string, number> = {
    socialworker: 150,
    litigation: 500,
    hr: 200,
    finance: 200,
  };

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Salaries</h1>
        <p className="text-sm text-(muted) mt-1">
          Monthly salary overview based on approved EOD reports for {monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No active staff." : "Connect database."}</p>
        </div>
      ) : (
        <>
          <div className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-(border) text-xs font-semibold text-(muted) uppercase tracking-wide">
              <span>Staff Member</span>
              <span className="px-4 text-right">Hours</span>
              <span className="px-4 text-right">Rate/hr</span>
              <span className="px-4 text-right">Expenses</span>
              <span className="px-4 text-right">Total</span>
            </div>
            <div className="divide-y divide-(border)">
              {staff.map((s) => {
                const data = salaryMap[String(s._id)] ?? { hours: 0, expenses: 0 };
                const rate = HOURLY_RATE[s.role] ?? 150;
                const salary = data.hours * rate;
                const total = salary + data.expenses;
                return (
                  <div key={String(s._id)} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-3 hover:bg-(bg) transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(text) truncate">{s.name}</p>
                      <p className="text-xs text-(muted) capitalize">{s.role}</p>
                    </div>
                    <p className="px-4 text-sm text-right text-(text)">{data.hours}h</p>
                    <p className="px-4 text-sm text-right text-(muted)">₹{rate}</p>
                    <p className="px-4 text-sm text-right text-(muted)">₹{data.expenses.toLocaleString("en-IN")}</p>
                    <p className="px-4 text-sm text-right font-semibold text-(text)">₹{total.toLocaleString("en-IN")}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-(border) flex justify-between items-center bg-(bg)">
              <p className="text-sm font-semibold text-(text)">Total Payroll</p>
              <p className="text-sm font-bold text-(text)">
                ₹{staff.reduce((sum, s) => {
                  const data = salaryMap[String(s._id)] ?? { hours: 0, expenses: 0 };
                  const rate = HOURLY_RATE[s.role] ?? 150;
                  return sum + data.hours * rate + data.expenses;
                }, 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-(accent)/5 border border-(accent)/20">
            <p className="text-xs text-(muted)">
              Salary is calculated as <strong>Approved Hours × Hourly Rate + Approved Expenses</strong>. Only HR-approved EOD reports are counted. Contact Admin to adjust rates or disburse payments.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
