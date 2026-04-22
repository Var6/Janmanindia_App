import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import SosAlert from "@/models/SosAlert";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function EscalatePage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();
  const alerts = dbOk
    ? await SosAlert.find({ status: { $in: ["open", "escalated"] } })
        .populate("raisedBy", "name phone")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const open = alerts.filter((a) => a.status === "open");
  const escalated = alerts.filter((a) => a.status === "escalated");

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">Escalate SOS Alerts</h1>
        <p className="text-sm text-(muted) mt-1">
          Review incoming SOS alerts from citizens. Confirm and escalate genuine emergencies to higher officials.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-semibold text-(text)">Pending Review ({open.length})</h2>
        </div>
        {open.length === 0 ? (
          <div className="py-10 text-center bg-(surface) rounded-2xl border border-(border)">
            <p className="text-sm text-(muted)">{dbOk ? "No open SOS alerts." : "Connect database to see alerts."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((alert) => {
              const raisedBy = alert.raisedBy as unknown as { name: string; phone?: string } | null;
              return (
                <div key={String(alert._id)} className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-red-800">
                        {raisedBy?.name ?? "Unknown"}{raisedBy?.phone ? ` · ${raisedBy.phone}` : ""}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">📍 {alert.location}</p>
                    </div>
                    <span className="text-xs text-(muted)">
                      {new Date((alert as unknown as { createdAt: Date }).createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mb-4">{alert.description}</p>
                  <div className="flex gap-2">
                    <form method="POST" action={`/api/sos?id=${String(alert._id)}&action=escalate`}>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Confirm &amp; Escalate
                      </button>
                    </form>
                    <form method="POST" action={`/api/sos?id=${String(alert._id)}&action=resolve`}>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-(surface) border border-(border) text-(text) hover:bg-(bg) transition-colors"
                      >
                        Mark Resolved
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {escalated.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Already Escalated ({escalated.length})</h2>
          <div className="space-y-3">
            {escalated.map((alert) => {
              const raisedBy = alert.raisedBy as unknown as { name: string } | null;
              return (
                <div key={String(alert._id)} className="bg-(surface) border border-orange-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-(text)">{raisedBy?.name ?? "Unknown"} · <span className="text-(muted)">{alert.location}</span></p>
                      <p className="text-sm text-(muted) mt-1 line-clamp-2">{alert.description}</p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Escalated</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
