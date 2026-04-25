import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import CaseDetailPage from "@/components/shared/CaseDetailPage";

export default async function AdminCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) {
    redirect("/login");
  }

  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={false}
      canManageCarePlan={true}
      backHref="/director/cases"
      backLabel="All Cases"
    />
  );
}
