import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
          <span className="text-5xl font-black text-[var(--accent)]">404</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Page not found</h1>
        <p className="text-[var(--muted)] text-sm mb-8">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--surface)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
