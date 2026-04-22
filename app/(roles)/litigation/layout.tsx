import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/litigation",              label: "Dashboard",    icon: "home"      },
  { href: "/litigation/cases",        label: "My Cases",     icon: "briefcase" },
  { href: "/litigation/appointments", label: "Appointments", icon: "calendar"  },
  { href: "/training",                 label: "Training",     icon: "book"        },
  { href: "/litigation/profile",       label: "My Profile",   icon: "user-circle" },
];

export default async function LitigationLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Litigation Team" userName={session.name} roleSlug="litigation" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
