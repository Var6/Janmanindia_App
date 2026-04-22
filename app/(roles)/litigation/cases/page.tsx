import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function LitigationCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({ litigationMember: session.id })
        .populate("citizen", "name phone")
        .populate("socialWorker", "name")
        .sort({ nextHearingDate: 1, updatedAt: -1 })
        .lean()
    : [];

  const open = cases.filter((c) => c.status !== "Closed" && c.status !== "Dismissed");
  const closed = cases.filter((c) => c.status === "Closed" || c.status === "Dismissed");

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(text)">My Cases</h1>
        <p className="text-sm text-(muted) mt-1">
          {open.length} active · {closed.length} closed · sorted by next hearing date
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-(text) mb-3">Active Cases</h2>
        {open.length === 0 ? (
          <div className="py-16 text-center bg-(surface) rounded-2xl border border-(border)">
            <p className="text-sm text-(muted)">{dbOk ? "No active cases assigned." : "Connect database."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((c) => {
              const citizen = c.citizen as unknown as { name: string; phone?: string } | null;
              const sw = c.socialWorker as unknown as { name: string } | null;
              const hearingDate = c.nextHearingDate ? new Date(c.nextHearingDate) : null;
              const daysToHearing = hearingDate
                ? Math.ceil((hearingDate.getTime() - Date.now()) / 86400000)
                : null;
              return (
                <Link
                  key={String(c._id)}
                  href={`/litigation/cases/${String(c._id)}`}
                  className="block bg-(surface) rounded-2xl border border-(border) p-5 hover:border-(accent) transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-(text) truncate">{c.caseTitle}</p>
                      <p className="text-xs text-(muted) mt-0.5">
                        {c.path === "criminal" ? "Criminal" : "High Court"} · Citizen: {citizen?.name ?? "—"} · SW: {sw?.name ?? "—"}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {hearingDate ? (
                      <span className={`font-medium ${daysToHearing !== null && daysToHearing <= 3 ? "text-red-600" : "text-(muted)"}`}>
                        Next hearing: {hearingDate.toLocaleDateString("en-IN")}
                        {daysToHearing !== null && daysToHearing >= 0 && ` (${daysToHearing}d)`}
                      </span>
                    ) : (
                      <span className="text-(muted)">No hearing date set</span>
                    )}
                    <span className="text-(muted)">{c.documents?.length ?? 0} doc(s)</span>
                    <span className="text-(muted)">{c.caseDiary?.length ?? 0} diary entries</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="font-semibold text-(text) mb-3">Closed / Dismissed</h2>
          <div className="space-y-2">
            {closed.map((c) => (
              <Link
                key={String(c._id)}
                href={`/litigation/cases/${String(c._id)}`}
                className="flex items-center justify-between px-5 py-3 bg-(surface) rounded-xl border border-(border) hover:border-(accent) transition-colors"
              >
                <p className="text-sm text-(muted) truncate">{c.caseTitle}</p>
                <span className={`shrink-0 ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
