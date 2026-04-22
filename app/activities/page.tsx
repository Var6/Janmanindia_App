import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ActivityPlanner from "@/components/activities/ActivityPlanner";

export default async function ActivitiesPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const canAssign = ["director", "superadmin", "administrator", "hr"].includes(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Activity Planner</h1>
        <p className="text-sm text-(--muted) mt-1">
          {canAssign
            ? "Plan your work and assign activities to other team members. Track status with the chart."
            : "Plan your work, track progress, and see what others have assigned to you."}
        </p>
      </div>

      <ActivityPlanner currentUserId={session.id} currentRole={session.role} />
    </div>
  );
}
