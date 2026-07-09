import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import ActivityPlanner from "@/components/activities/ActivityPlanner";
import PageHeader from "@/components/ui/PageHeader";

export default async function ActivitiesPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  const t = await getServerT();

  const canAssign = ["director", "superadmin", "administrator", "hr"].includes(session.role);

  return (
    <div className="space-y-6">
      <PageHeader icon="🎯" title={t("Activity Planner")}
        subtitle={canAssign
          ? t("Plan your work and assign activities to other team members. Track status with the chart.")
          : t("Plan your work, track progress, and see what others have assigned to you.")} />

      <ActivityPlanner currentUserId={session.id} currentRole={session.role} />
    </div>
  );
}
