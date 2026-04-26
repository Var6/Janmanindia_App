import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import DailyReport from "@/models/DailyReport";
import "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  submitted: { bg: "var(--info-bg)",      text: "var(--info-text)" },
  reviewed:  { bg: "var(--success-bg)",   text: "var(--success-text)" },
};

export default async function HrDailyReportsPage() {
  const session = await getSessionFromCookies();
  if (!session || !["hr", "director", "superadmin"].includes(session.role)) redirect("/login");

  const dbOk = await tryConnectDB();
  const reports = dbOk
    ? await DailyReport.find({ status: { $in: ["submitted", "reviewed"] } })
        .sort({ reportDate: -1 })
        .limit(100)
        .populate("preparedBy", "name email employeeId socialWorkerProfile")
        .populate("supervisor", "name")
        .lean()
    : [];

  const submitted = reports.filter(r => r.status === "submitted");
  const reviewed  = reports.filter(r => r.status === "reviewed");

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Daily Reports — Supervisor Review</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Read social workers' submitted end-of-day reports, add remarks, and mark them reviewed. Click a row to open the full report (printable / downloadable as PDF).
        </p>
      </div>

      <Section title="Awaiting review" rows={submitted as Lean[]} />
      <Section title="Recently reviewed" rows={reviewed as Lean[]} />
    </div>
  );
}

type Lean = {
  _id: unknown;
  reportDate: Date;
  status: "draft" | "submitted" | "reviewed";
  summary?: { totalCases?: number; urgentFlagged?: number; needSupervisorReview?: number };
  preparedBy?: { _id: unknown; name?: string; employeeId?: string; socialWorkerProfile?: { district?: string } } | null;
  supervisor?: { name?: string } | null;
  reviewedAt?: Date;
};

function Section({ title, rows }: { title: string; rows: Lean[] }) {
  if (rows.length === 0) {
    return (
      <section>
        <h2 className="font-semibold text-(--text) mb-3">{title} (0)</h2>
        <p className="text-sm text-(--muted) px-1">Nothing here.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="font-semibold text-(--text) mb-3">{title} ({rows.length})</h2>
      <div className="space-y-2">
        {rows.map(r => {
          const stat = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft;
          return (
            <Link key={String(r._id)} href={`/hr/daily-reports/${String(r._id)}`}
              className="block rounded-xl border p-4 transition-colors hover:border-(--accent)"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--text)">
                    {r.preparedBy?.name ?? "—"}{r.preparedBy?.employeeId ? ` · ${r.preparedBy.employeeId}` : ""}
                  </p>
                  <p className="text-xs text-(--muted) mt-0.5">
                    {new Date(r.reportDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {r.preparedBy?.socialWorkerProfile?.district && ` · ${r.preparedBy.socialWorkerProfile.district}`}
                    {" · "}{r.summary?.totalCases ?? 0} cases
                    {(r.summary?.urgentFlagged ?? 0) > 0 && ` · ${r.summary?.urgentFlagged} urgent`}
                    {(r.summary?.needSupervisorReview ?? 0) > 0 && ` · ${r.summary?.needSupervisorReview} for review`}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                  style={{ background: stat.bg, color: stat.text }}>{r.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
