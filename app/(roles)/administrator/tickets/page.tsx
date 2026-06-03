import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import TicketList from "@/components/logistics/TicketList";
import { getServerT } from "@/lib/i18n-server";

export default async function AdminTicketsPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "administrator" && session.role !== "superadmin")) redirect("/login");
  const t = await getServerT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Ticket Inbox")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {t("All logistics requests across the team. Respond, change status, mark fulfilled when delivered.")}
        </p>
      </div>
      <TicketList mode="admin" />
    </div>
  );
}
