import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import CaseDetailPage from "@/components/shared/CaseDetailPage";

export default async function LitigationCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={true}
      backHref="/litigation/cases"
      backLabel="My Cases"
    />
  );
}
