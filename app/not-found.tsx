import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl font-black"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
          404
        </div>
        <h1 className="text-xl font-bold text-(--text) mb-2">Page not found</h1>
        <p className="text-sm text-(--muted) mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-(--accent-contrast) hover:brightness-110 transition"
            style={{ background: "var(--accent)" }}>
            Go Home
          </Link>
          <Link href="/login"
            className="px-5 py-2.5 rounded-xl border border-(--border) bg-(--surface) text-sm font-semibold text-(--text) hover:border-(--accent) hover:bg-(--bg) transition">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
