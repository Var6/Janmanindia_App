"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Field, { Input } from "@/components/ui/Field";
import Spotlight from "@/components/ui/Spotlight";
import AnimatedShinyText from "@/components/ui/AnimatedShinyText";
import { useT } from "@/components/i18n/LanguageProvider";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_invalid_state: "Sign-in session expired — please try again.",
  google_token_invalid: "We couldn't verify your Google account. Please try again.",
  google_unavailable: "Google sign-in is not configured. Use email and password instead.",
  google_callback_error: "Sign-in failed unexpectedly. Please try again or use email and password.",
  db_connect_failed: "Database is unreachable. Please try again in a moment.",
  db_lookup_failed: "Could not look up your account. Please try again.",
  db_upsert_failed: "Could not save your account details. Please try again.",
  token_sign_failed: "Could not finish sign-in. Please try again.",
  account_deactivated: "Your account is deactivated. Contact a superadmin.",
};

interface Props {
  /** When false, the Google button is omitted. Computed on the server from
   *  isGoogleLoginConfigured() so users never see a button that 100% errors. */
  googleEnabled: boolean;
}

export default function LoginForm({ googleEnabled }: Props) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner googleEnabled={googleEnabled} />
    </Suspense>
  );
}

/** Validate a `next` param coming off the URL the same way the server does —
 *  must be an in-app path, must not bounce back to login/register/api. Mirrors
 *  safeNextPath in lib/auth.ts so the URL we generate for the Google button
 *  doesn't get rejected on the server. */
function safeClientNext(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (raw.length < 1 || raw.length > 512) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.startsWith("/login") || raw.startsWith("/register") || raw.startsWith("/api/")) return null;
  return raw;
}

function LoginFormInner({ googleEnabled }: Props) {
  const t = useT();
  const searchParams = useSearchParams();
  const next = safeClientNext(searchParams.get("next"));
  const googleHref = next
    ? `/api/auth/login-google?next=${encodeURIComponent(next)}`
    : "/api/auth/login-google";
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("error");
    const detail = searchParams.get("detail");
    if (code && GOOGLE_ERROR_MESSAGES[code]) {
      // When Google auth isn't even wired up on this deployment, drop the
      // banner — the button is already hidden so the message would just be
      // confusing.
      if (code === "google_unavailable" && !googleEnabled) return;
      const base = GOOGLE_ERROR_MESSAGES[code];
      setError(detail ? `${base}\n\n[${code}] ${detail}` : base);
    }
  }, [searchParams, googleEnabled]);
  

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) { setError(t("Enter your email and password.")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, next }),
      });
      const data = await res.json() as { error?: string; redirectTo?: string };
      if (!res.ok) { setError(data.error ?? t("Invalid credentials.")); return; }
      window.location.href = data.redirectTo ?? "/";
    } catch {
      setError(t("Network error — please try again."));
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
              <p className="text-[10px] text-(--muted) mt-0.5 uppercase tracking-widest">{t("Legal Aid")}</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-medium text-(--muted) hover:text-(--text) transition-colors">
            ← {t("Back to home")}
          </Link>
        </div>

        <div className="max-w-xl mx-auto">
          {/* Login card */}
          <section className="relative overflow-hidden rounded-2xl glass p-7">
            <Spotlight color="var(--accent)" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-2">{t("Welcome back")}</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                <AnimatedShinyText>{t("Sign in to your dashboard")}</AnimatedShinyText>
              </h1>
              <p className="mt-2 text-sm text-(--muted) max-w-md">
                {t("One login for every role — community member, social worker, advocate, HR, finance, administrator, director.")}
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <Field label={t("Email")} required
                  hint={t("Use the email your account was created with.")}
                  example="priya.sharma@example.com">
                  <Input id="email" type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com" />
                </Field>

                <Field label={t("Password")} required
                  hint={t("At least 8 characters. Click the eye to show/hide.")}>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} autoComplete="current-password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" className="pr-11" />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--text) transition-colors p-1"
                      title={showPw ? t("Hide password") : t("Show password")}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
                        {showPw
                          ? <path d="M3 3l14 14M12.9 12.9A3 3 0 017.1 7.1M6.1 6.1A7.9 7.9 0 002 10s3.1 5.5 8 5.5a7.8 7.8 0 003.9-1.1M8.5 4.6A7.9 7.9 0 0118 10s-1.2 2.2-3.1 3.7"/>
                          : <><path d="M2 10s3.1-5.5 8-5.5S18 10 18 10s-3.1 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></>}
                      </svg>
                    </button>
                  </div>
                </Field>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm whitespace-pre-line"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
                    <span className="text-base shrink-0">⚠</span>
                    <span className="wrap-break-word">{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full rounded-xl py-3 text-sm font-bold text-(--accent-contrast) hover:brightness-110 transition disabled:opacity-60"
                  style={{ background: "var(--accent)", boxShadow: "0 8px 20px -8px color-mix(in srgb, var(--accent) 50%, transparent)" }}>
                  {loading ? t("Signing in…") : t("Sign in")}
                </button>
              </form>

              {googleEnabled && (
                <>
                  <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-(--muted)">
                    <div className="flex-1 h-px bg-(--border)" />
                    <span>{t("or")}</span>
                    <div className="flex-1 h-px bg-(--border)" />
                  </div>

                  {/* Google sign-in — janmanindia.org workspace lands on /pending
                      until a superadmin assigns a role; any other Gmail becomes a
                      community member automatically. The `next` query param is
                      passed through to the OAuth route so the user lands back
                      on whichever protected page the proxy bounced them off. */}
                  <a href={googleHref}
                    className="flex items-center justify-center gap-3 w-full rounded-xl py-3 text-sm font-semibold transition-colors"
                    style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.12a6.6 6.6 0 010-4.24V7.04H2.18a11 11 0 000 9.92l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    {t("Sign in with Google")}
                  </a>
                </>
              )}

              <div className="mt-6 pt-5 border-t border-(--border)/60 flex items-center justify-between text-sm">
                <span className="text-(--muted)">{t("New community member?")}</span>
                <Link href="/register" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                  {t("Register for free legal aid")} →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
