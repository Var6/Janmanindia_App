import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import NoDBBanner from "@/components/shared/NoDBBanner";

const PRIO_STYLE: Record<string, { bg: string; text: string }> = {
  low:      { bg: "var(--bg-secondary)", text: "var(--muted)" },
  medium:   { bg: "var(--info-bg)",      text: "var(--info-text)" },
  high:     { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  critical: { bg: "var(--error-bg)",     text: "var(--error-text)" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: "var(--success-bg)",   text: "var(--success-text)" },
  on_hold:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  completed: { bg: "var(--bg-secondary)", text: "var(--muted)" },
  cancelled: { bg: "var(--error-bg)",     text: "var(--error-text)" },
};

export default async function SWCarePlansIndex() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();
  const plans = dbOk && mongoose.Types.ObjectId.isValid(session.id)
    ? await CarePlan.find({ createdBy: new mongoose.Types.ObjectId(session.id) })
        .sort({ updatedAt: -1 })
        .populate("community", "name email")
        .lean()
    : [];

  const active = plans.filter(p => p.status === "active");
  const others = plans.filter(p => p.status !== "active");

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Individual Care Plans</h1>
        <p className="text-sm text-(--muted) mt-1">
          {plans.length} plan{plans.length === 1 ? "" : "s"} you've created — counselling, shelter, medical, and rehabilitation tracking.
        </p>
      </div>

      <Section title="Active" plans={active as unknown as PlanLean[]} />
      {others.length > 0 && <Section title="On hold / completed / cancelled" plans={others as unknown as PlanLean[]} />}

      {plans.length === 0 && (
        <div className="py-16 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">🩹</p>
          <p className="text-sm text-(--muted)">
            No care plans yet. Open a case from the Cases tab and click <span className="font-semibold text-(--text)">+ New Care Plan</span> in the case detail to start one.
          </p>
        </div>
      )}
    </div>
  );
}

type PlanLean = {
  _id: unknown; title: string; status: string; priority: string; category: string;
  case?: unknown; updatedAt: Date; community?: { _id: unknown; name: string; email: string } | null;
};
function Section({ title, plans }: { title: string; plans: PlanLean[] }) {
  if (plans.length === 0) return null;
  return (
    <section>
      <h2 className="font-semibold text-(--text) mb-3">{title} ({plans.length})</h2>
      <div className="space-y-2">
        {plans.map(p => {
          const prio = PRIO_STYLE[p.priority] ?? PRIO_STYLE.medium;
          const stat = STATUS_STYLE[p.status] ?? STATUS_STYLE.active;
          const href = p.case ? `/socialworker/cases/${String(p.case)}` : "#";
          return (
            <Link key={String(p._id)} href={href}
              className="block rounded-xl border border-(--border) hover:border-(--accent) p-4 transition-colors"
              style={{ background: "var(--surface)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--text)">{p.title}</p>
                  <p className="text-xs text-(--muted) mt-0.5">
                    {p.community?.name ?? "—"} · <span className="capitalize">{p.category.replace(/_/g, " ")}</span> · updated {new Date(p.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: prio.bg, color: prio.text }}>{p.priority}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: stat.bg, color: stat.text }}>{p.status.replace("_", " ")}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
