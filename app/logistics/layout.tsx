import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

export default async function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-(--bg)">
      <header className="sticky top-0 z-10 bg-(--surface) border-b border-(--border) px-6 py-4 flex items-center gap-4">
        <Link href={`/${session.role}`} className="text-sm text-(--muted) hover:text-(--accent) transition-colors">
          ← Back to Dashboard
        </Link>
        <span className="text-(--border)">|</span>
        <span className="text-sm font-semibold text-(--text)">Logistics &amp; Office Requests</span>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
