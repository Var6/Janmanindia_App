import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import CaseDetailPage from "@/components/shared/CaseDetailPage";

export default async function UserCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "community") redirect("/login");

  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={false}
      backHref="/community/case-tracker"
      backLabel="Case Tracker"
    />
  );
}
