import EodReportsPanel from "@/components/reports/EodReportsPanel";
import { getServerT } from "@/lib/i18n-server";

export default async function LitigationReportsPage() {
  const t = await getServerT();
  return (
    <EodReportsPanel
      title={t("Daily Report & Invoices")}
      subtitle={t("Log your day, court travel and case-related expenses. HR verifies, then your district's head lawyer (or director) approves the invoice.")}
    />
  );
}
