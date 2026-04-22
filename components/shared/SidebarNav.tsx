"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

/* ── SVG icon set (Heroicons stroke style, 20px viewBox) ─────────────────── */
const ICONS = {
  home: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M2.25 10.9L10 3.25l7.75 7.65M4.5 8.9V16.5a.5.5 0 00.5.5h3.25v-3.5a.75.75 0 011.5 0V17h3.25a.5.5 0 00.5-.5V8.9"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="7" width="16" height="11" rx="2"/>
      <path d="M7 7V5.5A1.5 1.5 0 018.5 4h3A1.5 1.5 0 0113 5.5V7"/>
      <line x1="2" y1="12" x2="18" y2="12"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"/>
      <path d="M8.5 16.5a1.5 1.5 0 003 0"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z"/>
      <line x1="10" y1="8" x2="10" y2="11"/>
      <circle cx="10" cy="14" r=".5" fill="currentColor"/>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 2h10a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="6" y1="7" x2="8" y2="7"/>
      <line x1="6" y1="10" x2="8" y2="10"/>
    </svg>
  ),
  document: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <polyline points="12 2 12 6 16 6"/>
      <line x1="6" y1="10" x2="14" y2="10"/>
      <line x1="6" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 6.5A2.5 2.5 0 015.5 4h9A2.5 2.5 0 0117 6.5v5A2.5 2.5 0 0114.5 14H8l-4 3V6.5z"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="9" cy="9" r="5.5"/>
      <line x1="13.5" y1="13.5" x2="18" y2="18"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="4" width="16" height="14" rx="2"/>
      <line x1="2" y1="9" x2="18" y2="9"/>
      <line x1="6" y1="2" x2="6" y2="6"/>
      <line x1="14" y1="2" x2="14" y2="6"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="8" cy="7" r="3"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
      <path d="M14 5c1.657 0 3 1.343 3 3s-1.343 3-3 3"/>
      <path d="M18 18c0-2.761-1.791-5.108-4.25-5.837"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 2h14v14l-2-2-2 2-2-2-2 2-2-2-2 2V2z"/>
      <line x1="7" y1="7" x2="13" y2="7"/>
      <line x1="7" y1="11" x2="13" y2="11"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="10" r="8"/>
      <polyline points="10 6 10 10 13 13"/>
    </svg>
  ),
  "user-plus": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="8" cy="7" r="3"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
      <line x1="16" y1="8" x2="16" y2="14"/>
      <line x1="13" y1="11" x2="19" y2="11"/>
    </svg>
  ),
  "user-minus": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="8" cy="7" r="3"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
      <line x1="13" y1="11" x2="19" y2="11"/>
    </svg>
  ),
  currency: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="10" r="8"/>
      <path d="M10 6v8M7.5 8.5C7.5 7.12 8.619 6 10 6s2.5 1.12 2.5 2.5c0 3-5 3-5 5.5C7.5 15.88 8.619 17 10 17s2.5-1.12 2.5-2.5"/>
    </svg>
  ),
  "credit-card": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="5" width="16" height="11" rx="2"/>
      <line x1="2" y1="10" x2="18" y2="10"/>
    </svg>
  ),
  "bar-chart": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <line x1="18" y1="18" x2="2" y2="18"/>
      <rect x="3" y="10" width="3" height="8"/>
      <rect x="8.5" y="6" width="3" height="12"/>
      <rect x="14" y="3" width="3" height="15"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="10" r="3"/>
      <path d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V19a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 17.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 13a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 7a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 2.68a1.65 1.65 0 001-1.51V1a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0017.4 9a1.65 1.65 0 001.51 1H19a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  "trending-up": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  "file-plus": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <polyline points="12 2 12 6 16 6"/>
      <line x1="9" y1="10" x2="15" y2="10"/>
      <line x1="12" y1="7" x2="12" y2="13"/>
    </svg>
  ),
  "file-text": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <polyline points="12 2 12 6 16 6"/>
      <line x1="6" y1="10" x2="14" y2="10"/>
      <line x1="6" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M10 2l7 3v5c0 4.418-3.134 8.547-7 9-3.866-.453-7-4.582-7-9V5l7-3z"/>
    </svg>
  ),
  "user-circle": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="10" cy="10" r="8"/>
      <circle cx="10" cy="8" r="2.5"/>
      <path d="M4.5 17c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"/>
    </svg>
  ),
} satisfies Record<string, React.ReactNode>;

interface Props {
  navItems: NavItem[];
  roleLabel: string;
  userName: string;
  roleSlug: string;
}

export default function SidebarNav({ navItems, roleLabel, userName, roleSlug }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Persist collapse state across navigations
  useEffect(() => {
    const saved = typeof window !== "undefined" && window.localStorage.getItem("sb_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  function isActive(href: string): boolean {
    if (href === `/${roleSlug}` || href === "/training") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className={`${collapsed ? "w-[68px]" : "w-56"} shrink-0 flex flex-col h-screen sticky top-0 transition-[width] duration-200 ease-out`}
      style={{
        background: "color-mix(in srgb, var(--sidebar) 78%, transparent)",
        backdropFilter: "blur(18px) saturate(170%)",
        WebkitBackdropFilter: "blur(18px) saturate(170%)",
        borderRight: "1px solid color-mix(in srgb, var(--sidebar-border) 70%, transparent)",
      }}>
      {/* Brand row — exact 56px height to match TopBar */}
      <div className={`border-b h-14 flex items-center ${collapsed ? "justify-center px-2" : "px-3"}`}
        style={{ borderColor: "var(--sidebar-border)" }}>
        <button onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-2.5 min-w-0 w-full rounded-lg hover:bg-(--sidebar-hover) transition-colors group"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <img
            src="/logo.png"
            alt="Janman — toggle sidebar"
            className="w-8 h-8 rounded-lg object-contain shrink-0 transition-transform group-hover:scale-105"
            style={{ border: "1px solid var(--border)" }}
          />
          {!collapsed && (
            <div className="min-w-0 text-left flex-1">
              <p className="text-sm font-bold text-(--text) leading-none tracking-tight">Janman</p>
              <p className="text-[10px] text-(--muted) mt-0.5 truncate uppercase tracking-wide">{roleLabel}</p>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"} py-2 rounded-lg text-[13px] font-medium transition-all duration-150`}
              style={{
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                color: active ? "var(--sidebar-active-text)" : "var(--muted)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                }
              }}
            >
              <span className="shrink-0 transition-colors" style={{ color: active ? "var(--sidebar-active-text)" : "var(--sidebar-icon)" }}>
                {ICONS[item.icon]}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 py-2.5 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5 px-2"} py-2 rounded-lg`}
          style={{ background: collapsed ? "transparent" : "var(--bg-secondary)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--accent-muted)", color: "var(--sidebar-active-text)" }}
            title={collapsed ? userName : undefined}>
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-(--text) truncate leading-none">{userName}</p>
                <p className="text-[10px] text-(--muted) mt-0.5 truncate">{roleLabel}</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" title="Sign out"
                  className="p-1 rounded-md transition-colors text-(--muted) hover:text-(--error) hover:bg-(--error-bg)">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M13 10H3m10 0l-3-3m3 3l-3 3"/>
                    <path d="M7 5V4a2 2 0 012-2h5a2 2 0 012 2v12a2 2 0 01-2 2H9a2 2 0 01-2-2v-1"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
