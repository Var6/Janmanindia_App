import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import CreateCaseForm from "@/components/shared/CreateCaseForm";
import DirectorCasesTable, { type CaseRow } from "@/components/director/DirectorCasesTable";
import { getServerT, getServerLang } from "@/lib/i18n-server";
import { translateTitles } from "@/lib/translate-batch-server";

const STAT_COLORS: Record<string, { card: string; num: string; label: string }> = {
  Open:      { card: "var(--info-bg)",      num: "var(--info-text)",    label: "var(--info-text)"    },
  Pending:   { card: "var(--warning-bg)",   num: "var(--warning-text)", label: "var(--warning-text)" },
  Escalated: { card: "var(--error-bg)",     num: "var(--error-text)",   label: "var(--error-text)"   },
  Closed:    { card: "var(--bg-secondary)", num: "var(--muted)",        label: "var(--muted)"        },
  Dismissed: { card: "var(--error-bg)",     num: "var(--error-text)",   label: "var(--error-text)"   },
};

export default async function AdminCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  const t = await getServerT();
  const dbOk  = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({})
        .populate("community", "name")
        .populate("litigationMember", "name")
        .populate("socialWorker", "name")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  // Active advocates (litigation members) for inline assignment in the table.
  const advocateDocs = dbOk
    ? await User.find({ role: "litigation", isActive: true }).select("name").sort({ name: 1 }).lean()
    : [];
  const advocates = advocateDocs.map((a) => ({ id: String(a._id), name: a.name }));

  const byStatus = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  // Batch-translate titles + the "current step" note once (server-side, cached).
  const tt = await translateTitles(
    cases.flatMap((c) => [c.caseTitle, c.currentStep]),
    await getServerLang(),
  );

  // Serialize to plain rows for the interactive client table (filters / sort /
  // export). "Place filed" = the district (fall back to state / court).
  const rows: CaseRow[] = cases.map((c) => ({
    id: String(c._id),
    caseNumber: c.caseNumber ?? "",
    courtNumber: c.courtCaseNumber ?? "",
    title: tt(c.caseTitle),
    currentStep: c.currentStep ? tt(c.currentStep) : undefined,
    path: c.path,
    status: c.status,
    // Place filed = the Janman district, falling back to the state. Do NOT fall
    // back to courtName — that leaked High Court names ("Patna High Court") into
    // the District filter. The court has its own filter (`court`, below).
    district: c.district || c.state || "—",
    court: c.courtName || "",
    community: (c.community as unknown as { name?: string } | null)?.name ?? "",
    lawyer: (c.litigationMember as unknown as { name?: string } | null)?.name ?? "",
    isExisting: !!c.isExistingCase,
    nextHearingISO: c.nextHearingDate ? new Date(c.nextHearingDate).toISOString() : undefined,
    lastHearingISO: (() => {
      const ts = (c.courtAppearances ?? [])
        .map((a) => (a?.date ? new Date(a.date).getTime() : 0))
        .filter((n) => n > 0);
      return ts.length ? new Date(Math.max(...ts)).toISOString() : undefined;
    })(),
  }));

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">{t("All Cases")}</h1>
          <p className="text-sm text-(--muted) mt-1">{cases.length} {t("total cases across all litigation members.")}</p>
        </div>
        <CreateCaseForm />
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["Open", "Pending", "Escalated", "Closed", "Dismissed"].map((s) => {
          const sc = STAT_COLORS[s];
          return (
            <div key={s} className="p-3.5 rounded-2xl border text-center"
              style={{ background: sc.card, borderColor: `color-mix(in srgb,${sc.num} 20%,transparent)` }}>
              <p className="text-2xl font-bold" style={{ color: sc.num }}>{byStatus[s] ?? 0}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: sc.label }}>{t(s)}</p>
            </div>
          );
        })}
      </div>

      {cases.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-sm text-(--muted)">{dbOk ? t("No cases in the system yet.") : t("Connect database.")}</p>
        </div>
      ) : (
        <DirectorCasesTable cases={rows} advocates={advocates} />
      )}
    </div>
  );
}
