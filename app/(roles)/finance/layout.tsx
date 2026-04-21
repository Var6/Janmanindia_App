import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

const navItems = [
  { href: "/finance", label: "Dashboard" },
  { href: "/finance/salaries", label: "Salaries" },
  { href: "/finance/expenses", label: "Expenses" },
];

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "finance" && session.role !== "superadmin")) redirect("/login");

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">
      <aside className="w-64 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <span className="text-lg font-bold text-[var(--accent)]">JanmanIndia</span>
          <p className="text-xs text-[var(--muted)] mt-0.5">Finance</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] truncate">{session.name}</p>
          <form action="/api/auth/logout" method="POST" className="mt-2">
            <button type="submit" className="text-xs text-red-500 hover:text-red-600 transition-colors">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto"><div className="max-w-6xl mx-auto px-6 py-8">{children}</div></main>
    </div>
  );
}
