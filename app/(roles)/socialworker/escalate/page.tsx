import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import SosQueuePanel from "@/components/sos/SosQueuePanel";

export default async function EscalatePage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "socialworker" && session.role !== "superadmin")) redirect("/login");

  const t = await getServerT();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Escalate SOS Alerts")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Review SOS alerts escalated to you by PLVs (and community members). Confirm genuine emergencies and pass them to the litigation team.")}
        </p>
      </div>

      <SosQueuePanel
        title={t("Pending Review")}
        escalateLabel={t("Escalate to litigation")}
        emptyText={t("No open SOS alerts.")}
      />
    </div>
  );
}
