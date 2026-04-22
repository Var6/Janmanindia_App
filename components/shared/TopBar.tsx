"use client";

import { usePathname } from "next/navigation";

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

  return (
    <header className="sticky top-0 z-10 px-5 flex items-center justify-between gap-4 h-14 border-b"
      style={{
        background: "color-mix(in srgb, var(--surface) 75%, transparent)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderColor: "var(--border)",
      }}>
      <nav className="flex items-center gap-1.5 min-w-0 text-[13px]">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-(--muted)/60 select-none">›</span>}
            <span className={i === crumbs.length - 1 ? "font-semibold text-(--text) truncate" : "text-(--muted) truncate"}>
              {c.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden sm:inline text-[12px] text-(--muted) truncate max-w-50">{userName}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide capitalize whitespace-nowrap"
          style={{ background: palette.bg, color: palette.fg }}>
          {role}
        </span>
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
