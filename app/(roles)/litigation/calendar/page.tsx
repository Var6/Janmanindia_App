import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import NoDBBanner from "@/components/shared/NoDBBanner";

interface CaseLite {
  _id: mongoose.Types.ObjectId;
  caseTitle: string;
  caseNumber?: string;
  nextHearingDate?: Date;
  courtName?: string;
  courtType?: string;
  status: string;
  courtAppearances?: Array<{
    _id: mongoose.Types.ObjectId;
    date: Date;
    dailyOrderBrief: string;
    currentStatus?: string;
    nextHearingDate?: Date;
    remarks?: string;
    loggedAt?: Date;
  }>;
}

function dayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function LitigationCalendarPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "litigation" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  const now = new Date();
  const past = new Date(now); past.setDate(past.getDate() - 60); past.setHours(0, 0, 0, 0);
  const future = new Date(now); future.setDate(future.getDate() + 60); future.setHours(23, 59, 59, 999);

  const litigationId = dbOk && mongoose.Types.ObjectId.isValid(session.id)
    ? new mongoose.Types.ObjectId(session.id)
    : null;

  const memberFilter = litigationId
    ? { $or: [{ litigationMember: litigationId }, { litigationMembers: litigationId }] }
    : null;

  const cases: CaseLite[] = memberFilter
    ? await Case.find({
        ...memberFilter,
        $or: [
          { nextHearingDate: { $gte: past, $lte: future } },
          { "courtAppearances.date": { $gte: past, $lte: future } },
        ],
      })
        .select("caseTitle caseNumber nextHearingDate courtName courtType status courtAppearances")
        .lean<CaseLite[]>()
    : [];

  type DayItem =
    | { kind: "hearing"; caseId: string; caseTitle: string; caseNumber?: string; courtName?: string; courtType?: string; status: string; date: Date }
    | { kind: "diary";   caseId: string; caseTitle: string; caseNumber?: string; brief: string; currentStatus?: string; date: Date };

  const byDay = new Map<string, DayItem[]>();

  function addItem(k: string, item: DayItem) {
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(item);
  }

  for (const c of cases) {
    const caseId = String(c._id);
    if (c.nextHearingDate) {
      const d = new Date(c.nextHearingDate);
      if (d >= past && d <= future) {
        addItem(dayKey(d), {
          kind: "hearing", caseId, caseTitle: c.caseTitle, caseNumber: c.caseNumber,
          courtName: c.courtName, courtType: c.courtType, status: c.status, date: d,
        });
      }
    }
    for (const ap of c.courtAppearances ?? []) {
      const d = new Date(ap.date);
      if (d >= past && d <= future) {
        addItem(dayKey(d), {
          kind: "diary", caseId, caseTitle: c.caseTitle, caseNumber: c.caseNumber,
          brief: ap.dailyOrderBrief, currentStatus: ap.currentStatus, date: d,
        });
      }
    }
  }

  for (const items of byDay.values()) items.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build sorted day list only for days that have items.
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({ key, date: new Date(key + "T00:00:00"), items }));

  const todayKey = dayKey(now);

  const upcomingHearings = days.filter(d => d.key >= todayKey && d.items.some(i => i.kind === "hearing"));
  const pastItems = days.filter(d => d.key < todayKey);

  return (
    <div className="space-y-6 pb-16">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">My Case Calendar</h1>
          <p className="text-sm text-(--muted) mt-1">
            Upcoming hearings and logged diary entries across all your cases · ±60 days
          </p>
        </div>
        <Link href="/litigation/cases"
          className="px-3.5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          My Cases
        </Link>
      </div>

      {/* Upcoming hearings */}
      <section>
        <h2 className="font-semibold text-(--text) mb-3">
          Upcoming Court Dates
          <span className="ml-2 text-xs font-normal text-(--muted)">({upcomingHearings.length} day{upcomingHearings.length === 1 ? "" : "s"})</span>
        </h2>
        {upcomingHearings.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-(--border)"
            style={{ background: "var(--surface)" }}>
            <p className="text-sm text-(--muted)">{dbOk ? "No upcoming court dates in the next 60 days." : "Connect database."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingHearings.map(({ key, date, items }) => {
              const isToday = key === todayKey;
              return (
                <div key={key} className="rounded-2xl border overflow-hidden"
                  style={{
                    background: "var(--surface)",
                    borderColor: isToday ? "var(--accent)" : "var(--border)",
                  }}>
                  <div className="px-4 py-2.5 border-b flex items-center gap-3"
                    style={{ borderColor: isToday ? "var(--accent)" : "var(--border)", background: isToday ? "color-mix(in srgb,var(--accent) 8%,transparent)" : "transparent" }}>
                    <span className="text-sm font-bold" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>
                      {isToday ? "Today" : formatDate(date)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                        Today
                      </span>
                    )}
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {items.filter(i => i.kind === "hearing").map((it, idx) => {
                      const h = it as Extract<DayItem, { kind: "hearing" }>;
                      return (
                        <Link key={idx} href={`/litigation/cases/${h.caseId}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                          <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5"
                            style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                            Hearing
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-(--text) text-sm truncate">{h.caseTitle}</p>
                            <p className="text-xs text-(--muted) mt-0.5">
                              {h.caseNumber ? `${h.caseNumber} · ` : ""}
                              {h.courtName ?? (h.courtType === "supreme" ? "Supreme Court" : h.courtType === "district" ? "District Court" : "High Court")}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-(--muted)">{h.status}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past diary entries */}
      {pastItems.length > 0 && (
        <section>
          <h2 className="font-semibold text-(--text) mb-3">
            Past Diary / Appearances
            <span className="ml-2 text-xs font-normal text-(--muted)">({pastItems.length} day{pastItems.length === 1 ? "" : "s"})</span>
          </h2>
          <div className="space-y-3">
            {[...pastItems].reverse().map(({ key, date, items }) => (
              <div key={key} className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="px-4 py-2.5 border-b"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <span className="text-sm font-semibold text-(--muted)">{formatDate(date)}</span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {items.map((it, idx) => {
                    if (it.kind === "diary") {
                      const d = it as Extract<DayItem, { kind: "diary" }>;
                      return (
                        <Link key={idx} href={`/litigation/cases/${d.caseId}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                          <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5"
                            style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                            Diary
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-(--text) text-sm truncate">{d.caseTitle}</p>
                            <p className="text-xs text-(--muted) mt-0.5 line-clamp-2">{d.brief}</p>
                            {d.currentStatus && (
                              <p className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>{d.currentStatus}</p>
                            )}
                          </div>
                        </Link>
                      );
                    }
                    const h = it as Extract<DayItem, { kind: "hearing" }>;
                    return (
                      <Link key={idx} href={`/litigation/cases/${h.caseId}`}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                        <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                          Hearing
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-(--text) text-sm truncate">{h.caseTitle}</p>
                          <p className="text-xs text-(--muted) mt-0.5">{h.caseNumber}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {days.length === 0 && dbOk && (
        <div className="py-16 text-center rounded-2xl border border-(--border)"
          style={{ background: "var(--surface)" }}>
          <p className="text-sm text-(--muted)">No hearings or diary entries found in the ±60 day window.</p>
          <p className="text-xs text-(--muted) mt-1">Log court appearances inside a case to see them here.</p>
        </div>
      )}
    </div>
  );
}
