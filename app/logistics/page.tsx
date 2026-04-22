import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import RaiseTicket from "@/components/logistics/RaiseTicket";
import TicketList from "@/components/logistics/TicketList";

export default async function LogisticsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const isAdmin = ["administrator", "director", "superadmin"].includes(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Logistics &amp; Office Requests</h1>
        <p className="text-sm text-(--muted) mt-1">
          {isAdmin
            ? "All logistics tickets across districts. You can view your own submissions here too — for the full inbox use the Administrator dashboard."
            : "Need office equipment, transport for community members, supplies, or repairs? Raise a ticket and the Administrator will handle it."}
        </p>
      </div>

      <RaiseTicket />

      <section>
        <h2 className="text-lg font-semibold text-(--text) mb-3">My Requests</h2>
        <TicketList mode="mine" />
      </section>
    </div>
  );
}
