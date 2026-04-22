import { redirect } from "next/navigation";
import Link from "next/link";
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

  const dbOk  = await tryConnectDB();
  const cases = dbOk
    ? await Case.find({})
        .populate("citizen", "name")
        .populate("litigationMember", "name")
        .populate("socialWorker", "name")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean()
    : [];

  const byStatus = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">All Cases</h1>
        <p className="text-sm text-(--muted) mt-1">{cases.length} total cases across all litigation members.</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["Open", "Pending", "Escalated", "Closed", "Dismissed"].map((s) => {
          const sc = STAT_COLORS[s];
          return (
            <div key={s} className="p-3.5 rounded-2xl border text-center"
              style={{ background: sc.card, borderColor: `color-mix(in srgb,${sc.num} 20%,transparent)` }}>
              <p className="text-2xl font-bold" style={{ color: sc.num }}>{byStatus[s] ?? 0}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: sc.label }}>{s}</p>
            </div>
          );
        })}
      </div>

      {cases.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-sm text-(--muted)">{dbOk ? "No cases in the system yet." : "Connect database."}</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b text-xs font-semibold text-(--muted) uppercase tracking-wide"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <span>Case</span>
            <span className="px-3 text-center">Type</span>
            <span className="px-3 text-center">Lawyer</span>
            <span className="px-3 text-center">Status</span>
            <span className="px-3 text-center">Actions</span>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {cases.map((c) => {
              const citizen = c.citizen as unknown as { name: string } | null;
              const lawyer  = c.litigationMember as unknown as { name: string } | null;
              const st      = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
              return (
                <div key={String(c._id)}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-3 transition-colors hover:bg-(--bg)">

                  {/* Case title + number + citizen */}
                  <Link href={`/director/cases/${String(c._id)}`} className="min-w-0 group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)" }}>
                        {c.caseNumber ?? "—"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-(--text) truncate group-hover:text-(--accent) transition-colors">
                      {c.caseTitle}
                    </p>
                    <p className="text-xs text-(--muted)">{citizen?.name ?? "—"}</p>
                  </Link>

                  <span className="px-3 text-xs text-(--muted)">{c.path === "criminal" ? "Criminal" : "HC"}</span>
                  <span className="px-3 text-xs text-(--text)">{lawyer?.name ?? <span className="text-(--muted) italic">Unassigned</span>}</span>

                  <span className="mx-3 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.text }}>
                    {c.status}
                  </span>

                  <div className="flex items-center gap-1 pl-3">
                    <Link href={`/director/cases/${String(c._id)}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 8%,transparent)" }}>
                      View
                    </Link>
                    <Link href={`/director/assign?caseId=${String(c._id)}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: "var(--muted)", background: "var(--bg-secondary)" }}>
                      Reassign
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
