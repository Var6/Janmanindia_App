import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import MonthlyReportsClient from "@/components/reports/MonthlyReportsClient";

export default async function MonthlyReportsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  return (
    <MonthlyReportsClient currentUser={{ id: session.id, name: session.name, role: session.role }} />
  );
}
