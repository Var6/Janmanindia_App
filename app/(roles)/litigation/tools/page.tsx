import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import LegalSuite from "@/components/legal-suite/LegalSuite";

/** Legal research & drafting suite for the litigation team. */
export default async function Page() {
  const session = await getSessionFromCookies();
  const allowed = ["litigation", "director", "superadmin"];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  return <LegalSuite />;
}
