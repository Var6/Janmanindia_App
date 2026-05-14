import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import AanganApp from "@/components/aangan/AanganApp";

/** Child protection field reporting (Aangan-style). v1 is in-memory only;
 *  follow-up will plug into `children` / `home_visits` collections. */
export default async function Page() {
  const session = await getSessionFromCookies();
  const allowed = ["socialworker", "director", "superadmin"];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  return <AanganApp />;
}
