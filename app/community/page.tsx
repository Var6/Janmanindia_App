import JanSahayakCommunity from "@/components/jan-sahayak-community";
import Link from "next/link";

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Community tool</p>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--text)] sm:text-4xl">Jan Sahayak Community</h1>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">Browse community rights resources and district legal support data powered by Janman India.</p>
          </div>
          <Link href="/" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] hover:text-[var(--accent)]">
            Back to homepage
          </Link>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl shadow-black/10">
          <JanSahayakCommunity />
        </div>
      </div>
    </main>
  );
}
