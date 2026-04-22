import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import CaseDetailPage from "@/components/shared/CaseDetailPage";

export default async function SWCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const { caseId } = await params;

  return (
    <CaseDetailPage
      caseId={caseId}
      canEdit={false}
      backHref="/socialworker/cases"
      backLabel="Cases"
    />
  );
}
