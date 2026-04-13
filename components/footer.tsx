export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xl font-semibold text-[var(--text)]">Janman Legal Aid</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
              A shared legal aid platform connecting citizens, advocates, paralegals, and admins across Bihar.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Support</p>
            <p className="mt-4 text-sm text-[var(--muted)]">Email: support@janman.org</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Phone: +91 612 123 4567</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Address</p>
            <p className="mt-4 text-sm text-[var(--muted)]">Janman People’s Foundation</p>
            <p className="text-sm text-[var(--muted)]">Patna, Bihar, India</p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
          © 2026 Janman People’s Foundation. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
