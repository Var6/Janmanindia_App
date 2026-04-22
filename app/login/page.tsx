"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const DEV_ACCOUNTS = [
  { role: "Citizen",        email: "user@dev.janmanindia.in",       password: "Dev@1234", dot: "var(--info)"    },
  { role: "Social Worker",  email: "sw@dev.janmanindia.in",         password: "Dev@1234", dot: "var(--success)" },
  { role: "Litigation",     email: "litigation@dev.janmanindia.in", password: "Dev@1234", dot: "var(--accent)"  },
  { role: "HR",             email: "hr@dev.janmanindia.in",         password: "Dev@1234", dot: "var(--warning)" },
  { role: "Finance",        email: "finance@dev.janmanindia.in",    password: "Dev@1234", dot: "var(--info)"    },
  { role: "Admin",          email: "admin@dev.janmanindia.in",      password: "Dev@1234", dot: "var(--error)"   },
  { role: "Super Admin",    email: "superadmin@dev.janmanindia.in", password: "Dev@1234", dot: "var(--muted)"   },
];

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  function fill(e: string, p: string) {
    setEmail(e);
    setPassword(p);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json() as { error?: string; redirectTo?: string };

      if (!res.ok) {
        setError(data.error ?? "Invalid credentials.");
        return;
      }

      // Full navigation so the new auth_token cookie is active
      window.location.href = data.redirectTo ?? "/";
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-(--bg) text-(--text) flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 flex-1">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-(--accent)">Janman Legal Aid</p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl text-(--text)">Sign in to your dashboard</h1>
            <p className="mt-1 text-sm text-(--muted)">One login for all roles — citizen, advocate, social worker, admin.</p>
          </div>
          <Link href="/"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-(--muted) hover:text-(--text) hover:border-(--accent) transition-all">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M10 3L5 8l5 5"/></svg>
            Home
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── Login form ─────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-(--border) bg-(--surface) p-7"
            style={{ boxShadow: "var(--shadow)" }}>
            <h2 className="text-xl font-bold text-(--text)">Welcome back</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Enter credentials or click a demo account on the right to fill in automatically.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-(--text-2) mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-(--border) bg-(--bg) px-4 py-2.5 text-sm text-(--text) placeholder:text-(--muted-2) outline-none transition focus:border-(--accent) focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)]"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-(--text-2) mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-(--border) bg-(--bg) px-4 py-2.5 pr-11 text-sm text-(--text) placeholder:text-(--muted-2) outline-none transition focus:border-(--accent) focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)]"
                  />
                  <button type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--text) transition-colors p-1">
                    {showPw ? (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
                        <path d="M3 3l14 14M12.9 12.9A3 3 0 017.1 7.1M6.1 6.1A7.9 7.9 0 002 10s3.1 5.5 8 5.5a7.8 7.8 0 003.9-1.1M8.5 4.6A7.9 7.9 0 0118 10s-1.2 2.2-3.1 3.7"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
                        <path d="M2 10s3.1-5.5 8-5.5S18 10 18 10s-3.1 5.5-8 5.5S2 10 2 10z"/>
                        <circle cx="10" cy="10" r="2.5"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--accent)" }}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 pt-6 border-t border-(--border) flex items-center justify-between text-sm text-(--muted)">
              <span>New citizen?</span>
              <Link href="/register"
                className="font-medium text-(--accent) hover:underline underline-offset-2">
                Register for legal aid →
              </Link>
            </div>
          </section>

          {/* ── Demo accounts ──────────────────────────────────────────── */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-(--border) bg-(--surface) p-5"
              style={{ boxShadow: "var(--shadow)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-(--text)">Dev accounts</h2>
                  <p className="text-xs text-(--muted) mt-0.5">Click any to fill credentials</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                  DEV
                </span>
              </div>

              <div className="space-y-2">
                {DEV_ACCOUNTS.map((acc) => {
                  const selected = email === acc.email;
                  return (
                    <button key={acc.email} type="button"
                      onClick={() => fill(acc.email, acc.password)}
                      className="w-full text-left rounded-xl border px-3.5 py-3 transition-all"
                      style={{
                        borderColor: selected ? "var(--accent)" : "var(--border)",
                        background: selected ? "var(--accent-subtle)" : "var(--bg)",
                      }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: acc.dot }} />
                        <span className="text-sm font-semibold text-(--text)">{acc.role}</span>
                        {selected && (
                          <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ background: "var(--accent-muted)", color: "var(--sidebar-active-text)" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-mono text-(--muted) pl-4 truncate">{acc.email}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-center text-xs text-(--muted)">
              Using the dev panel?{" "}
              <Link href="/dev" className="text-(--accent) hover:underline">Go to /dev →</Link>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
