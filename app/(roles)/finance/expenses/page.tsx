import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { tryConnectDB } from "@/lib/mongoose";
import Expense from "@/models/Expense";
import Project from "@/models/Project";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_LABEL: Record<string, { bg: string; color: string; label: string }> = {
  submitted:         { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Awaiting HR" },
  hr_verified:       { bg: "var(--info-bg)",    color: "var(--info-text)",    label: "Awaiting Director" },
  director_approved: { bg: "var(--info-bg)",    color: "var(--info-text)",    label: "Awaiting Finance" },
  paid:              { bg: "var(--success-bg)", color: "var(--success-text)", label: "Paid" },
  rejected:          { bg: "var(--error-bg)",   color: "var(--error-text)",   label: "Rejected" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  admin: "🛠", training: "🎓", exploration: "🧭", staff: "👥", travel: "🚗", legal: "⚖️", other: "📦",
};

/** Finance dashboard. Pulls real Expense documents (the new pipeline) instead
 *  of the legacy EOD-report rows. Surfaces the total approved + paid spend
 *  per project against its allocated budget so a finance member can see
 *  budget headroom at a glance and clear the payment queue. */
export default async function FinanceExpensesPage() {
  const session = await getSessionFromCookies();
  // The proxy already gates /finance/* to finance + superadmin role prefixes,
  // but we keep an explicit check here so a stale token can't render this.
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) {
    redirect("/login");
  }

  const t = await getServerT();
  const dbOk = await tryConnectDB();

  const [expenses, projects] = dbOk
    ? await Promise.all([
        Expense.find({})
          .sort({ submittedAt: -1 })
          .populate("project",       "code name totalBudget")
          .populate("submittedBy",   "name role")
          .populate("hrVerification.by",   "name")
          .populate("directorApproval.by", "name")
          .populate("payment.by",          "name")
          .lean(),
        Project.find({ status: { $ne: "completed" } }).sort({ name: 1 }).lean(),
      ])
    : [[], []];

  // Aggregate spend per project. "Approved" = director_approved (queued for
  // payment); "paid" = actually paid out. Both consume budget — we want to
  // know the committed total, not just the disbursed total.
  type ProjectRow = { _id: string; code: string; name: string; budget: number; approved: number; paid: number; pending: number };
  const byProject = new Map<string, ProjectRow>();
  for (const p of projects) {
    byProject.set(String(p._id), {
      _id: String(p._id),
      code: p.code, name: p.name,
      budget: p.totalBudget ?? 0,
      approved: 0, paid: 0, pending: 0,
    });
  }
  for (const e of expenses) {
    const projRef = e.project as unknown as { _id?: unknown } | null;
    const pid = projRef && projRef._id ? String(projRef._id) : null;
    if (!pid) continue;
    let row = byProject.get(pid);
    if (!row) {
      const proj = e.project as unknown as { _id: unknown; code?: string; name?: string; totalBudget?: number } | null;
      row = {
        _id: pid,
        code: proj?.code ?? "—",
        name: proj?.name ?? "Unknown project",
        budget: proj?.totalBudget ?? 0,
        approved: 0, paid: 0, pending: 0,
      };
      byProject.set(pid, row);
    }
    if (e.status === "paid")              row.paid     += e.amount;
    else if (e.status === "director_approved") row.approved += e.amount;
    else if (e.status === "submitted" || e.status === "hr_verified") row.pending += e.amount;
  }
  const projectRows = Array.from(byProject.values()).sort((a, b) => (b.approved + b.paid) - (a.approved + a.paid));

  const grandPaid     = expenses.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const grandApproved = expenses.filter((e) => e.status === "director_approved").reduce((s, e) => s + e.amount, 0);
  const grandPending  = expenses.filter((e) => e.status === "submitted" || e.status === "hr_verified").reduce((s, e) => s + e.amount, 0);
  const queue         = expenses.filter((e) => e.status === "director_approved");

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Expenses")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Approved and pending expenses per project. Approved amounts deduct from each project's allocated fund.")}
        </p>
      </div>

      {/* Org-wide totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label={t("Pending review")} value={grandPending} tone="warn" />
        <Stat label={t("Awaiting payment")} value={grandApproved} tone="info" />
        <Stat label={t("Paid this period")} value={grandPaid} tone="ok" />
      </div>

      {/* Per-project budget vs spend */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">{t("Spend by project")}</h2>
        {projectRows.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm text-(--muted)">{dbOk ? t("No projects with expense activity yet.") : t("Connect database.")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b text-[12px] font-semibold text-(--muted) uppercase tracking-wide"
              style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
              <span>{t("Project")}</span>
              <span className="px-3 text-right">{t("Budget")}</span>
              <span className="px-3 text-right">{t("Approved + Paid")}</span>
              <span className="px-3 text-right">{t("Remaining")}</span>
              <span className="px-3 text-right">{t("Used")}</span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {projectRows.map((r) => {
                const committed = r.approved + r.paid;
                const remaining = r.budget - committed;
                const pct = r.budget > 0 ? Math.min(100, Math.round((committed / r.budget) * 100)) : 0;
                const overBudget = r.budget > 0 && committed > r.budget;
                return (
                  <div key={r._id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-3 hover:bg-(--bg) transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-(--text) truncate">
                        <span className="text-xs font-mono mr-2 text-(--muted)">{r.code}</span>
                        {r.name}
                      </p>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                        style={{ background: "var(--bg-secondary, #f3f4f6)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: overBudget ? "var(--error, #dc2626)" : "var(--success, #16a34a)",
                          }} />
                      </div>
                    </div>
                    <p className="px-3 text-xs text-(--muted) text-right whitespace-nowrap">
                      ₹{r.budget.toLocaleString("en-IN")}
                    </p>
                    <p className="px-3 text-sm font-semibold text-(--text) text-right whitespace-nowrap">
                      ₹{committed.toLocaleString("en-IN")}
                    </p>
                    <p className="px-3 text-sm text-right whitespace-nowrap"
                      style={{ color: overBudget ? "var(--error-text)" : "var(--text)" }}>
                      ₹{remaining.toLocaleString("en-IN")}
                    </p>
                    <p className="px-3 text-xs font-semibold text-right whitespace-nowrap"
                      style={{ color: overBudget ? "var(--error-text)" : "var(--muted)" }}>
                      {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Payment queue — director-approved items waiting on Finance */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">
          {t("Awaiting payment")} {queue.length > 0 && <span className="text-xs font-medium text-(--muted)">· {queue.length} {queue.length === 1 ? t("item") : t("items")}</span>}
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-(--muted) px-1">{t("Nothing waiting on Finance right now.")}</p>
        ) : (
          <div className="space-y-2">
            {queue.map((e) => {
              const sub = e.submittedBy as unknown as { name: string; role: string } | null;
              const proj = e.project as unknown as { code: string; name: string } | null;
              return (
                <Link key={String(e._id)} href={`/finance`}
                  className="block rounded-xl border p-4 hover:border-(--accent) transition-colors"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--text)">
                        <span className="mr-1.5">{CATEGORY_EMOJI[e.category] ?? "📦"}</span>
                        {e.title}
                      </p>
                      <p className="text-xs text-(--muted) mt-0.5">
                        {proj?.code ?? "—"} · {proj?.name ?? "—"} · {t("by")} {sub?.name ?? "—"}{sub?.role ? ` (${sub.role})` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-(--text)">₹{e.amount.toLocaleString("en-IN")}</p>
                      <span className="text-[11px] uppercase font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: STATUS_LABEL[e.status].bg, color: STATUS_LABEL[e.status].color }}>
                        {t(STATUS_LABEL[e.status].label)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">{t("Recent expenses")}</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-(--muted) px-1">{t("No expenses logged yet.")}</p>
        ) : (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {expenses.slice(0, 20).map((e) => {
                const sub = e.submittedBy as unknown as { name: string; role: string } | null;
                const proj = e.project as unknown as { code: string; name: string } | null;
                const st = STATUS_LABEL[e.status];
                return (
                  <div key={String(e._id)} className="grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-3 gap-3 hover:bg-(--bg) transition-colors">
                    <span className="text-base shrink-0">{CATEGORY_EMOJI[e.category] ?? "📦"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--text) truncate">{e.title}</p>
                      <p className="text-xs text-(--muted) truncate">
                        {proj?.code ?? "—"} · {sub?.name ?? "—"} · {new Date(e.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-(--text) whitespace-nowrap">₹{e.amount.toLocaleString("en-IN")}</p>
                    <span className="text-[11px] uppercase font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: st.bg, color: st.color }}>
                      {t(st.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "warn" }) {
  const styles = {
    ok:   { bg: "var(--success-bg)", text: "var(--success-text)" },
    info: { bg: "var(--info-bg)",    text: "var(--info-text)"    },
    warn: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  }[tone];
  return (
    <div className="p-4 rounded-2xl border"
      style={{ background: styles.bg, borderColor: `color-mix(in srgb, ${styles.text} 20%, transparent)` }}>
      <p className="text-xs font-medium" style={{ color: styles.text }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: styles.text }}>
        ₹{value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
