"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useSession } from "@/components/ui/SessionProvider";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useSession();
  const router = useRouter();

  const navigation = [
    { href: "/", label: "Home" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/community", label: "Community" },
    { href: "/events", label: "Events" },
  ];

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="font-semibold tracking-tight text-[var(--text)]">
          Janman Legal Aid
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--accent)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden md:inline text-sm text-[var(--muted)]">Hi, {user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
              >
                Logout
              </button>
              <Link href="/settings" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
                Settings
              </Link>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
              Login
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}
