import Link from "next/link";
import { DEMO_ACCOUNTS, SCHEMES, SITE_SUBTITLE, USER_ROLES } from "@/data/janman";
import RoleCard from "@/components/shared/RoleCard";

const ROLE_CONFIG = [
  { icon: "👤", color: "var(--info-bg)",    border: "var(--info)",    label: "Citizen"       },
  { icon: "⚖️", color: "var(--success-bg)", border: "var(--success)", label: "Advocate"      },
  { icon: "🤝", color: "var(--accent-subtle)", border: "var(--accent)", label: "Social Worker" },
  { icon: "🛡️", color: "var(--error-bg)",   border: "var(--error)",   label: "Admin"         },
];

const PLATFORM_FEATURES = [
  { icon: "📋", label: "Case intake & FIR support" },
  { icon: "🔔", label: "SOS alerts with escalation" },
  { icon: "📅", label: "Hearing reminders via calendar" },
  { icon: "📊", label: "Role-specific live dashboards" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-(--border) bg-(--surface)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">

            <div className="space-y-7">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ring-1"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)", ringColor: "var(--accent-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Legal aid for Bihar&apos;s most vulnerable communities
                </span>

                <h1 className="text-4xl font-extrabold tracking-tight text-(--text) sm:text-5xl lg:text-6xl leading-[1.1]">
                  Janman<br />
                  <span style={{ color: "var(--accent)" }}>Legal Aid</span>
                </h1>

                <p className="text-lg leading-relaxed text-(--muted) max-w-xl">{SITE_SUBTITLE}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
                  style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
                  Login to Dashboard
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </Link>
                <Link href="/community"
                  className="inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg) px-6 py-3 text-sm font-semibold text-(--text) hover:border-(--accent) hover:bg-(--surface) transition">
                  Explore Community
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 pt-2 border-t border-(--border)">
                {[
                  { value: "7",    label: "Role types" },
                  { value: "Bihar", label: "Focus state" },
                  { value: "Free",  label: "Legal aid" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-bold text-(--text)">{s.value}</p>
                    <p className="text-xs text-(--muted)">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature card */}
            <div className="rounded-2xl border border-(--border) p-7 space-y-6"
              style={{ background: "linear-gradient(135deg, var(--accent-subtle) 0%, var(--surface) 60%)", boxShadow: "var(--shadow-lg)" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">Platform features</p>
                <p className="mt-2 text-sm text-(--text-2) leading-relaxed">
                  A unified workspace for citizens, advocates, social workers, and administrators to collaborate on case management and legal support.
                </p>
              </div>
              <ul className="space-y-3">
                {PLATFORM_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center shrink-0">{f.icon}</span>
                    <span className="text-sm text-(--text-2)">{f.label}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-(--border)">
                <p className="text-xs text-(--muted)">All roles share one platform — separate dashboards, same mission.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────────────────── */}
      <section id="roles" className="border-b border-(--border) bg-(--bg)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">Separate journeys for each role</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">One platform, seven roles</h2>
            <p className="mt-3 text-(--muted) leading-relaxed">
              Citizens, social workers, litigation members, HR, finance, admin, and superadmin — each gets a tailored dashboard.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {USER_ROLES.map((role, i) => {
              const cfg = ROLE_CONFIG[i] ?? ROLE_CONFIG[0];
              return (
                <RoleCard
                  key={role.title}
                  icon={cfg.icon}
                  title={role.title}
                  description={role.description}
                  borderColor={cfg.border}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Tools ────────────────────────────────────────────────────────── */}
      <section className="border-b border-(--border) bg-(--surface)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">Integrated workflows</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">Tools for community and campaigns</h2>
            <p className="mt-3 text-(--muted) leading-relaxed">
              Mobilize communities with integrated tools for schemes, laws, campaigns and events.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                tag: "⚖️ Legal knowledge",
                title: "Jan Sahayak Community",
                desc: "Search government schemes, understand your legal rights, and access district-level support information.",
                bullets: [
                  "Central and Bihar welfare schemes with eligibility checks",
                  "Laws and rights guides: BNS, BNSS, POCSO, SC/ST Act",
                  "Live case intake and community health monitoring",
                ],
                cta: { href: "/community", label: "Open Community Tool", primary: true },
              },
              {
                tag: "📢 Campaign design",
                title: "Janman Events Planner",
                desc: "Plan awareness campaigns and community mobilization using guided AI-powered workflows.",
                bullets: [
                  "Generate agendas and campaigns inspired by Indian people's movements",
                  "Coordinate paralegal and advocate teams on one timeline",
                  "Track progress and document impact across districts",
                ],
                cta: { href: "/events", label: "Open Events Planner", primary: false },
              },
            ].map((tool) => (
              <article key={tool.title} className="rounded-2xl border border-(--border) bg-(--bg) p-7 flex flex-col" style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold w-fit mb-5"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent-muted)" }}>
                  {tool.tag}
                </div>
                <h3 className="text-xl font-bold text-(--text)">{tool.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-(--muted) flex-1">{tool.desc}</p>
                <ul className="mt-5 space-y-2">
                  {tool.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-(--text-2)">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link href={tool.cta.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                      tool.cta.primary
                        ? "text-(--accent-contrast) hover:brightness-110"
                        : "border border-(--border) text-(--text) hover:border-(--accent) hover:bg-(--surface)"
                    }`}
                    style={tool.cta.primary ? { background: "var(--accent)" } : {}}>
                    {tool.cta.label}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                      <path d="M3 8h10M9 4l4 4-4 4"/>
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Schemes ──────────────────────────────────────────────────────── */}
      <section className="border-b border-(--border) bg-(--bg)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">Quick reference</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">Key schemes everyone should know</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCHEMES.map((scheme) => (
              <article key={scheme.name}
                className="rounded-2xl border border-(--border) bg-(--surface) p-5 hover:border-(--accent) transition-colors"
                style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="w-8 h-8 rounded-lg bg-(--accent)/10 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4" style={{ color: "var(--accent)" }}>
                    <path d="M8 1v14M3 4.5h6a2.5 2.5 0 010 5H4m0 3.5h6"/>
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-(--text)">{scheme.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-(--muted)">{scheme.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-(--surface) border-b border-(--border)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">Get started now</p>
                <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">Sign in to your dashboard</h2>
                <p className="mt-3 text-(--muted) leading-relaxed max-w-lg">
                  Use a demo account to explore the platform designed for your role. Each dashboard is built to match your workflow.
                </p>
              </div>
              <Link href="/login"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
                Sign in now
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account, i) => {
                const cfg = ROLE_CONFIG[i] ?? ROLE_CONFIG[0];
                return (
                  <div key={account.id}
                    className="rounded-xl border border-(--border) bg-(--bg) p-4 hover:border-(--accent) transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{cfg.icon}</span>
                      <p className="text-sm font-semibold text-(--text)">{account.role}</p>
                    </div>
                    <p className="text-xs font-mono text-(--accent) truncate">{account.id}</p>
                    <p className="text-xs text-(--muted) mt-0.5">Pass: <span className="font-mono">{account.password}</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-(--bg) border-t border-(--border) px-5 py-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-(--muted)">
          <p>© 2026 Janman Legal Aid — Bihar, India</p>
          <div className="flex gap-5">
            <Link href="/community" className="hover:text-(--text) transition-colors">Community</Link>
            <Link href="/events" className="hover:text-(--text) transition-colors">Events</Link>
            <Link href="/training" className="hover:text-(--text) transition-colors">Training</Link>
            <Link href="/dev" className="hover:text-(--text) transition-colors">Dev</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
