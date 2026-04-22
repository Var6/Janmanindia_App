"use client";

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

const NAV_LINKS = [
  { href: "/",          label: "Home"       },
  { href: "#roles",     label: "User Types" },
  { href: "/community", label: "Community"  },
  { href: "/login",     label: "Login"      },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="10" cy="10" r="4"/>
      <line x1="10" y1="2"  x2="10" y2="3.5"/>
      <line x1="10" y1="16.5" x2="10" y2="18"/>
      <line x1="2"  y1="10" x2="3.5" y2="10"/>
      <line x1="16.5" y1="10" x2="18" y2="10"/>
      <line x1="4.22" y1="4.22" x2="5.27" y2="5.27"/>
      <line x1="14.73" y1="14.73" x2="15.78" y2="15.78"/>
      <line x1="15.78" y1="4.22" x2="14.73" y2="5.27"/>
      <line x1="5.27"  y1="14.73" x2="4.22" y2="15.78"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.5 12A7.5 7.5 0 118 2.5a5.5 5.5 0 109.5 9.5z"/>
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 2a.75.75 0 01.67.415l3.495 6.75H17.5a.75.75 0 010 1.5H14.33l.67 1.293A2.25 2.25 0 0113 15H7a2.25 2.25 0 01-2-3.042L5.67 10.665H2.5a.75.75 0 010-1.5h3.335L9.33 2.415A.75.75 0 0110 2zM6.875 10.665L5.5 13.25A.75.75 0 006.167 14.5h1.583L6.875 10.665zM13.125 10.665L12.25 14.5h1.583a.75.75 0 00.667-1.25l-1.375-2.585zM10 4.71L8.19 8.415h3.62L10 4.71z"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
      <line x1="3" y1="6"  x2="17" y2="6"/>
      <line x1="3" y1="10" x2="17" y2="10"/>
      <line x1="3" y1="14" x2="17" y2="14"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
      <line x1="4" y1="4" x2="16" y2="16"/>
      <line x1="16" y1="4" x2="4" y2="16"/>
    </svg>
  );
}

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-(--border) bg-(--surface)/90 backdrop-blur-xl text-(--text)">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="Janman Legal Aid"
            className="h-9 w-auto transition-transform group-hover:scale-105"
          />
          <span className="font-bold text-(--text) text-[15px] tracking-tight">
            Janman <span className="text-(--muted) font-medium">Legal Aid</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}
              className="px-3.5 py-2 rounded-lg text-sm text-(--muted) hover:text-(--text) hover:bg-(--bg-secondary) transition-all">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--muted) hover:text-(--text) hover:border-(--accent) transition-all"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          <Link href="/dev"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--bg) px-3.5 py-2 text-sm font-medium text-(--muted) hover:text-(--text) hover:border-(--accent) transition-all">
            Dev
          </Link>

          <Link href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-(--accent-contrast) transition-all hover:brightness-110 shadow-sm"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
            Sign in
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-(--border) text-(--muted)"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-(--border) bg-(--surface) px-4 py-3 space-y-1">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex px-3 py-2.5 rounded-lg text-sm text-(--text) hover:bg-(--bg-secondary) transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
