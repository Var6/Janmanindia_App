"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const accounts = [
  { id: "public@example.com", password: "public123", role: "Public", name: "Public User" },
  { id: "advocate@example.com", password: "advocate123", role: "Advocate / Lawyer", name: "Advocate User" },
  { id: "paralegal@example.com", password: "paralegal123", role: "Paralegal", name: "Paralegal User" },
  { id: "admin@example.com", password: "admin123", role: "Admin", name: "Admin User" },
];

type Account = (typeof accounts)[number];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = accounts.find(
      (account) => account.id === identifier.trim().toLowerCase() && account.password === password
    );

    if (found) {
      setUser(found);
      setError("");
    } else {
      setUser(null);
      setError("Invalid credentials. Please use one of the sample demo accounts below.");
    }
  }

  function handleLogout() {
    setUser(null);
    setIdentifier("");
    setPassword("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Shared login</p>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--text)] sm:text-4xl">Login for Public, Advocate, Paralegal, or Admin</h1>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">Use the same login page to access the correct role panel. Demo credentials are listed below.</p>
          </div>
          <Link href="/" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] hover:text-[var(--accent)]">
            Back to homepage
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_0.65fr]">
          <section className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/10">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">Login</h2>
              <p className="mt-3 text-[var(--muted)]">Enter one of the demo accounts to see the role-specific dashboard.</p>
            </div>

            {user ? (
              <div className="space-y-6">
                <div className="rounded-3xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">Signed in as</p>
                  <p className="mt-3 text-xl font-semibold text-[var(--text)]">{user.name}</p>
                  <p className="text-[var(--muted)]">Role: {user.role}</p>
                </div>

                <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                  {user.role === "Public" && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)]">Public Dashboard</h3>
                      <p className="mt-2 text-[var(--muted)]">Search for legal help, review rights guides, and request assistance from the Janman network.</p>
                      <ul className="mt-4 space-y-2 text-[var(--muted)]">
                        <li>• Request legal aid</li>
                        <li>• View Bihar scheme highlights</li>
                        <li>• Contact a case support team</li>
                      </ul>
                    </div>
                  )}
                  {user.role === "Advocate / Lawyer" && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)]">Advocate Dashboard</h3>
                      <p className="mt-2 text-[var(--muted)]">Manage client cases, review filings, and coordinate with paralegals and the admin team.</p>
                      <ul className="mt-4 space-y-2 text-[var(--muted)]">
                        <li>• My active cases</li>
                        <li>• Client communication</li>
                        <li>• Document review and hearing schedule</li>
                      </ul>
                    </div>
                  )}
                  {user.role === "Paralegal" && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)]">Paralegal Dashboard</h3>
                      <p className="mt-2 text-[var(--muted)]">Coordinate outreach, support community training, and assist with case intake.</p>
                      <ul className="mt-4 space-y-2 text-[var(--muted)]">
                        <li>• Volunteer assignments</li>
                        <li>• Community awareness tasks</li>
                        <li>• Legal literacy resources</li>
                      </ul>
                    </div>
                  )}
                  {user.role === "Admin" && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)]">Admin Dashboard</h3>
                      <p className="mt-2 text-[var(--muted)]">Monitor platform usage, manage users, and oversee the legal aid operations.</p>
                      <ul className="mt-4 space-y-2 text-[var(--muted)]">
                        <li>• User activity overview</li>
                        <li>• Case status management</li>
                        <li>• System alerts</li>
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full rounded-full bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-foreground)]"
                >
                  Logout
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-[var(--text)]">
                    Email or User ID
                  </label>
                  <input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="public@example.com"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[var(--text)]">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {error && <p className="text-sm text-rose-500">{error}</p>}

                <button
                  type="submit"
                  className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
                >
                  Sign in
                </button>
              </form>
            )}
          </section>

          <aside className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/10">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">Demo credentials</h2>
              <p className="mt-3 text-[var(--muted)]">Use one of these accounts to see the matching UI panel for that role.</p>
            </div>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text)]">
                  <p className="font-semibold text-[var(--text)]">{account.role}</p>
                  <p className="mt-2">id: <span className="font-medium text-[var(--accent)]">{account.id}</span></p>
                  <p>password: <span className="font-medium text-[var(--accent)]">{account.password}</span></p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
