"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "community" | "socialworker" | "litigation" | "hr" | "finance" | "administrator" | "director" | "superadmin";

const ROLES: { role: Role; label: string; home: string; dot: string; email: string }[] = [
  { role: "community",     label: "Community",          home: "/community",     dot: "var(--info)",    email: "community@dev.janmanindia.in"     },
  { role: "socialworker",  label: "Social Worker",      home: "/socialworker",  dot: "var(--success)", email: "sw@dev.janmanindia.in"            },
  { role: "litigation",    label: "Litigation Member",  home: "/litigation",    dot: "var(--accent)",  email: "litigation@dev.janmanindia.in"    },
  { role: "hr",            label: "HR",                 home: "/hr",            dot: "var(--warning)", email: "hr@dev.janmanindia.in"            },
  { role: "finance",       label: "Finance",            home: "/finance",       dot: "var(--info)",    email: "finance@dev.janmanindia.in"       },
  { role: "administrator", label: "Administrator",      home: "/administrator", dot: "var(--warning)", email: "administrator@dev.janmanindia.in" },
  { role: "director",      label: "Director",           home: "/director",      dot: "var(--error)",   email: "director@dev.janmanindia.in"      },
  { role: "superadmin",    label: "Super Admin",        home: "/superadmin",    dot: "var(--muted)",   email: "superadmin@dev.janmanindia.in"    },
];

/**
 * Dev login bypass — `dev` branch only. Pick a role, get a real JWT minted
 * for that role's seeded user, navigate to its dashboard. Requires
 * `DEV_BYPASS=true` in env AND the request not to be on the production host.
 *
 * If a role's seeded user is missing, run `npm run seed` (and
 * `node scripts/seed-privileged.mjs` for director / administrator).
 */
export default function DevPage() {
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState("");

  async function enterAs(role: Role, home: string) {
    setBusy(role); setError("");
    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        window.location.href = home;
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to enter as that role.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">
      <div className="mx-auto max-w-2xl px-5 py-12 space-y-6 sm:px-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid color-mix(in srgb,var(--warning) 30%,transparent)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Dev branch only — never deployed to production
            </div>
            <h1 className="text-2xl font-bold text-(--text)">Dev Panel</h1>
            <p className="mt-1 text-sm text-(--muted)">
              Pick a role to log in instantly. Requires{" "}
              <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: "var(--bg-secondary)" }}>DEV_BYPASS=true</code>{" "}
              in <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: "var(--bg-secondary)" }}>.env.local</code>.
              Refuses to mint tokens on the production domain.
            </p>
          </div>
          <Link href="/"
            className="shrink-0 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--muted) hover:text-(--text) hover:border-(--accent) transition-all">
            ← Home
          </Link>
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--surface) p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <p className="text-xs text-(--muted) mb-3">
            <span className="font-semibold text-(--text)">First time?</span> Make sure dev users exist:
            <code className="ml-2 px-2 py-0.5 rounded font-mono text-[11px]" style={{ background: "var(--bg-secondary)" }}>npm run seed</code>
          </p>

          {error && (
            <div className="mb-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)" }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map(({ role, label, home, dot, email }) => (
              <button key={role}
                onClick={() => enterAs(role, home)}
                disabled={busy === role}
                className="flex items-center gap-3 rounded-xl border border-(--border) p-3.5 text-left transition-all hover:border-(--accent) disabled:opacity-60"
                style={{ background: "var(--bg)" }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-(--text)">{label}</p>
                  <p className="text-xs text-(--muted) truncate font-mono">{email}</p>
                </div>
                {busy === role ? (
                  <span className="text-xs text-(--muted)">…</span>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5 text-(--muted) shrink-0">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-(--muted)">
            Or use the normal <Link href="/login" className="font-semibold" style={{ color: "var(--accent)" }}>/login</Link> page —
            all dev accounts use password <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-secondary)" }}>Dev@1234</code>.
          </p>
        </div>

        <p className="text-center text-xs text-(--muted)">
          This page exists on the <code className="font-mono">dev</code> branch only.
          Production builds (<code className="font-mono">main</code>) do not contain it.
        </p>
      </div>
    </main>
  );
}
