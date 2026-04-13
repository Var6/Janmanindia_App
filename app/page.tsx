import Link from "next/link";
import { DEMO_ACCOUNTS, FEATURE_CARDS, SCHEMES, SITE_SUBTITLE, USER_ROLES } from "@/data/janman";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-[var(--accent-foreground)]/15 px-4 py-2 text-sm font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/15">
              Legal Aid for Bihar Communities
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
              Janman Legal Aid — Trusted by Janman India.
            </h1>
            <p className="max-w-xl text-[var(--muted)] sm:text-lg">{SITE_SUBTITLE}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
                Login Now
              </Link>
              <Link href="/community" className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]">
                Explore Community
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold text-[var(--text)]">What Janman India provides</h2>
            <p className="mt-4 text-[var(--muted)]">Data-driven legal aid support for schemes, laws, and frontline community work.</p>
            <ul className="mt-6 space-y-4 text-[var(--muted)]">
              {FEATURE_CARDS.map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <span>
                    <strong className="text-[var(--text)]">{feature.title}:</strong> {feature.details}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--bg)] py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">User roles</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--text)] sm:text-4xl">One login for every role</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {USER_ROLES.map((item) => (
              <div key={item.title} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg shadow-black/5">
                <h3 className="text-xl font-semibold text-[var(--text)]">{item.title}</h3>
                <p className="mt-3 text-[var(--muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Janman data</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--text)] sm:text-4xl">Popular schemes and laws</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {SCHEMES.map((scheme) => (
              <div key={scheme.name} className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-lg shadow-black/5">
                <h3 className="text-lg font-semibold text-[var(--text)]">{scheme.name}</h3>
                <p className="mt-3 text-[var(--muted)]">{scheme.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_0.7fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold text-[var(--text)]">Ready to sign in?</h2>
              <p className="mt-4 max-w-2xl text-[var(--muted)]">Use the shared login page for all roles, then explore the dedicated dashboard for your role.</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Demo accounts</p>
              <dl className="mt-6 space-y-4 text-sm leading-7">
                {DEMO_ACCOUNTS.map((account) => (
                  <div key={account.id}>
                    <dt className="font-semibold text-[var(--text)]">{account.role}</dt>
                    <dd>id: {account.id}</dd>
                    <dd>password: {account.password}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


