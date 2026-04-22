import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/finance",          label: "Dashboard", icon: "home"         },
  { href: "/finance/salaries", label: "Salaries",  icon: "currency"     },
  { href: "/finance/expenses", label: "Expenses",   icon: "credit-card"  },
  { href: "/chat",          label: "Chat",        icon: "chat"        },
  { href: "/grievance",       label: "Grievance",   icon: "chat"        },
  { href: "/finance/profile",  label: "My Profile", icon: "user-circle"  },
];

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Finance" userName={session.name} roleSlug="finance" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
