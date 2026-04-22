import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  user:        "/user",
  socialworker:"/socialworker",
  litigation:  "/litigation",
  hr:          "/hr",
  finance:     "/finance",
  admin:       "/admin",
  superadmin:  "/superadmin",
};

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  redirect(ROLE_HOME[session.role] ?? "/login");
}
