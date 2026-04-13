"use client";

import Link from "next/link";
import { useTheme } from "@/components/ui/ThemeProvider";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/community", label: "Community" },
  { href: "/events", label: "Events" },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
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
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <Link href="/login" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
