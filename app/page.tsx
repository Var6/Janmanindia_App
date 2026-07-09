import Link from "next/link";
import Image from "next/image";
import { SCHEMES, SITE_SUBTITLE, USER_ROLES } from "@/data/janman";
import RoleCard from "@/components/shared/RoleCard";
import { getServerT } from "@/lib/i18n-server";

const ROLE_CONFIG = [
  { icon: "👤", color: "var(--info-bg)",       border: "var(--info)",    label: "Community"     },
  { icon: "⚖️", color: "var(--success-bg)",    border: "var(--success)", label: "Advocate"      },
  { icon: "🤝", color: "var(--accent-subtle)", border: "var(--accent)",  label: "Social Worker" },
  { icon: "🛡️", color: "var(--error-bg)",      border: "var(--error)",   label: "Admin"         },
];

const PLATFORM_FEATURES = [
  { icon: "📋", label: "Case intake & FIR support" },
  { icon: "🔔", label: "SOS alerts with escalation" },
  { icon: "📅", label: "Hearing reminders via calendar" },
  { icon: "📊", label: "Role-specific live dashboards" },
];

export default async function Home() {
  const t = await getServerT();
  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-(--border)"
        style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Janman" width={34} height={34} priority
              className="rounded-lg object-contain" style={{ border: "1px solid var(--border)" }} />
            <div className="leading-none">
              <p className="text-sm font-bold text-(--text) tracking-tight">Janman</p>
              <p className="text-[11px] text-(--muted) uppercase tracking-widest mt-0.5">{t("Legal Aid")}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-(--text) hover:bg-(--bg-secondary) transition">
              {t("Sign in")}
            </Link>
            <Link href="/register"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
              {t("Get legal help")}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-(--border) bg-(--surface)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">

            <div className="space-y-7">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ring-1"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)", ["--tw-ring-color" as string]: "var(--accent-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {t("Free legal aid for Bihar's most vulnerable communities")}
                </span>

                <h1 className="text-4xl font-extrabold tracking-tight text-(--text) sm:text-5xl lg:text-6xl leading-[1.1]">
                  Janman<br />
                  <span style={{ color: "var(--accent)" }}>{t("Legal Aid")}</span>
                </h1>

                <p className="text-lg leading-relaxed text-(--muted) max-w-xl">{SITE_SUBTITLE}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/register"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-(--accent-contrast) transition hover:brightness-110"
                  style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
                  {t("Get legal help")}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </Link>
                <Link href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg) px-6 py-3 text-sm font-semibold text-(--text) hover:border-(--accent) hover:bg-(--surface) transition">
                  {t("Sign in to your dashboard")}
                </Link>
              </div>

              {/* Stats row — qualitative, no fabricated numbers */}
              <div className="flex flex-wrap gap-8 pt-4 border-t border-(--border)">
                {[
                  { value: t("Free"),         label: t("Always, no cost") },
                  { value: "Bihar",           label: t("Rooted in") },
                  { value: t("Confidential"), label: t("Your data, protected") },
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
                <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">{t("Platform features")}</p>
                <p className="mt-2 text-sm text-(--text-2) leading-relaxed">
                  {t("A unified workspace for community members, advocates, social workers, and administrators to collaborate on case management and legal support.")}
                </p>
              </div>
              <ul className="space-y-3">
                {PLATFORM_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center shrink-0">{f.icon}</span>
                    <span className="text-sm text-(--text-2)">{t(f.label)}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-(--border)">
                <p className="text-xs text-(--muted)">{t("All roles share one platform — separate dashboards, same mission.")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────────────────── */}
      <section id="roles" className="border-b border-(--border) bg-(--bg)">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">{t("Separate journeys for each role")}</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">{t("One platform, every role")}</h2>
            <p className="mt-3 text-(--muted) leading-relaxed">
              {t("Community members, social workers, advocates, and administrators — each gets a dashboard built for their work.")}
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
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">{t("Integrated workflows")}</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">{t("Tools for community and campaigns")}</h2>
            <p className="mt-3 text-(--muted) leading-relaxed">
              {t("Mobilize communities with integrated tools for schemes, laws, campaigns and events.")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                tag: `⚖️ ${t("Legal knowledge")}`,
                title: "Jan Sahayak Community",
                desc: t("Search government schemes, understand your legal rights, and access district-level support information."),
                bullets: [
                  t("Central and Bihar welfare schemes with eligibility checks"),
                  t("Laws and rights guides: BNS, BNSS, POCSO, SC/ST Act"),
                  t("Live case intake and community health monitoring"),
                ],
                cta: { href: "/jan-sahayak", label: t("Open Community Tool"), primary: true },
              },
              {
                tag: `📢 ${t("Campaign design")}`,
                title: "Janman Events Planner",
                desc: t("Plan awareness campaigns and community mobilization with guided workflows."),
                bullets: [
                  t("Build agendas and campaigns inspired by Indian people's movements"),
                  t("Coordinate paralegal and advocate teams on one timeline"),
                  t("Track progress and document impact across districts"),
                ],
                cta: { href: "/events", label: t("Open Events Planner"), primary: false },
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
            <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">{t("Quick reference")}</p>
            <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">{t("Key schemes everyone should know")}</h2>
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
                <p className="text-xs font-bold uppercase tracking-widest text-(--accent)">{t("Get started")}</p>
                <h2 className="mt-2 text-3xl font-bold text-(--text) sm:text-4xl">{t("Facing injustice? We're with you.")}</h2>
                <p className="mt-3 text-(--muted) leading-relaxed max-w-lg">
                  {t("Fill a short case enquiry and a trained social worker in your district will review it and reach out — usually within 48 hours. Free of cost, fully confidential.")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/register"
                className="rounded-2xl border p-5 transition-colors hover:border-(--accent)"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <p className="text-2xl">📝</p>
                <p className="mt-3 text-sm font-bold text-(--text)">{t("File a case enquiry")}</p>
                <p className="mt-1 text-xs text-(--muted)">{t("New here? Tell us what happened — no login needed.")}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {t("Start now")}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </span>
              </Link>
              <Link href="/login"
                className="rounded-2xl border p-5 transition-colors hover:border-(--accent)"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <p className="text-2xl">🔑</p>
                <p className="mt-3 text-sm font-bold text-(--text)">{t("Sign in")}</p>
                <p className="mt-1 text-xs text-(--muted)">{t("Staff and registered members — open your dashboard.")}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {t("Go to login")}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-(--bg) border-t border-(--border) px-5 py-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between text-xs text-(--muted)">
          <div className="space-y-1">
            <p className="font-semibold text-(--text)">{t("Janman Legal Aid")}</p>
            <p>{t("Operated by Janman People's Foundation · Bihar, India")}</p>
            <p>
              {t("Contact:")}{" "}
              <a href="mailto:shashwat@janmanindia.org" className="underline hover:text-(--text)">
                shashwat@janmanindia.org
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/jan-sahayak" className="hover:text-(--text) transition-colors">{t("Community")}</Link>
            <Link href="/register" className="hover:text-(--text) transition-colors">{t("Get help")}</Link>
            <Link href="/login" className="hover:text-(--text) transition-colors">{t("Sign in")}</Link>
            <Link href="/privacy" className="hover:text-(--text) transition-colors">{t("Privacy Policy")}</Link>
            <Link href="/terms" className="hover:text-(--text) transition-colors">{t("Terms of Service")}</Link>
          </div>
        </div>
        <p className="mx-auto max-w-7xl mt-6 pt-4 border-t border-(--border) text-[12px] text-(--muted)">
          {t("© 2026 Janman People's Foundation. All rights reserved.")}
        </p>
      </footer>
    </main>
  );
}
