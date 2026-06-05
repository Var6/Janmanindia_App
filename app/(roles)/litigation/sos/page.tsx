import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import SosQueuePanel from "@/components/sos/SosQueuePanel";

/** SOS alerts that a social worker has escalated to the litigation team — the
 *  final tier of the ladder (community → PLV → SW → litigation). */
export default async function LitigationSosPage() {
  const session = await getSessionFromCookies();
  if (!session || !["litigation", "director", "superadmin"].includes(session.role)) redirect("/login");

  const t = await getServerT();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Escalated SOS Alerts")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("Time-sensitive matters escalated to the litigation team. Open a case where needed, then mark the alert resolved.")}
        </p>
      </div>

      <SosQueuePanel
        title={t("With Litigation")}
        escalateLabel=""
        allowEscalate={false}
        emptyText={t("No SOS alerts escalated to litigation right now.")}
      />
    </div>
  );
}
