import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/admin",         label: "Dashboard",  icon: "home"      },
  { href: "/admin/cases",   label: "All Cases",  icon: "briefcase" },
  { href: "/admin/users",   label: "Users",      icon: "users"     },
  { href: "/admin/assign",   label: "Reassign",   icon: "refresh"     },
  { href: "/admin/profile",  label: "My Profile", icon: "user-circle" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Administration" userName={session.name} roleSlug="admin" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
