import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import CreateCaseForm from "@/components/shared/CreateCaseForm";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "var(--info-bg)",    text: "var(--info-text)"    },
  Escalated: { bg: "var(--error-bg)",   text: "var(--error-text)"   },
  Pending:   { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  Closed:    { bg: "var(--bg-secondary)", text: "var(--muted)"      },
  Dismissed: { bg: "var(--error-bg)",   text: "var(--error-text)"   },
};

export default async function SWCasesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "socialworker") redirect("/login");

  const dbOk = await tryConnectDB();

  const cases = dbOk
    ? await Case.find({ socialWorker: session.id })
        .populate("citizen", "name email")
        .populate("litigationMember", "name")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  const pendingVerifications = dbOk
    ? await User.find({ role: "user", "citizenProfile.verificationStatus": "pending" })
        .select("name email citizenProfile")
        .lean()
    : [];

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Cases</h1>
          <p className="text-sm text-(--muted) mt-1">Assigned cases, ID verifications, and case creation.</p>
        </div>
        <CreateCaseForm />
      </div>

      {/* ID Verification Queue */}
      {pendingVerifications.length > 0 && (
        <section className="rounded-2xl overflow-hidden border"
          style={{ background: "var(--warning-bg)", borderColor: "color-mix(in srgb,var(--warning) 30%,transparent)" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "color-mix(in srgb,var(--warning) 25%,transparent)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--warning)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--warning-text)" }}>
              ID Verification Queue ({pendingVerifications.length})
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "color-mix(in srgb,var(--warning) 15%,transparent)" }}>
            {pendingVerifications.map((u) => (
              <div key={String(u._id)} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-(--text)">{u.name}</p>
                  <p className="text-xs text-(--muted)">{u.email} · {u.citizenProfile?.govtIdType}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form method="POST" action="/api/users/verify-id">
                    <input type="hidden" name="userId" value={String(u._id)} />
                    <input type="hidden" name="status" value="verified" />
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: "var(--success)", color: "#fff" }}>
                      Verify
                    </button>
                  </form>
                  <form method="POST" action="/api/users/verify-id">
                    <input type="hidden" name="userId" value={String(u._id)} />
                    <input type="hidden" name="status" value="rejected" />
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 30%,transparent)" }}>
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Cases */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">Assigned Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-2xl mb-2">📁</p>
            <p className="text-sm text-(--muted)">
              {dbOk ? "No cases assigned yet." : "Connect database to see cases."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => {
              const citizen = c.citizen as unknown as { name: string; email: string } | null;
              const lawyer  = c.litigationMember as unknown as { name: string } | null;
              const st      = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
              return (
                <Link key={String(c._id)} href={`/socialworker/cases/${c._id}`}
                  className="block rounded-2xl border p-5 transition-all"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-xs)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
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
                        {citizen && <>Citizen: <span className="font-medium">{citizen.name}</span></>}
                        {lawyer  && <> · Lawyer: {lawyer.name}</>}
                        {!lawyer && <> · <span style={{ color: "var(--warning-text)" }}>Lawyer unassigned</span></>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.text }}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {c.nextHearingDate && (
                      <p className="text-xs text-(--muted)">
                        Next hearing: {new Date(c.nextHearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-(--muted) ml-auto">
                      <path d="M6 4l4 4-4 4"/>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
