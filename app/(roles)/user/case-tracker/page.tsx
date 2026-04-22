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

export default async function CaseTrackerPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "user") redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({ citizen: session.id }).sort({ updatedAt: -1 }).lean()
    : [];

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(text)">Case Tracker</h1>
          <p className="text-sm text-(muted) mt-1">All your filed cases and their current status.</p>
        </div>
        <Link
          href="/user/file-case"
          className="px-4 py-2 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + New Case
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="py-20 text-center bg-(surface) rounded-2xl border border-(border)">
          <p className="text-(muted) text-sm">
            {dbOk ? "You haven't filed any cases yet." : "Connect database to see your cases."}
          </p>
          {dbOk && (
            <Link href="/user/file-case" className="mt-3 inline-block text-sm text-(accent) hover:underline">
              File your first case →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const lastDiary = c.caseDiary?.[c.caseDiary.length - 1];
            const docsCount = c.documents?.length ?? 0;
            return (
              <div key={String(c._id)} className="bg-(surface) rounded-2xl border border-(border) p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-(text) truncate">{c.caseTitle}</p>
                    <p className="text-xs text-(muted) mt-0.5">
                      {c.caseNumber ? `#${c.caseNumber} · ` : ""}{c.path === "criminal" ? "Criminal" : "High Court"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-(bg) border border-(border)">
                    <p className="text-xs text-(muted)">Next Hearing</p>
                    <p className="text-sm font-medium text-(text) mt-0.5">
                      {c.nextHearingDate
                        ? new Date(c.nextHearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-(bg) border border-(border)">
                    <p className="text-xs text-(muted)">Documents</p>
                    <p className="text-sm font-medium text-(text) mt-0.5">{docsCount} file{docsCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-(bg) border border-(border)">
                    <p className="text-xs text-(muted)">Last Updated</p>
                    <p className="text-sm font-medium text-(text) mt-0.5">
                      {new Date((c as unknown as { updatedAt: Date }).updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>

                {lastDiary && (
                  <div className="p-3 rounded-xl bg-(accent)/5 border border-(accent)/20">
                    <p className="text-xs text-(muted) mb-0.5">Latest case diary entry</p>
                    <p className="text-sm text-(text) line-clamp-2">{lastDiary.findings}</p>
                    <p className="text-xs text-(muted) mt-1">
                      {new Date(lastDiary.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
