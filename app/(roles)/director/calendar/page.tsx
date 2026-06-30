import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import TeamCalendar from "@/components/shared/TeamCalendar";

export default async function DirectorCalendarPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  return (
    <TeamCalendar role={session.role} assignHref="/director/assign" caseHrefBase="/director/cases" />
  );
}
