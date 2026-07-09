import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

/**
 * Legacy /settings URL — personal settings now live on each role's profile
 * page (language, avatar, Google Calendar connection, account deletion).
 * Redirect there instead of rendering the old demo-session page.
 */
export default async function SettingsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  redirect(`/${session.role}/profile`);
}
