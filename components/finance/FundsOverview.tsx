"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

interface Proj {
  _id: string; code: string; name: string; status: string;
  totalBudget: number; spent: number; owed: number; remaining: number;
}

/** Fund health across projects — total budget / spent / owed / remaining, plus
 *  a per-project utilisation bar. Shown on the director / finance / HR
 *  dashboards (each role sees the org-wide fund picture they need to act on). */
export default function FundsOverview({ href }: { href?: string }) {
  const t = useT();
  const [projects, setProjects] = useState<Proj[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tot = projects.reduce(
    (a, p) => ({ budget: a.budget + (p.totalBudget ?? 0), spent: a.spent + (p.spent ?? 0), owed: a.owed + (p.owed ?? 0), remaining: a.remaining + (p.remaining ?? 0) }),
    { budget: 0, spent: 0, owed: 0, remaining: 0 }
  );
  const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

  if (loading) return null;
  if (projects.length === 0) return null;

  return (
    <section className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-(--text)">{t("Funds Overview")}</h2>
        {href && <Link href={href} className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>{t("Manage")} →</Link>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Cell label={t("Total budget")} value={inr(tot.budget)} />
        <Cell label={t("Spent")} value={inr(tot.spent)} color="var(--text)" />
        <Cell label={t("Owed")} value={inr(tot.owed)} color={tot.owed > 0 ? "var(--warning-text)" : "var(--muted)"} />
        <Cell label={t("Remaining")} value={inr(tot.remaining)} color="var(--success-text)" />
      </div>

      <div className="space-y-2">
        {projects.map((p) => {
          // Committed = paid + director-approved: approval already reserves
          // the money, so the bar reflects it immediately.
          const committed = p.spent + (p.owed ?? 0);
          const pct = p.totalBudget > 0 ? Math.min(100, Math.round((committed / p.totalBudget) * 100)) : 0;
          const over = committed > p.totalBudget && p.totalBudget > 0;
          return (
            <div key={p._id} className="text-xs">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-medium text-(--text) truncate">
                  <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>{p.code}</span> {p.name}
                </span>
                <span className="text-(--muted) shrink-0">
                  {inr(p.spent)} / {inr(p.totalBudget)}{p.owed > 0 && <span style={{ color: "var(--warning-text)" }}> · {t("owed")} {inr(p.owed)}</span>}
                </span>
              </div>
              <div className="rounded-full h-1.5 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div className="h-full" style={{ width: `${pct}%`, background: over ? "var(--error)" : "var(--accent)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <p className="text-[11px] uppercase tracking-wide text-(--muted) font-semibold">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  );
}
