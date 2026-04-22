"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "community" | "socialworker" | "litigation" | "hr" | "finance" | "administrator" | "director" | "superadmin";

const ROLES: {
  role: Role;
  label: string;
  home: string;
  dot: string;
  email: string;
}[] = [
  { role: "community",         label: "Community",          home: "/community",         dot: "var(--info)",    email: "community@dev.janmanindia.in"        },
  { role: "socialworker", label: "Social Worker",     home: "/socialworker", dot: "var(--success)", email: "sw@dev.janmanindia.in"           },
  { role: "litigation",   label: "Litigation Member", home: "/litigation",   dot: "var(--accent)",  email: "litigation@dev.janmanindia.in"   },
  { role: "hr",           label: "HR",                home: "/hr",           dot: "var(--warning)", email: "hr@dev.janmanindia.in"           },
  { role: "finance",      label: "Finance",           home: "/finance",      dot: "var(--info)",    email: "finance@dev.janmanindia.in"      },
  { role: "administrator",label: "Administrator",     home: "/administrator", dot: "var(--warning)", email: "administrator@dev.janmanindia.in" },
  { role: "director",     label: "Director",          home: "/director",     dot: "var(--error)",   email: "director@dev.janmanindia.in"     },
  { role: "superadmin",   label: "Super Admin",       home: "/superadmin",   dot: "var(--muted)",   email: "superadmin@dev.janmanindia.in"   },
];

interface SeedSummary {
  users?: string;
  cases?: string;
  appointments?: string;
  eodReports?: string;
  sosAlerts?: string;
}

export default function DevPage() {
  const [seeding, setSeeding]       = useState(false);
  const [seedResult, setSeedResult] = useState<{ ok: boolean; msg: string; summary?: SeedSummary } | null>(null);
  const [switching, setSwitching]   = useState<Role | null>(null);

  async function seed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res  = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSeedResult({ ok: true, msg: "Database seeded successfully.", summary: data.summary });
      } else {
        setSeedResult({ ok: false, msg: data.error ?? "Seed failed." });
      }
    } catch {
      setSeedResult({ ok: false, msg: "Network error — is the dev server running?" });
    } finally {
      setSeeding(false);
    }
  }

  async function switchRole(role: Role, home: string) {
    setSwitching(role);
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
        alert(d.error ?? "Failed — did you seed users first?");
      }
    } catch {
      alert("Network error.");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">
      <div className="mx-auto max-w-2xl px-5 py-12 space-y-6 sm:px-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid color-mix(in srgb,var(--warning) 30%,transparent)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              DEV BYPASS — remove before production
            </div>
            <h1 className="text-2xl font-bold text-(--text)">Dev Panel</h1>
            <p className="mt-1 text-sm text-(--muted)">
              Requires <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: "var(--bg-secondary)" }}>DEV_BYPASS=true</code> in <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: "var(--bg-secondary)" }}>.env.local</code>
            </p>
          </div>
          <Link href="/"
            className="shrink-0 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--muted) hover:text-(--text) hover:border-(--accent) transition-all">
            ← Home
          </Link>
        </div>

        {/* Step 1 — Seed */}
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-6"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-(--accent-contrast)"
              style={{ background: "var(--accent)" }}>1</span>
            <h2 className="font-semibold text-(--text)">Seed Test Data</h2>
          </div>
          <p className="text-sm text-(--muted) mb-4 pl-9">
            Inserts 11 users, 4 cases, appointments, EOD reports, and SOS alerts. Safe to re-run — old dev records are replaced.
          </p>

          <button onClick={seed} disabled={seeding}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            {seeding ? "Seeding…" : "Seed All Collections"}
          </button>

          {seedResult && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm space-y-1"
              style={{
                background: seedResult.ok ? "var(--success-bg)" : "var(--error-bg)",
                color:      seedResult.ok ? "var(--success-text)" : "var(--error-text)",
                border:     `1px solid color-mix(in srgb,${seedResult.ok ? "var(--success)" : "var(--error)"} 25%,transparent)`,
              }}>
              <p className="font-semibold">{seedResult.ok ? "✓" : "✗"} {seedResult.msg}</p>
              {seedResult.summary && (
                <ul className="text-xs space-y-0.5 mt-1 opacity-90">
                  {Object.entries(seedResult.summary).map(([k, v]) => (
                    <li key={k}><span className="capitalize">{k}:</span> {v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Step 2 — Switch role */}
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-6"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-(--accent-contrast)"
              style={{ background: "var(--accent)" }}>2</span>
            <h2 className="font-semibold text-(--text)">Enter as Role</h2>
          </div>
          <p className="text-sm text-(--muted) mb-4 pl-9">
            Looks up the dev user in MongoDB, mints a real JWT, and navigates to their dashboard. Seed first if this fails.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map(({ role, label, home, dot, email }) => (
              <button key={role}
                onClick={() => switchRole(role, home)}
                disabled={switching === role}
                className="flex items-center gap-3 rounded-xl border border-(--border) p-3.5 text-left transition-all hover:border-(--accent) disabled:opacity-60"
                style={{ background: "var(--bg)" }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-(--text)">{label}</p>
                  <p className="text-xs text-(--muted) truncate font-mono">{email}</p>
                </div>
                {switching === role ? (
                  <span className="text-xs text-(--muted)">…</span>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5 text-(--muted) shrink-0">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — Manual login table */}
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-6"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-(--accent-contrast)"
              style={{ background: "var(--accent)" }}>3</span>
            <h2 className="font-semibold text-(--text)">Manual Login (optional)</h2>
          </div>
          <p className="text-sm text-(--muted) mb-4 pl-9">
            All accounts use password <code className="font-mono rounded px-1.5 py-0.5 text-xs" style={{ background: "var(--bg-secondary)" }}>Dev@1234</code>.
            <Link href="/login" className="ml-2 text-(--accent) hover:underline">Open login page →</Link>
          </p>

          <div className="overflow-x-auto rounded-xl border border-(--border)">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border)" style={{ background: "var(--bg-secondary)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-(--muted)">Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-(--muted)">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-(--muted)">Dashboard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {ROLES.map(({ role, label, home, dot, email }) => (
                  <tr key={role} className="hover:bg-(--bg-secondary) transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                        <span className="text-sm text-(--text-2)">{label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-(--accent)">{email}</td>
                    <td className="px-4 py-2.5">
                      <a href={home}
                        className="text-xs font-medium text-(--info) hover:underline underline-offset-2">
                        {home}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-(--muted)">
          This page is only available when <code className="font-mono">DEV_BYPASS=true</code>. Do not ship to production.
        </p>
      </div>
    </main>
  );
}
