import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/community",              label: "Dashboard",    icon: "home"      },
  { href: "/community/file-case",    label: "File a Case",  icon: "file-plus" },
  { href: "/community/sos",          label: "SOS",          icon: "bell"      },
  { href: "/community/rtps",         label: "RTPS",         icon: "file-text" },
  { href: "/community/case-tracker", label: "Case Tracker", icon: "search"    },
  { href: "/training",          label: "Training",     icon: "book"      },
  { href: "/community/appointments", label: "Appointments", icon: "calendar"  },
  { href: "/grievance",       label: "Grievance",   icon: "chat"        },
  { href: "/community/profile",      label: "My Profile",   icon: "user-circle" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "community") redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Community Portal" userName={session.name} roleSlug="community" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
