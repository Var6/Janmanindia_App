import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ExpenseReport from "@/components/finance/ExpenseReport";
import PageHeader from "@/components/ui/PageHeader";
import { getServerT } from "@/lib/i18n-server";

const VIEWERS = ["director", "superadmin", "administrator", "hr", "finance"];

/** Org-wide requisition & reimbursement report — director-and-above view of
 *  every expense (project- AND case-scoped) with live approval actions. */
export default async function ExpenseReportPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!VIEWERS.includes(session.role)) redirect(`/${session.role}`);
  const t = await getServerT();

  return (
    <div className="space-y-6">
      <PageHeader icon="🧾" title={t("Requisition & Reimbursement Report")}
        subtitle={t("Every expense across projects and cases — filter by type and status, and act on approvals inline. Approved amounts immediately reduce the project's remaining funds.")} />
      <ExpenseReport role={session.role} />
    </div>
  );
}
