import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/user",              label: "Dashboard",    icon: "home"      },
  { href: "/user/file-case",    label: "File a Case",  icon: "file-plus" },
  { href: "/user/sos",          label: "SOS",          icon: "bell"      },
  { href: "/user/rtps",         label: "RTPS",         icon: "file-text" },
  { href: "/user/case-tracker", label: "Case Tracker", icon: "search"    },
  { href: "/training",          label: "Training",     icon: "book"      },
  { href: "/user/appointments", label: "Appointments", icon: "calendar"  },
  { href: "/user/profile",      label: "My Profile",   icon: "user-circle" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "user") redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Citizen Portal" userName={session.name} roleSlug="user" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
