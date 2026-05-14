import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import JanSahayakPro from "@/components/jan-sahayak-pro/JanSahayakPro";

/** Internal org-management app: casework, kanban, DLF tracker, event pipeline,
 *  annual report drafter. Director / superadmin only. */
export default async function Page() {
  const session = await getSessionFromCookies();
  const allowed = ["director", "superadmin"];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  return <JanSahayakPro />;
}
