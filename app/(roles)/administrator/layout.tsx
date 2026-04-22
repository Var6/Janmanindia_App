import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/administrator",         label: "Dashboard",     icon: "home"        },
  { href: "/administrator/tickets", label: "Ticket Inbox",  icon: "alert"       },
  { href: "/administrator/offices", label: "Offices",       icon: "briefcase"   },
  { href: "/activities",            label: "Activities",    icon: "calendar"    },
  { href: "/training",              label: "Training",      icon: "book"        },
  { href: "/grievance",             label: "Grievance",     icon: "chat"        },
  { href: "/administrator/profile", label: "My Profile",    icon: "user-circle" },
];

export default async function AdministratorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "administrator" && session.role !== "superadmin")) redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Administrator" userName={session.name} roleSlug="administrator" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
