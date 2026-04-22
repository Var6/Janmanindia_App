import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "var(--info-bg)",      text: "var(--info-text)"    },
  Closed:    { bg: "var(--bg-secondary)", text: "var(--muted)"        },
  Escalated: { bg: "var(--error-bg)",     text: "var(--error-text)"   },
  Pending:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  Dismissed: { bg: "var(--error-bg)",     text: "var(--error-text)"   },
};

export default async function CaseTrackerPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "community") redirect("/login");

  const dbOk = await tryConnectDB();
  const cases = dbOk && mongoose.Types.ObjectId.isValid(session.id)
    ? await Case.find({ citizen: new mongoose.Types.ObjectId(session.id) }).sort({ updatedAt: -1 }).lean()
    : [];

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Case Tracker</h1>
          <p className="text-sm text-(--muted) mt-1">All your filed cases and their current status.</p>
        </div>
        <Link href="/community/file-case"
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          + New Case
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-3">⚖️</p>
          <p className="text-sm text-(--muted)">
            {dbOk ? "You haven't filed any cases yet." : "Connect database to see your cases."}
          </p>
          {dbOk && (
            <Link href="/community/file-case"
              className="mt-3 inline-block text-sm hover:underline" style={{ color: "var(--accent)" }}>
              File your first case →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const lastDiary  = c.caseDiary?.[c.caseDiary.length - 1];
            const docsCount  = c.documents?.length ?? 0;
            const st         = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
            return (
              <Link
                key={String(c._id)}
                href={`/community/case-tracker/${c._id}`}
                className="block rounded-2xl border p-5 transition-all hover:shadow-md group"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-xs)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
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
                    <p className="font-semibold text-(--text) truncate group-hover:text-(--accent) transition-colors">
                      {c.caseTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.text }}>{c.status}</span>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-(--muted)">
                      <path d="M6 4l4 4-4 4"/>
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-2.5 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                    <p className="text-[10px] text-(--muted) uppercase tracking-wide">Next Hearing</p>
                    <p className="text-sm font-semibold text-(--text) mt-0.5">
                      {c.nextHearingDate
                        ? new Date(c.nextHearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                    <p className="text-[10px] text-(--muted) uppercase tracking-wide">Documents</p>
                    <p className="text-sm font-semibold text-(--text) mt-0.5">{docsCount} file{docsCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                    <p className="text-[10px] text-(--muted) uppercase tracking-wide">Updated</p>
                    <p className="text-sm font-semibold text-(--text) mt-0.5">
                      {new Date((c as unknown as { updatedAt: Date }).updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>

                {lastDiary && (
                  <div className="p-3 rounded-xl border"
                    style={{ background: "color-mix(in srgb,var(--accent) 5%,transparent)", borderColor: "color-mix(in srgb,var(--accent) 20%,transparent)" }}>
                    <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-1">Latest diary entry</p>
                    <p className="text-sm text-(--text) line-clamp-2">{lastDiary.findings}</p>
                    <p className="text-xs text-(--muted) mt-1">
                      {new Date(lastDiary.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
