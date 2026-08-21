import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ExpenditureClient from "./ExpenditureClient";

export default async function ExpenditurePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <ExpenditureClient
      currentUser={{ id: session.id, name: session.name, role: session.role }}
    />
  );
}
