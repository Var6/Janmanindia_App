import Link from "next/link";
import { DEMO_ACCOUNTS, FEATURE_CARDS, SCHEMES, SITE_SUBTITLE, USER_ROLES } from "@/data/janman";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* HERO SECTION */}
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-24 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-[1.3fr_1fr]">
            {/* Hero Content */}
            <div className="space-y-8 flex flex-col justify-center">
              <div className="space-y-6">
                <span className="inline-block rounded-full bg-[var(--accent-foreground)]/25 px-5 py-2 text-sm font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
                  Legal aid for Bihar's most vulnerable communities
                </span>
                <h1 className="text-5xl font-bold tracking-tight text-[var(--text)] sm:text-6xl lg:text-7xl leading-tight">
                  Janman Legal Aid
                </h1>
                <p className="text-xl leading-8 text-[var(--muted)] max-w-2xl">{SITE_SUBTITLE}</p>
              </div>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 shadow-lg shadow-[var(--accent)]/20">
                  Login to Dashboard
                </Link>
                <Link href="/community" className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--border)] px-8 py-4 text-base font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] hover:border-[var(--accent)]">
                  Explore Community
                </Link>
              </div>
            </div>

            {/* Hero Features Box */}
            <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-foreground)]/10 to-transparent p-10 shadow-2xl shadow-black/5">
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">✨ Platform features</p>
                  <p className="mt-3 text-lg leading-7 text-[var(--text)]">
                    A unified workspace for citizens, advocates, paralegals and administrators to collaborate on legal support and case management.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { icon: "📋", label: "Case intake & tracking" },
                    { icon: "🤝", label: "Advocate-paralegal-client collaboration" },
                    { icon: "📚", label: "Legal rights & schemes database" },
                    { icon: "📊", label: "Real-time status dashboards" },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4 items-start">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <p className="text-[var(--muted)] leading-relaxed pt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES SECTION */}
      <section className="bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl space-y-12 px-6 py-24 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Separate journeys for each role</p>
            <h2 className="mt-3 text-4xl font-bold text-[var(--text)] sm:text-5xl">One platform, four roles</h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)] max-w-2xl">
              Public citizens, legal advocates, paralegals and administrators each get a dashboard built for their unique needs.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {USER_ROLES.map((role) => (
              <article key={role.title} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm hover:shadow-md hover:border-[var(--accent)]/50 transition">
                <h3 className="text-lg font-bold text-[var(--text)]">{role.title}</h3>
                <p className="mt-4 leading-7 text-[var(--muted)]">{role.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS SECTION */}
      <section className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl space-y-12 px-6 py-24 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Integrated workflows</p>
            <h2 className="mt-3 text-4xl font-bold text-[var(--text)] sm:text-5xl">Tools for community and campaigns</h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)] max-w-2xl">
              Build skills and mobilize communities with integrated tools for schemes, laws, campaigns and events.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Community Tool */}
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-10 shadow-sm">
              <div className="bg-[var(--accent)]/10 rounded-xl px-4 py-2 inline-block mb-6">
                <span className="text-sm font-bold text-[var(--accent)]">⚖️ Legal knowledge</span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text)]">Jan Sahayak Community</h3>
              <p className="mt-4 leading-7 text-[var(--muted)]">
                Search government schemes, understand your legal rights, and access district-level support information.
              </p>
              <ul className="mt-8 space-y-3 text-[var(--muted)]">
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Central and Bihar welfare schemes with eligibility checks</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Laws and rights guides: BNS, BNSS, POCSO, SC/ST Act</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Live case intake and community health monitoring</span>
                </li>
              </ul>
              <Link href="/community" className="mt-10 inline-flex rounded-xl bg-[var(--accent)] px-7 py-3 text-sm font-bold text-[var(--accent-contrast)] transition hover:brightness-110">
                Open Community Tool →
              </Link>
            </article>

            {/* Events Tool */}
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-10 shadow-sm">
              <div className="bg-[var(--accent)]/10 rounded-xl px-4 py-2 inline-block mb-6">
                <span className="text-sm font-bold text-[var(--accent)]">📢 Campaign design</span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text)]">Janman Events Planner</h3>
              <p className="mt-4 leading-7 text-[var(--muted)]">
                Plan awareness campaigns, trainings and community mobilization using guided workflows and AI support.
              </p>
              <ul className="mt-8 space-y-3 text-[var(--muted)]">
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Generate agendas, scripts and campaigns inspired by Indian people's movements</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Coordinate paralegal and advocate teams on one timeline</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-[var(--accent)] font-bold mt-0.5">→</span>
                  <span>Track progress and document impact across districts</span>
                </li>
              </ul>
              <Link href="/events" className="mt-10 inline-flex rounded-xl border-2 border-[var(--border)] px-7 py-3 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--surface)] hover:border-[var(--accent)]">
                Open Events Planner →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* SCHEMES & LAWS SECTION */}
      <section className="bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl space-y-12 px-6 py-24 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Quick reference</p>
            <h2 className="mt-3 text-4xl font-bold text-[var(--text)] sm:text-5xl">Key schemes everyone should know</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SCHEMES.map((scheme) => (
              <article key={scheme.name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                <h3 className="font-bold text-[var(--text)]">{scheme.name}</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{scheme.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl space-y-10 px-6 py-24 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr]">
            {/* CTA Text */}
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Get started now</p>
                <h2 className="mt-3 text-4xl font-bold text-[var(--text)] sm:text-5xl">Sign in to your dashboard</h2>
                <p className="mt-4 text-lg leading-8 text-[var(--muted)] max-w-xl">
                  Choose a demo account below to explore the platform designed for your role. Your dashboard is built to match your workflow.
                </p>
              </div>
              <Link href="/login" className="inline-flex w-fit rounded-xl bg-[var(--accent)] px-8 py-4 text-base font-bold text-[var(--accent-contrast)] transition hover:brightness-110 shadow-lg shadow-[var(--accent)]/20">
                Sign in now →
              </Link>
            </div>

            {/* Demo Accounts */}
            <div className="space-y-4">
              {DEMO_ACCOUNTS.map((account) => (
                <div key={account.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6">
                  <p className="font-bold text-[var(--text)]">{account.role}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[var(--muted)]">Email/ID</p>
                      <p className="mt-1 font-mono font-semibold text-[var(--accent)]">{account.id}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted)]">Password</p>
                      <p className="mt-1 font-mono font-semibold text-[var(--accent)]">{account.password}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
