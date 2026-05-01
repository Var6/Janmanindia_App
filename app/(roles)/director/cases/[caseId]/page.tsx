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

  // Director and superadmin can edit cases — add documents, advance stages,
  // append diary entries — alongside the assigned litigation member.
  // Community members keep view-only access via /community/case-tracker.
  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={true}
      canManageCarePlan={true}
      backHref="/director/cases"
      backLabel="All Cases"
    />
  );
}
