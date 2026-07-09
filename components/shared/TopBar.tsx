"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";
import NotificationBell from "@/components/shared/NotificationBell";
import { useT } from "@/components/i18n/LanguageProvider";

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

interface Props { userName: string; role: string; roles?: string[] }

export default function TopBar({ userName, role, roles }: Props) {
  const pathname = usePathname();
  const crumbs = breadcrumb(pathname);
  const palette = ROLE_PALETTE[role] ?? ROLE_PALETTE.superadmin;

  // Last crumb = current page title (large). Earlier crumbs = small parent path.
  const current = crumbs[crumbs.length - 1];
  const parents = crumbs.slice(0, -1);

  return (
    <header className="sticky top-0 z-10 border-b flex items-center justify-between gap-4 px-4"
      style={{
        height: 68,
        background: "color-mix(in srgb, var(--surface) 75%, transparent)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderColor: "var(--sidebar-border)",
      }}>
      <div className="min-w-0 flex-1">
        {/* Always render the small line — falls back to the role label when there are no parent crumbs.
            Keeps the topbar a consistent height across nested and root pages. */}
        <nav className="flex items-center gap-1 text-[12px] text-(--muted) leading-none mb-1.5 ">
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
        <span className="hidden sm:inline text-[12px] text-(--text) font-medium truncate max-w-45">{userName}</span>
        <NotificationBell />
        <RoleSwitcher role={role} roles={roles} />
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Role badge that becomes a dropdown switcher for multi-role users. Switching
 *  re-issues the session token with the chosen role as active, then does a full
 *  navigation so the server renders that role's workspace. */
function RoleSwitcher({ role, roles }: { role: string; roles?: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const palette = ROLE_PALETTE[role] ?? ROLE_PALETTE.superadmin;
  const options = (roles ?? []).filter((r) => r !== "pending");
  const multi = options.length > 1;

  async function switchTo(next: string) {
    if (next === role) { setOpen(false); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.redirectTo) {
        // Full navigation so every server component re-reads the new active role.
        window.location.href = d.redirectTo;
      } else {
        setBusy(false);
        alert(d.error ?? t("Could not switch role."));
      }
    } catch {
      setBusy(false);
    }
  }

  if (!multi) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide capitalize whitespace-nowrap"
        style={{ background: palette.bg, color: palette.fg }}>
        {role}
      </span>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={busy} title={t("Switch role")}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide capitalize whitespace-nowrap transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ background: palette.bg, color: palette.fg }}>
        {busy ? "…" : role}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M4 6l4 4 4-4" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 z-30 min-w-44 rounded-xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <p className="px-3 py-2 text-[11px] uppercase tracking-wide font-semibold border-b"
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}>{t("Switch role")}</p>
            {options.map((r) => {
              const p = ROLE_PALETTE[r] ?? ROLE_PALETTE.superadmin;
              const active = r === role;
              return (
                <button key={r} type="button" onClick={() => switchTo(r)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-(--bg-secondary)">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fg }} />
                    <span className="capitalize text-(--text)">{r}</span>
                  </span>
                  {active && <span className="text-[11px]" style={{ color: "var(--accent)" }}>✓ {t("Active")}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
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
