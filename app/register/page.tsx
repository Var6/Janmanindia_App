"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ID_TYPES = ["aadhaar", "voter_id", "pan", "ration_card", "passport"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      govtIdType: String(formData.get("govtIdType") ?? ""),
      govtIdUrl: String(formData.get("govtIdUrl") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
      } else {
        setSuccess(data.message ?? "Registration successful.");
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--bg)" }}>
      <section className="w-full max-w-md rounded-2xl border border-(--border) bg-(--surface) p-7"
        style={{ boxShadow: "var(--shadow)" }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-(--text)">Register for Legal Aid</h1>
          <p className="text-sm text-(--muted) mt-1">
            Create a citizen account. Your ID will be reviewed by a social worker before activation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Full name</label>
            <input name="name" required type="text" autoComplete="name"
              className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>

          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Email</label>
            <input name="email" required type="email" autoComplete="email"
              className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>

          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Phone (optional)</label>
            <input name="phone" type="tel" autoComplete="tel"
              className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>

          <div>
            <label className="block text-xs font-medium text-(--muted) mb-1">Password (min 8 characters)</label>
            <input name="password" required type="password" minLength={8} autoComplete="new-password"
              className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-(--muted) mb-1">ID type</label>
              <select name="govtIdType" required defaultValue=""
                className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)">
                <option value="" disabled>Select…</option>
                {ID_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-(--muted) mb-1">ID document URL</label>
              <input name="govtIdUrl" required type="url" placeholder="https://…"
                className="w-full rounded-xl border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) focus:outline-none focus:border-(--accent)" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2 text-xs"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl px-3 py-2 text-xs"
              style={{ background: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)" }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-(--border) text-sm text-(--muted) flex items-center justify-between">
          <span>Already registered?</span>
          <Link href="/login" className="font-medium text-(--accent) hover:underline">Sign in →</Link>
        </div>
      </section>
    </main>
  );
}
