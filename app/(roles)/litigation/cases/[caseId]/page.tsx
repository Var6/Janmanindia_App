import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import CaseDetailPage from "@/components/shared/CaseDetailPage";

export default async function LitigationCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "litigation" && session.role !== "superadmin")) redirect("/login");

  const t = await getServerT();
  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={true}
      backHref="/litigation/cases"
      backLabel={t("My Cases")}
      dashboardHref="/litigation"
    />
  );
}
