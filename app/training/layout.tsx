import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

const TRAINING_ROLES = ["user", "socialworker", "litigation"];

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session || !TRAINING_ROLES.includes(session.role)) redirect("/login");

  const backHref = `/${session.role}`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center gap-4">
        <Link href={backHref} className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
          ← Back to Dashboard
        </Link>
        <span className="text-[var(--border)]">|</span>
        <span className="text-sm font-semibold text-[var(--text)]">Training Center</span>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
