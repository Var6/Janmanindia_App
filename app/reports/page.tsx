import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";

/**
 * Report hub — one tidy landing for every kind of report, scoped to the
 * viewer's role. Replaces the scattered per-report sidebar links: the sidebar
 * now has a single "Report" entry that lands here, and each option is a card.
 */
interface HubOption {
  href: string;
  icon: string;
  title: string;
  desc: string;
  roles: string[];
}

const OPTIONS: HubOption[] = [
  { href: "/reports/daily", icon: "📝", title: "Daily Report",
    desc: "Your quick end-of-day note.",
    roles: ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"] },
  { href: "/reports/monthly", icon: "📅", title: "Monthly Report",
    desc: "File your monthly programme report and download it as a PDF.",
    roles: ["socialworker", "litigation"] },
  { href: "/reports/monthly", icon: "📅", title: "Monthly Reports",
    desc: "Read & download the monthly reports filed by lawyers and social workers.",
    roles: ["director", "superadmin", "hr", "administrator"] },
  { href: "/socialworker/daily-reports", icon: "🗂️", title: "Weekly Report",
    desc: "Your structured weekly case report.",
    roles: ["socialworker"] },
  { href: "/hr/daily-reports", icon: "🗂️", title: "Weekly Reports",
    desc: "Review social workers' structured weekly reports.",
    roles: ["hr", "director", "superadmin"] },
  { href: "/litigation/reports", icon: "⚖️", title: "EOD & Invoice",
    desc: "End-of-day work log and expense invoice.",
    roles: ["litigation"] },
  { href: "/reports/daily/review", icon: "📊", title: "Report Review",
    desc: "The team's daily reports on a calendar, with follow-ups.",
    roles: ["director", "superadmin", "administrator", "hr"] },
  { href: "/reports/expenses", icon: "💰", title: "Expense Report",
    desc: "All expense claims and their approval status.",
    roles: ["hr", "finance", "administrator", "director", "superadmin"] },
  { href: "/reports/field", icon: "📍", title: "Field Reports",
    desc: "Fact-findings, legal aid camps and other field report templates.",
    roles: ["socialworker", "litigation", "hr", "administrator", "director", "superadmin"] },
];

export default async function ReportsHub() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role === "community") redirect("/community");

  const t = await getServerT();
  const options = OPTIONS.filter((o) => o.roles.includes(session.role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Reports")}</h1>
        <p className="text-sm text-(--muted) mt-1">{t("Everything you file or review, in one place.")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((o) => (
          <Link key={o.title} href={o.href}
            className="group rounded-2xl border p-5 transition-colors hover:border-(--accent)"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
              <span>{o.icon}</span>
            </div>
            <p className="text-sm font-bold text-(--text) group-hover:text-(--accent) transition-colors">{t(o.title)}</p>
            <p className="text-xs text-(--muted) mt-1.5 leading-relaxed">{t(o.desc)}</p>
            <p className="mt-3 text-xs font-semibold" style={{ color: "var(--accent)" }}>{t("Open")} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
