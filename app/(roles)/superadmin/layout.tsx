import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/superadmin", label: "Overview",      icon: "shield"       },
  { href: "/director",      label: "Admin Panel",   icon: "settings"     },
  { href: "/hr",         label: "HR Panel",      icon: "users"        },
  { href: "/finance",          label: "Finance Panel", icon: "trending-up"  },
  { href: "/grievance",       label: "Grievance",   icon: "chat"        },
  { href: "/superadmin/profile", label: "My Profile",    icon: "user-circle"  },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "superadmin") redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Super Admin" userName={session.name} roleSlug="superadmin" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
