import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_STYLE_LIT: Record<string, { background: string; color: string }> = {
  Open:      { background: "var(--info-bg)",      color: "var(--info-text)"    },
  Closed:    { background: "var(--bg-secondary)", color: "var(--muted)"        },
  Escalated: { background: "var(--error-bg)",     color: "var(--error-text)"   },
  Pending:   { background: "var(--warning-bg)",   color: "var(--warning-text)" },
  Dismissed: { background: "var(--error-bg)",     color: "var(--error-text)"   },
};

export default async function LitigationCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk && mongoose.Types.ObjectId.isValid(session.id)
    ? await Case.find({ litigationMember: new mongoose.Types.ObjectId(session.id) })
        .populate("community", "name phone")
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
        <h1 className="text-2xl font-bold text-(--text)">My Cases</h1>
        <p className="text-sm text-(--muted) mt-1">
          {open.length} active · {closed.length} closed · sorted by next hearing date
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-(--text) mb-3">Active Cases</h2>
        {open.length === 0 ? (
          <div className="py-16 text-center bg-(--surface) rounded-2xl border border-(--border)">
            <p className="text-sm text-(--muted)">{dbOk ? "No active cases assigned." : "Connect database."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((c) => {
              const community = c.community as unknown as { name: string; phone?: string } | null;
              const sw = c.socialWorker as unknown as { name: string } | null;
              const hearingDate = c.nextHearingDate ? new Date(c.nextHearingDate) : null;
              const daysToHearing = hearingDate
                ? Math.ceil((hearingDate.getTime() - Date.now()) / 86400000)
                : null;
              return (
                <Link
                  key={String(c._id)}
                  href={`/litigation/cases/${String(c._id)}`}
                  className="block bg-(--surface) rounded-2xl border border-(--border) p-5 hover:border-(accent) transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {c.caseNumber && (
                          <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)" }}>
                            {c.caseNumber}
                          </span>
                        )}
                        <span className="text-xs text-(--muted)">{c.path === "criminal" ? "Criminal" : "High Court"}</span>
                      </div>
                      <p className="font-semibold text-(--text) truncate">{c.caseTitle}</p>
                      <p className="text-xs text-(--muted) mt-0.5">
                        Community: {community?.name ?? "—"} · SW: {sw?.name ?? "—"}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full`}
                      style={STATUS_STYLE_LIT[c.status] as React.CSSProperties ?? { background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {hearingDate ? (
                      <span className="font-medium"
                        style={{ color: daysToHearing !== null && daysToHearing <= 3 ? "var(--error-text)" : "var(--muted)" }}>
                        Next hearing: {hearingDate.toLocaleDateString("en-IN")}
                        {daysToHearing !== null && daysToHearing >= 0 && ` (${daysToHearing}d)`}
                      </span>
                    ) : (
                      <span className="text-(--muted)">No hearing date set</span>
                    )}
                    <span className="text-(--muted)">{c.documents?.length ?? 0} doc(s)</span>
                    <span className="text-(--muted)">{c.caseDiary?.length ?? 0} diary entries</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">Closed / Dismissed</h2>
          <div className="space-y-2">
            {closed.map((c) => {
              const cst = STATUS_STYLE_LIT[c.status] ?? STATUS_STYLE_LIT.Closed;
              return (
                <Link key={String(c._id)} href={`/litigation/cases/${String(c._id)}`}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl border border-(--border) hover:border-(--accent) transition-colors"
                  style={{ background: "var(--surface)" }}>
                  {c.caseNumber && (
                    <span className="text-xs font-mono shrink-0 px-1.5 py-0.5 rounded"
                      style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                      {c.caseNumber}
                    </span>
                  )}
                  <p className="text-sm text-(--muted) truncate flex-1">{c.caseTitle}</p>
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={cst}>
                    {c.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
