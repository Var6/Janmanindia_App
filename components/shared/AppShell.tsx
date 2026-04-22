import Link from "next/link";
import Image from "next/image";
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
        {/* Compact title bar */}
        <header className="sticky top-0 z-10 bg-(--surface)/95 backdrop-blur border-b border-(--border) px-5 py-2 flex items-center justify-between gap-4">
          <Link href={`/${session.role}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0">
            <Image src="/logo.png" alt="Janman" width={28} height={28}
              priority
              className="rounded-md object-contain shrink-0"
              style={{ border: "1px solid var(--border)" }} />
            <div className="min-w-0 hidden sm:block">
              <p className="text-[13px] font-bold text-(--text) leading-none">Janman Legal Aid</p>
              <p className="text-[10px] text-(--muted) uppercase tracking-wide mt-0.5 truncate">{roleLabel}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-[11px] text-(--muted) min-w-0">
            <span className="hidden md:inline truncate max-w-45">
              <span className="font-semibold text-(--text)">{session.name}</span>
            </span>
            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              {session.role}
            </span>
          </div>
        </header>

        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
