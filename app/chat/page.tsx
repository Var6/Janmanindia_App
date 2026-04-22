import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ChatApp from "@/components/chat/ChatApp";

export default async function ChatPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return <ChatApp currentUserId={session.id} currentUserName={session.name} />;
}
