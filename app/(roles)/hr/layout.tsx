import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/hr",              label: "Dashboard",   icon: "home"       },
  { href: "/hr/invoices",     label: "Invoices",    icon: "receipt"    },
  { href: "/hr/attendance",   label: "Attendance",  icon: "clock"      },
  { href: "/hr/onboarding",   label: "Onboarding",  icon: "user-plus"  },
  { href: "/hr/offboarding",  label: "Offboarding", icon: "user-minus"  },
  { href: "/hr/grievances",   label: "Grievances",  icon: "alert"       },
  { href: "/training",        label: "Training",    icon: "book"        },
  { href: "/grievance",       label: "My Grievance",icon: "chat"        },
  { href: "/hr/profile",      label: "My Profile",  icon: "user-circle" },
];

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "hr" && session.role !== "superadmin")) redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="HR Department" userName={session.name} roleSlug="hr" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
