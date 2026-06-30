import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import TeamCalendar from "@/components/shared/TeamCalendar";

export default async function AdministratorCalendarPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "administrator" && session.role !== "superadmin")) redirect("/login");

  // Administrators can't open the director case-detail pages, so hearings render
  // as read-only rows (no caseHrefBase) — they still see every hearing date.
  return (
    <TeamCalendar role={session.role} assignHref="/administrator/assign" />
  );
}
