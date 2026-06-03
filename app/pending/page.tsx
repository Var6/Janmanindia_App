import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import SignOutButton from "./SignOutButton";

const ROLE_HOME: Record<string, string> = {
  community: "/community",
  socialworker: "/socialworker",
  litigation: "/litigation",
  hr: "/hr",
  finance: "/finance",
  administrator: "/administrator",
  director: "/director",
  superadmin: "/superadmin",
};

/** Awaiting-role-assignment screen for first-time @janmanindia.org sign-ins. */
export default async function PendingPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  const t = await getServerT();

  // If a superadmin has already assigned a role since this page was loaded,
  // bounce the user straight to their dashboard.
  if (session.role !== "pending") {
    redirect(ROLE_HOME[session.role] ?? "/");
  }

  // Show the latest stored email so the user knows which account they're signed in as.
  let displayEmail: string | undefined;
  if (await tryConnectDB()) {
    const u = await User.findById(session.id).select("email").lean();
    displayEmail = u?.email;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10 text-(--text)">
      <div className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex justify-center mb-5">
          <Image src="/logo.png" alt="Janman" width={48} height={48}
            className="rounded-xl object-contain" style={{ border: "1px solid var(--border)" }} />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-2">{t("Almost there")}</p>
        <h1 className="text-2xl font-bold leading-tight">{t("Awaiting role assignment")}</h1>
        <p className="mt-3 text-sm text-(--muted) leading-relaxed">
          {t("You're signed in as")} <span className="font-semibold text-(--text)">{session.name}</span>
          {displayEmail && <span className="block text-xs mt-1 font-mono">{displayEmail}</span>}
          {t(". A superadmin needs to assign you a role before you can access the dashboard.")}
        </p>

        <div className="mt-6 rounded-xl px-4 py-3 text-left text-xs leading-relaxed"
          style={{ background: "var(--info-bg)", color: "var(--info-text)", border: "1px solid color-mix(in srgb,var(--info) 25%,transparent)" }}>
          {t("What happens next: a superadmin will see your name on their pending sign-ups list and pick the right role for you (litigation, social worker, HR, finance, etc.). Refresh this page once that's done — you'll be sent to your dashboard automatically.")}
        </div>

        <SignOutButton className="mt-6" />

        <div className="mt-6 pt-5 border-t border-(--border)/60 text-xs text-(--muted)">
          <Link href="/" className="hover:text-(--text) transition-colors">{t("← Back to home")}</Link>
        </div>
      </div>
    </main>
  );
}
