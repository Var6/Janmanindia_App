import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav from "@/components/shared/SidebarNav";
import TopBar from "@/components/shared/TopBar";
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
    <div className="flex h-screen overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel={roleLabel} userName={session.name} roleSlug={session.role} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        <TopBar userName={session.name} role={session.role} />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
