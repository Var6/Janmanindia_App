"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Field, { Input } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import AnimatedShinyText from "@/components/ui/AnimatedShinyText";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) { setError(data.error ?? "Invalid credentials."); return; }
      window.location.href = data.redirectTo ?? "/";
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-(--text) flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 flex-1">
        {/* Brand row */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Janman" width={36} height={36} priority
              className="rounded-lg object-contain" style={{ border: "1px solid var(--border)" }} />
            <div>
              <p className="text-sm font-bold text-(--text) leading-none tracking-tight">Janman</p>
              <p className="text-[10px] text-(--muted) mt-0.5 uppercase tracking-widest">Legal Aid</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-medium text-(--muted) hover:text-(--text) transition-colors">
            ← Back to home
          </Link>
        </div>

        <div className="max-w-xl mx-auto">
          {/* Login card */}
          <section className="relative overflow-hidden rounded-2xl glass p-7">
            <Spotlight color="var(--accent)" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-2">Welcome back</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                <AnimatedShinyText>Sign in to your dashboard</AnimatedShinyText>
              </h1>
              <p className="mt-2 text-sm text-(--muted) max-w-md">
                One login for every role — community member, social worker, advocate, HR, finance, administrator, director.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <Field label="Email" required
                  hint="Use the email your account was created with."
                  example="priya.sharma@example.com">
                  <Input id="email" type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com" />
                </Field>

                <Field label="Password" required
                  hint="At least 8 characters. Click the eye to show/hide.">
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} autoComplete="current-password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" className="pr-11" />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--text) transition-colors p-1"
                      title={showPw ? "Hide password" : "Show password"}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
                        {showPw
                          ? <path d="M3 3l14 14M12.9 12.9A3 3 0 017.1 7.1M6.1 6.1A7.9 7.9 0 002 10s3.1 5.5 8 5.5a7.8 7.8 0 003.9-1.1M8.5 4.6A7.9 7.9 0 0118 10s-1.2 2.2-3.1 3.7"/>
                          : <><path d="M2 10s3.1-5.5 8-5.5S18 10 18 10s-3.1 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></>}
                      </svg>
                    </button>
                  </div>
                </Field>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
                    <span className="text-base shrink-0">⚠</span>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full rounded-xl py-3 text-sm font-bold text-(--accent-contrast) hover:brightness-110 transition disabled:opacity-60"
                  style={{ background: "var(--accent)", boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-(--border)/60 flex items-center justify-between text-sm">
                <span className="text-(--muted)">New community member?</span>
                <Link href="/register" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                  Register for free legal aid →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
