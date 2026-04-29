import Link from "next/link";
import Image from "next/image";

interface Props {
  title: string;
  /** ISO date — shown verbatim under the title so reviewers and users can
   *  see when the document was last revised. */
  lastUpdated: string;
  children: React.ReactNode;
}

/** Minimal public shell for /privacy and /terms. No auth, no sidebar — these
 *  pages are linked from the Google OAuth consent screen and have to render
 *  for an anonymous crawler. */
export default function LegalShell({ title, lastUpdated, children }: Props) {
  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">
      <header className="border-b border-(--border) bg-(--surface)">
        <div className="mx-auto max-w-3xl px-5 py-5 sm:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Janman" width={32} height={32}
              className="rounded-lg object-contain" style={{ border: "1px solid var(--border)" }} />
            <div>
              <p className="text-sm font-bold leading-none tracking-tight">Janman</p>
              <p className="text-[10px] text-(--muted) mt-0.5 uppercase tracking-widest">Legal Aid</p>
            </div>
          </Link>
          <Link href="/" className="text-xs font-medium text-(--muted) hover:text-(--text) transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-(--muted)">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-(--text-2)">
          {children}
        </div>

        <footer className="mt-14 pt-6 border-t border-(--border) text-xs text-(--muted) flex flex-wrap items-center justify-between gap-3">
          <span>© Janman People's Foundation</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-(--text)">Privacy</Link>
            <Link href="/terms"   className="hover:text-(--text)">Terms</Link>
            <a href="mailto:shashwat@janmanindia.org" className="hover:text-(--text)">Contact</a>
          </span>
        </footer>
      </article>
    </main>
  );
}
