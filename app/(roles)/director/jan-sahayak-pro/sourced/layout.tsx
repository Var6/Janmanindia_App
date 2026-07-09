import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";

/** Director-only sub-area sourced from the standalone `jan-sahayak-pro`
 *  GitHub repo. Lives alongside the existing prototype page. */
export default async function SourcedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || !["director", "superadmin"].includes(session.role)) redirect("/login");
  const t = await getServerT();

  const tabs = [
    { href: "/director/jan-sahayak-pro/sourced/cases",           label: t("Cases") },
    { href: "/director/jan-sahayak-pro/sourced/drafter",         label: t("Drafter") },
    { href: "/director/jan-sahayak-pro/sourced/legal-knowledge", label: t("Legal Knowledge") },
    { href: "/director/jan-sahayak-pro/sourced/plv-training",    label: t("PLV Training") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-(--accent) font-bold">
            {t("Ported from jan-sahayak-pro repo")}
          </span>
          <Link href="/director/jan-sahayak-pro" className="text-xs text-(--muted) hover:text-(--accent)">
            {t("← back to prototype")}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Jan Sahayak Pro · Modules")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Reference port of the source repo's admin pages. Uses demo data; safe to explore.")}
        </p>
      </div>

      <nav className="flex gap-1 border-b border-(--border) overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-semibold text-(--muted) hover:text-(--text) border-b-2 border-transparent hover:border-(--accent) transition-colors whitespace-nowrap"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
