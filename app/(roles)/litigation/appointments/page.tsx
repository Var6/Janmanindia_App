import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Appointment from "@/models/Appointment";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function LitigationAppointmentsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const dbOk = await tryConnectDB();
  const appointments = dbOk
    ? await Appointment.find({ litigationMember: session.id })
        .populate("citizen", "name email phone")
        .populate("socialWorker", "name")
        .sort({ proposedDate: 1 })
        .lean()
    : [];

  const pending = appointments.filter((a) => a.status === "approved_sw");
  const confirmed = appointments.filter((a) => a.status === "confirmed_litigation");
  const rejected = appointments.filter((a) => a.status === "rejected");

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Appointments</h1>
        <p className="text-sm text-(muted) mt-1">
          Appointments passed to you by social workers. Confirm or decline.
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">
            Awaiting Your Confirmation
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pending.length}</span>
          </h2>
          <div className="space-y-3">
            {pending.map((apt) => {
              const citizen = apt.citizen as unknown as { name: string; email: string; phone?: string } | null;
              const sw = apt.socialWorker as unknown as { name: string } | null;
              return (
                <div key={String(apt._id)} className="bg-(surface) rounded-2xl border border-(accent)/30 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-(text)">{citizen?.name ?? "—"}</p>
                      <p className="text-xs text-(muted)">
                        {citizen?.email}{citizen?.phone ? ` · ${citizen.phone}` : ""}
                      </p>
                      <p className="text-xs text-(muted) mt-0.5">Via Social Worker: {sw?.name ?? "—"}</p>
                    </div>
                    <p className="text-sm font-medium text-(text) shrink-0">
                      {new Date(apt.proposedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <p className="text-sm text-(muted) mb-4">Reason: {apt.reason}</p>
                  <div className="flex gap-2">
                    <form method="POST" action={`/api/appointments?id=${String(apt._id)}&action=confirm`}>
                      <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl bg-(accent) text-(accent-contrast) hover:opacity-90">
                        Confirm Appointment
                      </button>
                    </form>
                    <form method="POST" action={`/api/appointments?id=${String(apt._id)}&action=reject`}>
                      <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl border border-(border) text-(text) hover:bg-(bg)">
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Confirmed ({confirmed.length})</h2>
          <div className="space-y-2">
            {confirmed.map((apt) => {
              const citizen = apt.citizen as unknown as { name: string } | null;
              return (
                <div key={String(apt._id)} className="flex items-center justify-between px-5 py-3 bg-(surface) rounded-xl border border-green-200">
                  <div>
                    <p className="text-sm font-medium text-(text)">{citizen?.name ?? "—"}</p>
                    <p className="text-xs text-(muted)">{apt.reason}</p>
                  </div>
                  <p className="text-sm text-(muted) shrink-0">
                    {new Date(apt.proposedDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pending.length === 0 && confirmed.length === 0 && rejected.length === 0 && (
        <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-sm text-(muted)">{dbOk ? "No appointments yet." : "Connect database."}</p>
        </div>
      )}
    </div>
  );
}
