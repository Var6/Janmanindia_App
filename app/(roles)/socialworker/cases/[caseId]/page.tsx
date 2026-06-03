import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import CaseDetailPage from "@/components/shared/CaseDetailPage";
import { getServerT } from "@/lib/i18n-server";

export default async function SWCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "socialworker" && session.role !== "superadmin")) redirect("/login");

  const t = await getServerT();

  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={false}
      canManageCarePlan={true}
      backHref="/socialworker/cases"
      backLabel={t("Cases")}
      dashboardHref="/socialworker"
    />
  );
}
