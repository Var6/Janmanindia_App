import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ChatApp from "@/components/chat/ChatApp";
import { CommunityHelpTabs } from "@/components/community/SectionTabs";

export default async function ChatPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  // Community members reach /chat through the consolidated "Help & Support"
  // sidebar entry — render the same tab strip Speak to Us / SOS use so they
  // can switch between the three help pathways. Staff hit /chat from the
  // shared sidebar item and don't need the community-specific strip.
  return (
    <div className="space-y-4">
      {session.role === "community" && (
        <CommunityHelpTabs />
      )}
      <ChatApp currentUserId={session.id} currentUserName={session.name} />
    </div>
  );
}
