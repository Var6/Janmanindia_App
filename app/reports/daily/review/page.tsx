import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import DailyReviewBoard from "@/components/reports/DailyReviewBoard";
import PageHeader from "@/components/ui/PageHeader";
import { getServerT } from "@/lib/i18n-server";
import { REPORT_VIEWER_ROLES } from "@/lib/daily-report";

/** Director-and-above (incl. HR & administrator) review of everyone's daily
 *  reports — calendar grid, per-day submissions, two-tier comments. */
export default async function DailyReportReviewPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!REPORT_VIEWER_ROLES.includes(session.role)) redirect("/reports/daily");
  const t = await getServerT();

  return (
    <div className="space-y-6">
      <PageHeader icon="📊" title={t("Daily Reports — Review")}
        subtitle={t("Pick a date to read every submission, see who's missing, and leave feedback — public or directors-only.")} />
      <DailyReviewBoard />
    </div>
  );
}
