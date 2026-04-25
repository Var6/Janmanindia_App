import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Project from "@/models/Project";
import Expense from "@/models/Expense";
import EodReport from "@/models/EodReport";
import "@/models/User"; // register schema for populate
import NoDBBanner from "@/components/shared/NoDBBanner";
import TodoWidget from "@/components/activities/TodoWidget";
import FinancePayQueue from "@/components/finance/FinancePayQueue";

const CATEGORY_LABEL: Record<string, string> = {
  admin: "Admin / Office", training: "Training", exploration: "Exploration",
  staff: "Staff Cost", travel: "Travel", legal: "Legal / Court", other: "Other",
};

export default async function FinanceDashboard() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin" && session.role !== "director")) {
    redirect("/login");
  }

  const dbOk = await tryConnectDB();
  if (!dbOk) return <div className="space-y-6"><NoDBBanner /></div>;

  const [projects, paidAgg, paidExpenses, pendingPay, eodApproved] = await Promise.all([
    Project.find({}).sort({ createdAt: -1 }).lean(),
    Expense.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: { project: "$project", category: "$category" }, spent: { $sum: "$amount" } } },
    ]),
    Expense.find({ status: "paid" })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("project", "code name")
      .populate("submittedBy", "name email role")
      .populate("payment.by", "name")
      .lean(),
    Expense.find({ status: "director_approved" })
      .sort({ submittedAt: 1 })
      .populate("project", "code name")
      .populate("submittedBy", "name email role")
      .populate("hrVerification.by", "name")
      .populate("directorApproval.by", "name")
      .lean(),
    EodReport.find({ invoiceStatus: "approved" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("submittedBy", "name email role")
      .lean(),
  ]);

  // Per-project: total / spent / remaining + breakdown by category
  type Cat = string;
  const spentByProject = new Map<string, number>();
  const breakdownByProject = new Map<string, Record<Cat, number>>();
  for (const row of paidAgg) {
    const pid = String((row as { _id: { project: unknown } })._id.project);
    const cat = String((row as { _id: { category: string } })._id.category);
    const amt = (row as { spent: number }).spent;
    spentByProject.set(pid, (spentByProject.get(pid) ?? 0) + amt);
    const map = breakdownByProject.get(pid) ?? {};
    map[cat] = (map[cat] ?? 0) + amt;
    breakdownByProject.set(pid, map);
  }

  // Org-wide totals
  const totalBudget = projects.reduce((s, p) => s + (p.totalBudget ?? 0), 0);
  const totalSpent  = [...spentByProject.values()].reduce((s, v) => s + v, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);

  // Org-wide category mix
  const orgCategory: Record<string, number> = {};
  for (const map of breakdownByProject.values()) {
    for (const [k, v] of Object.entries(map)) orgCategory[k] = (orgCategory[k] ?? 0) + (v as number);
  }

  // Pending-pay queue (director_approved) — finance can mark them paid here
  const pendingPayItems = pendingPay.map(x => JSON.parse(JSON.stringify(x))) as Parameters<typeof FinancePayQueue>[0]["items"];

  return (
    <div className="space-y-8">
      <TodoWidget userId={session.id} />

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Finance Dashboard</h1>
        <p className="text-sm text-(--muted) mt-1">Project budgets, allocation tracking, and the expense ledger.</p>
      </div>

      {/* Org-wide KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Active Projects" value={String(projects.filter(p => p.status === "active").length)} />
        <Kpi label="Total Budget Allocated" value={`₹${totalBudget.toLocaleString("en-IN")}`} />
        <Kpi label="Total Spent" value={`₹${totalSpent.toLocaleString("en-IN")}`} accent="var(--warning-text)" />
        <Kpi label="Total Remaining" value={`₹${totalRemaining.toLocaleString("en-IN")}`} accent="var(--success-text)" />
      </div>

      {/* Per-project budget cards */}
      <section className="space-y-3">
        <h2 className="font-semibold text-(--text)">Per-project budgets</h2>
        {projects.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-(--muted)">No projects yet — superadmin can create them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map(p => {
              const spent = spentByProject.get(String(p._id)) ?? 0;
              const remaining = Math.max(0, (p.totalBudget ?? 0) - spent);
              const pct = (p.totalBudget ?? 0) > 0 ? Math.min(100, Math.round((spent / p.totalBudget) * 100)) : 0;
              const overrun = spent > (p.totalBudget ?? 0) && (p.totalBudget ?? 0) > 0;
              const cats = breakdownByProject.get(String(p._id)) ?? {};
              return (
                <div key={String(p._id)} className="rounded-2xl border p-5 space-y-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{p.code}</span>
                        <p className="text-base font-bold text-(--text)">{p.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                      style={{
                        background: p.status === "active" ? "var(--success-bg)" : p.status === "on_hold" ? "var(--warning-bg)" : "var(--bg-secondary)",
                        color:      p.status === "active" ? "var(--success-text)" : p.status === "on_hold" ? "var(--warning-text)" : "var(--muted)",
                      }}>{p.status.replace("_", " ")}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Stat label="Total"     value={`₹${(p.totalBudget ?? 0).toLocaleString("en-IN")}`} />
                    <Stat label="Spent"     value={`₹${spent.toLocaleString("en-IN")}`}     color={overrun ? "var(--error-text)" : "var(--text)"} />
                    <Stat label="Remaining" value={`₹${remaining.toLocaleString("en-IN")}`} color="var(--success-text)" />
                  </div>

                  <div className="rounded-full h-2 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: overrun ? "var(--error)" : "var(--accent)" }} />
                  </div>

                  {Object.keys(cats).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-semibold tracking-wide text-(--muted)">By category</p>
                      <ul className="space-y-1">
                        {Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                          <li key={cat} className="flex items-center justify-between text-xs text-(--text)">
                            <span>{CATEGORY_LABEL[cat] ?? cat}</span>
                            <span className="font-medium">₹{(amt as number).toLocaleString("en-IN")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Org-wide category mix */}
      {Object.keys(orgCategory).length > 0 && (
        <section className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-(--text) mb-3">Org-wide spend by category</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(orgCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
              return (
                <li key={cat} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <p className="text-[11px] text-(--muted) uppercase tracking-wide">{CATEGORY_LABEL[cat] ?? cat}</p>
                  <p className="text-base font-bold text-(--text)">₹{amt.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-(--muted)">{pct}% of total</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Pending payment — finance can mark paid */}
      <FinancePayQueue items={pendingPayItems} />

      {/* Recent paid expenses ledger */}
      <section className="rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <header className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-(--text)">Recent paid expenses (ledger)</h2>
        </header>
        {paidExpenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-(--muted) text-center">No expenses paid yet.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {paidExpenses.map(x => {
              const proj = (x.project as unknown as { code?: string; name?: string } | null);
              const sub  = (x.submittedBy as unknown as { name?: string; role?: string } | null);
              return (
                <div key={String(x._id)} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text)">
                      <span className="font-mono text-[11px] mr-2 px-1.5 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>{proj?.code ?? "—"}</span>
                      {x.title}
                    </p>
                    <p className="text-xs text-(--muted)">
                      {CATEGORY_LABEL[x.category] ?? x.category} · {sub?.name ?? "—"} · {new Date((x.updatedAt as unknown as string) ?? x.submittedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-(--success-text) shrink-0">₹{x.amount.toLocaleString("en-IN")}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Existing EOD invoices summary (legacy view) */}
      {eodApproved.length > 0 && (
        <section className="rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <header className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-(--text)">Recent approved EOD invoices</h2>
            <p className="text-xs text-(--muted) mt-0.5">From social workers and litigation members. These run on the separate invoice flow.</p>
          </header>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {eodApproved.map(r => {
              const sw = r.submittedBy as unknown as { name?: string; role?: string } | null;
              const total = r.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={String(r._id)} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text)">{sw?.name ?? "—"} <span className="text-[10px] text-(--muted)">({sw?.role})</span></p>
                    <p className="text-xs text-(--muted)">{new Date(r.date).toLocaleDateString("en-IN")} · {r.hoursWorked}h</p>
                  </div>
                  <p className="text-sm font-bold text-(--success-text) shrink-0">₹{total.toLocaleString("en-IN")}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs text-(--muted)">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: accent ?? "var(--accent)" }}>{value}</p>
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-2 text-center" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] uppercase tracking-wide text-(--muted)">{label}</p>
      <p className="text-sm font-bold" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  );
}
