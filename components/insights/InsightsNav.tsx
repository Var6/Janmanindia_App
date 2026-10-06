"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/director/insights", label: "Impact", exact: true },
  { href: "/director/insights/kpis", label: "KPIs" },
  { href: "/director/insights/charts", label: "Charts" },
  { href: "/director/insights/dashboards", label: "Dashboards" },
  { href: "/director/insights/reports", label: "Reports" },
  { href: "/director/insights/alerts", label: "Alerts" },
  { href: "/director/insights/data", label: "Data" },
  { href: "/director/insights/copilot", label: "Copilot" },
];

/** Tab strip shared by every Insights page. */
export default function InsightsNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-(--border) print:hidden" aria-label="Insights sections">
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href}
            className="px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors"
            style={{ borderColor: active ? "var(--accent)" : "transparent", color: active ? "var(--accent)" : "var(--muted)" }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
