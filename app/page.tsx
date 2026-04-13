import Link from "next/link";

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
              Janman Legal Aid — connect with rights, lawyers, paralegals and support teams.
            </h1>
            <p className="max-w-xl text-[var(--muted)] sm:text-lg">
              One shared app for Public, Advocate/Lawyer, Paralegal and Admin users. Login once and access the role-specific dashboard built for legal aid, case support, community outreach, and administration.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
                Go to Login
              </Link>
              <a href="#roles" className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]">
                See User Types
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/10">
            <h2 className="text-xl font-semibold text-[var(--text)]">Why Janman Legal Aid?</h2>
            <ul className="mt-6 space-y-4 text-[var(--muted)]">
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />Fast login for four user roles</li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />Role-based dashboards for public help, lawyers, paralegals and admins</li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />Centralized case access, task tracking and outreach tools</li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />Designed for Bihar’s legal aid ecosystem</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="roles" className="border-t border-[var(--border)] bg-[var(--bg)] py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">User panels</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--text)] sm:text-4xl">Four user experiences, one legal aid platform</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {[
              {title:"Public / Citizen", description:"Search assistance, rights information, government schemes and request legal help."},
              {title:"Advocate / Lawyer", description:"Manage cases, review documents, and support clients with legal guidance."},
              {title:"Paralegal", description:"Coordinate outreach, volunteer support, and community legal literacy efforts."},
              {title:"Admin", description:"Monitor users, manage workflows, and keep the legal aid system running smoothly."},
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg shadow-black/5">
                <h3 className="text-xl font-semibold text-[var(--text)]">{item.title}</h3>
                <p className="mt-3 text-[var(--muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_0.7fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold text-[var(--text)]">Ready to start?</h2>
              <p className="mt-4 max-w-2xl text-[var(--muted)]">Use the shared login page for all users and explore your role-specific dashboard. The login page includes the test credentials for every account type.</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Demo accounts</p>
              <dl className="mt-6 space-y-4 text-sm leading-7">
                <div>
                  <dt className="font-semibold text-[var(--text)]">Public</dt>
                  <dd>id: public@example.com</dd>
                  <dd>password: public123</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Advocate / Lawyer</dt>
                  <dd>id: advocate@example.com</dd>
                  <dd>password: advocate123</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Paralegal</dt>
                  <dd>id: paralegal@example.com</dd>
                  <dd>password: paralegal123</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Admin</dt>
                  <dd>id: admin@example.com</dd>
                  <dd>password: admin123</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


