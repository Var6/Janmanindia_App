import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav from "@/components/shared/SidebarNav";
import { navItemsFor, ROLE_LABELS } from "@/lib/nav";

interface Props {
  /** Restrict access to specific roles. Omit to allow any authenticated user. */
  allow?: string[];
  children: React.ReactNode;
}

/** Single layout shell shared by every authenticated page. */
export default async function AppShell({ allow, children }: Props) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (allow && !allow.includes(session.role)) {
    redirect(`/${session.role}`);
  }

  const navItems = navItemsFor(session.role);
  const roleLabel = ROLE_LABELS[session.role] ?? session.role;

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel={roleLabel} userName={session.name} roleSlug={session.role} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Title bar */}
        <header className="sticky top-0 z-10 bg-(--surface) border-b border-(--border) px-6 py-3 flex items-center justify-between gap-4">
          <Link href={`/${session.role}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {/* Brand icon */}
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-(--accent-contrast) font-black text-sm shrink-0"
              style={{ background: "var(--accent)" }}>
              J
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-(--text) leading-none">Janman Legal Aid</p>
              <p className="text-[10px] text-(--muted) uppercase tracking-wide mt-0.5">{roleLabel}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs text-(--muted)">
            <span className="hidden sm:inline">Signed in as <span className="font-semibold text-(--text)">{session.name}</span></span>
            <span className="capitalize px-2 py-0.5 rounded-full" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              {session.role}
            </span>
          </div>
        </header>

        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
