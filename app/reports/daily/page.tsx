import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import DailyReportComposer from "@/components/reports/DailyReportComposer";
import { REPORT_VIEWER_ROLES } from "@/lib/daily-report";

/**
 * Every staff member's daily-report space: submit today's report (rich text,
 * immutable once filed) and review their own history. Layout-level AppShell
 * already restricts /reports/* to staff roles.
 */
export default async function DailyReportPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <DailyReportComposer isViewer={REPORT_VIEWER_ROLES.includes(session.role)} />
    </div>
  );
}
