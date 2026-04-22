import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import SidebarNav, { type NavItem } from "@/components/shared/SidebarNav";

const navItems: NavItem[] = [
  { href: "/socialworker",              label: "Dashboard",    icon: "home"      },
  { href: "/socialworker/cases",        label: "Cases",        icon: "briefcase" },
  { href: "/socialworker/escalate",     label: "Escalate SOS", icon: "alert"     },
  { href: "/socialworker/queries",      label: "Queries",      icon: "chat"      },
  { href: "/socialworker/reports",      label: "EOD Reports",  icon: "document"  },
  { href: "/socialworker/media-upload", label: "Media Upload", icon: "upload"    },
  { href: "/training",                   label: "Training",     icon: "book"         },
  { href: "/socialworker/profile",       label: "My Profile",   icon: "user-circle"  },
];

export default async function SocialWorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  return (
    <div className="flex h-screen bg-(--bg) overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel="Social Worker" userName={session.name} roleSlug="socialworker" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
