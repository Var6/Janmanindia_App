import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import SidebarNav from "@/components/shared/SidebarNav";
import TopBar from "@/components/shared/TopBar";
import VerificationGate from "@/components/community/VerificationGate";
import { navItemsFor, ROLE_LABELS } from "@/lib/nav";

interface Props {
  /** Restrict access to specific roles. Omit to allow any authenticated user. */
  allow?: string[];
  children: React.ReactNode;
}

/** Single layout shell shared by every authenticated page. */
export default async function AppShell({ allow, children }: Props) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  // First-time @janmanindia.org sign-ins land on /pending until a superadmin
  // assigns them a real role. They have no dashboard to render.
  if (session.role === "pending") redirect("/pending");
  if (allow && !allow.includes(session.role)) {
    redirect(`/${session.role}`);
  }

  const navItems = navItemsFor(session.role);
  const roleLabel = ROLE_LABELS[session.role] ?? session.role;

  // Pre-load the avatar on the server so the sidebar doesn't need a client fetch
  // to render the user photo on first paint. For community members, also pull
  // the verification status — un-verified members see a gate instead of the
  // requested page on every route they land on (dashboard, chat, training,
  // appointments, etc.). Doing this here means new community routes inherit
  // the gate automatically.
  let avatarUrl:       string | undefined;
  let verifyStatus:    "verified" | "pending" | "rejected" | undefined;
  let rejectionReason: string | undefined;
  let govtIdType:      string | undefined;
  if (await tryConnectDB()) {
    if (session.role === "community") {
      const user = await User.findById(session.id)
        .select("avatarUrl communityProfile.verificationStatus communityProfile.rejectionReason communityProfile.govtIdType")
        .lean();
      avatarUrl       = user?.avatarUrl ?? undefined;
      verifyStatus    = user?.communityProfile?.verificationStatus;
      rejectionReason = user?.communityProfile?.rejectionReason;
      govtIdType      = user?.communityProfile?.govtIdType;
    } else {
      const user = await User.findById(session.id).select("avatarUrl").lean();
      avatarUrl = user?.avatarUrl ?? undefined;
    }
  }

  // Community gate. Even though the dashboard / sidebar still renders so the
  // user can see their name + sign out, the page content is replaced with
  // either a "we're reviewing" notice or a re-upload form.
  const gated = session.role === "community" && verifyStatus && verifyStatus !== "verified";

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav navItems={navItems} roleLabel={roleLabel} userName={session.name} roleSlug={session.role} initialAvatarUrl={avatarUrl} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        <TopBar userName={session.name} role={session.role} />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-6">
            {gated ? (
              <VerificationGate
                status={verifyStatus as "pending" | "rejected"}
                rejectionReason={rejectionReason}
                govtIdType={govtIdType}
              />
            ) : (
              children
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
