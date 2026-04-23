"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";

const ROLE_PALETTE: Record<string, { bg: string; fg: string }> = {
  community:     { bg: "color-mix(in srgb, #3b82f6 14%, transparent)", fg: "#1e40af" },
  socialworker:  { bg: "color-mix(in srgb, #16a34a 14%, transparent)", fg: "#15803d" },
  litigation:    { bg: "color-mix(in srgb, #6366f1 14%, transparent)", fg: "#3730a3" },
  hr:            { bg: "color-mix(in srgb, #f59e0b 14%, transparent)", fg: "#92400e" },
  finance:       { bg: "color-mix(in srgb, #14b8a6 14%, transparent)", fg: "#0f766e" },
  administrator: { bg: "color-mix(in srgb, #ef4444 14%, transparent)", fg: "#991b1b" },
  director:      { bg: "color-mix(in srgb, #a855f7 14%, transparent)", fg: "#6b21a8" },
  superadmin:    { bg: "color-mix(in srgb, #6b7280 14%, transparent)", fg: "#374151" },
};

interface Props { userName: string; role: string }

export default function TopBar({ userName, role }: Props) {
  const pathname = usePathname();
  const crumbs = breadcrumb(pathname);
  const palette = ROLE_PALETTE[role] ?? ROLE_PALETTE.superadmin;

  // Last crumb = current page title (large). Earlier crumbs = small parent path.
  const current = crumbs[crumbs.length - 1];
  const parents = crumbs.slice(0, -1);

  return (
    <header className="sticky top-0 z-10 border-b h-17 flex items-center justify-between gap-4 px-3 pb-5"
      style={{
        background: "color-mix(in srgb, var(--surface) 75%, transparent)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderColor: "var(--sidebar-border)",
      }}>
      <div className="min-w-0 flex-1">
        {/* Always render the small line — falls back to the role label when there are no parent crumbs.
            Keeps the topbar a consistent height across nested and root pages. */}
        <nav className="flex items-center gap-1 text-[11px] text-(--muted) leading-none mb-1.5 ">
          {parents.length > 0 ? (
            <>
              {parents.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1">
                  {i > 0 && <span className="opacity-40">›</span>}
                  <span className="truncate">{c.label}</span>
                </span>
              ))}
              <span className="opacity-40">›</span>
            </>
          ) : (
            <span className="uppercase tracking-widest opacity-70 ">Janman Legal Aid</span>
          )}
        </nav>
        <h1 className="text-lg sm:text-xl font-bold text-(--text) tracking-tight truncate leading-none">
          {current?.label ?? "Home"}
        </h1>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden sm:inline text-[12px] text-(--text) font-medium truncate max-w-45 pb-8">{userName}</span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide capitalize whitespace-nowrap"
          style={{ background: palette.bg, color: palette.fg }}>
          {role}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

function breadcrumb(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Home", href: "/" }];
  return parts.map((p, i) => ({
    label: titleCase(p.replace(/-/g, " ").replace(/\[|\]/g, "")),
    href: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

function titleCase(s: string): string {
  if (/^[a-f\d]{24}$/i.test(s)) return "Detail";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
