export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-xl font-semibold text-[var(--text)]">Janman Legal Aid</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
              A shared legal aid platform connecting community members, advocates, paralegals, and admins across Bihar.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Support</p>
            <p className="mt-4 text-sm text-[var(--muted)]">Email: communication@janmanindia.org</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Phone: +91-9953591267</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Website: www.janmanindia.org</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Offices</p>
            <p className="mt-4 text-sm text-[var(--muted)]">Delhi: B493 Vasant Kunj Enclave, Vasant Kunj, New Delhi - 110070</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Patna: L-8, L.S Apartment, Road no 39, Anisabad, Patna</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Purnea: Madhubani Road, Dollar House Chowk, Sipahi Tola, Purnea, Bihar - 854301</p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
          © 2026 Janman People’s Foundation. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
