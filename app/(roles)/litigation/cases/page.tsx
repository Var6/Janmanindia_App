import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";
import CreateLitigationCaseForm from "@/components/shared/CreateLitigationCaseForm";
import { getServerT, getServerLang } from "@/lib/i18n-server";
import { translateTitles } from "@/lib/translate-batch-server";

const STATUS_STYLE_LIT: Record<string, { background: string; color: string }> = {
  Open:       { background: "var(--info-bg)",      color: "var(--info-text)"    },
  Closed:     { background: "var(--bg-secondary)", color: "var(--muted)"        },
  Escalated:  { background: "var(--error-bg)",     color: "var(--error-text)"   },
  Pending:    { background: "var(--warning-bg)",   color: "var(--warning-text)" },
  Dismissed:  { background: "var(--error-bg)",     color: "var(--error-text)"   },
  Disposal:   { background: "var(--success-bg)",   color: "var(--success-text)" },
  Withdrawn:  { background: "var(--bg-secondary)", color: "var(--muted)"        },
};

export default async function LitigationCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "litigation" && session.role !== "superadmin")) redirect("/login");

  const t = await getServerT();
  const dbOk = await tryConnectDB();
  // Litigation sees cases where they are the lead OR a shared member —
  // supports the multi-lawyer flow. Director / administrator / superadmin
  // see every case via /director/cases.
  const cases = dbOk && mongoose.Types.ObjectId.isValid(session.id)
    ? await Case.find({
        $or: [
          { litigationMember:  new mongoose.Types.ObjectId(session.id) },
          { litigationMembers: new mongoose.Types.ObjectId(session.id) },
          { createdBy:         new mongoose.Types.ObjectId(session.id) },
        ],
      })
        .populate("community", "name phone")
        .populate("socialWorker", "name")
        .sort({ nextHearingDate: 1, updatedAt: -1 })
        .lean()
    : [];

  // "Closed" group covers any final state — legacy Closed/Dismissed plus the
  // new vocabulary (Disposal, Withdrawn). Everything else is treated as open.
  const FINAL_STATES = new Set(["Closed", "Dismissed", "Disposal", "Withdrawn"]);
  const open   = cases.filter((c) => !FINAL_STATES.has(c.status));
  const closed = cases.filter((c) =>  FINAL_STATES.has(c.status));

  // Batch-translate case titles once (server-side, cached) so list rows show
  // in the active language without per-row API calls.
  const tt = await translateTitles(cases.map((c) => c.caseTitle), await getServerLang());

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">{t("My Cases")}</h1>
          <p className="text-sm text-(--muted) mt-1">
            {open.length} {t("active")} · {closed.length} {t("closed")} · {t("sorted by next hearing date")}
          </p>
        </div>
        <CreateLitigationCaseForm />
      </div>

      <section>
        <h2 className="font-semibold text-(--text) mb-3">{t("Active Cases")}</h2>
        {open.length === 0 ? (
          <div className="py-16 text-center bg-(--surface) rounded-2xl border border-(--border)">
            <p className="text-sm text-(--muted)">{dbOk ? t("No active cases assigned.") : t("Connect database.")}</p>
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
                        <span className="text-xs text-(--muted)">
                          {c.courtType === "district"  ? (c.courtName ?? t("Civil / District Court"))
                          : c.courtType === "supreme"  ? t("Supreme Court")
                          : c.courtType === "other"    ? (c.courtName ?? t("Tribunal / Forum"))
                          : c.path === "criminal"      ? t("Criminal")
                          : c.courtName               ?? t("High Court")}
                        </span>
                      </div>
                      <p className="font-semibold text-(--text) truncate">{tt(c.caseTitle)}</p>
                      <p className="text-xs text-(--muted) mt-0.5">
                        {t("Community")}: {community?.name ?? "—"} · {t("SW")}: {sw?.name ?? "—"}
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
                        {t("Next hearing")}: {hearingDate.toLocaleDateString("en-IN")}
                        {daysToHearing !== null && daysToHearing >= 0 && ` (${daysToHearing}d)`}
                      </span>
                    ) : (
                      <span className="text-(--muted)">{t("No hearing date set")}</span>
                    )}
                    <span className="text-(--muted)">{c.documents?.length ?? 0} {t("doc(s)")}</span>
                    <span className="text-(--muted)">{c.caseDiary?.length ?? 0} {t("diary entries")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">{t("Closed / Dismissed")}</h2>
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
                  <p className="text-sm text-(--muted) truncate flex-1">{tt(c.caseTitle)}</p>
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
