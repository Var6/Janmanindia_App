import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import LogisticsTicket from "@/models/LogisticsTicket";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

export default async function OfficesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "administrator" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const [districts, headcountByDistrict] = dbOk ? await Promise.all([
    LogisticsTicket.aggregate<{ _id: string; total: number; open: number; fulfilled: number }>([
      { $match: { district: { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$district",
          total:     { $sum: 1 },
          open:      { $sum: { $cond: [{ $in: ["$status", ["open", "in_progress"]] }, 1, 0] } },
          fulfilled: { $sum: { $cond: [{ $eq: ["$status", "fulfilled"] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true, role: { $in: ["socialworker", "litigation"] }, "litigationProfile.location.district": { $ne: null } } },
      { $group: { _id: "$litigationProfile.location.district", count: { $sum: 1 } } },
    ]),
  ]) : [[], []];

  const headcountMap = Object.fromEntries(headcountByDistrict.map((h) => [h._id, h.count]));

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">District Offices</h1>
        <p className="text-sm text-(--muted) mt-1">
          Activity per district based on logistics tickets and active staff stationed there.
        </p>
      </div>

      {districts.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
          <p className="text-2xl mb-2">🗺️</p>
          <p className="text-sm text-(--muted)">No district data yet — district appears here once tickets are raised.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {districts.map((d) => (
            <article key={d._id} className="rounded-2xl border border-(--border) bg-(--surface) p-5">
              <h2 className="font-semibold text-(--text)">{d._id}</h2>
              <p className="text-xs text-(--muted) mt-1 mb-4">
                {headcountMap[d._id] ?? 0} active staff stationed
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-(--muted)">Open</p>
                  <p className="text-lg font-bold text-(--accent)">{d.open}</p>
                </div>
                <div>
                  <p className="text-xs text-(--muted)">Fulfilled</p>
                  <p className="text-lg font-bold text-(--text)" style={{ color: "var(--success, #16a34a)" }}>{d.fulfilled}</p>
                </div>
                <div>
                  <p className="text-xs text-(--muted)">Total</p>
                  <p className="text-lg font-bold text-(--text)">{d.total}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
