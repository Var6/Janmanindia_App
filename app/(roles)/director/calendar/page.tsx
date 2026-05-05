import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Activity from "@/models/Activity";
import Appointment from "@/models/Appointment";
import TrainingSession from "@/models/TrainingSession";
import Case from "@/models/Case";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";

const ROLE_LABELS: Record<string, string> = {
  socialworker: "Social Worker", litigation: "Litigation", hr: "HR",
  finance: "Finance", administrator: "Administrator", director: "Director",
  superadmin: "Superadmin", community: "Community",
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  planned:     { bg: "var(--info-bg)",      text: "var(--info-text)"    },
  in_progress: { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  done:        { bg: "var(--success-bg)",   text: "var(--success-text)" },
  cancelled:   { bg: "var(--bg-secondary)", text: "var(--muted)"        },
};

const PRIORITY_DOT: Record<string, string> = {
  low:    "var(--muted)",
  medium: "var(--info)",
  high:   "var(--error)",
};

type StaffLite = { _id: string; name: string; role: string };

interface PopulatedActivity {
  _id: mongoose.Types.ObjectId;
  title: string;
  status: "planned" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high";
  category: string;
  dueDate?: Date;
  endsAt?: Date;
  completedAt?: Date;
  assignee: StaffLite | null;
  coAssignees: StaffLite[];
  createdBy: StaffLite | null;
}

interface PopulatedAppointment {
  _id: mongoose.Types.ObjectId;
  reason: string;
  proposedDate: Date;
  status: string;
  requester: StaffLite | null;
  requestee: StaffLite | null;
  coAttendees: StaffLite[];
  socialWorker: StaffLite | null;
  litigationMember: StaffLite | null;
  community: StaffLite | null;
}

interface CaseLite {
  _id: mongoose.Types.ObjectId;
  caseTitle: string;
  caseNumber?: string;
  nextHearingDate: Date;
  courtName?: string;
  status: string;
  litigationMember?: { _id: mongoose.Types.ObjectId; name: string } | null;
}

interface PopulatedTrainingSession {
  _id: mongoose.Types.ObjectId;
  title: string;
  venue: string;
  district?: string;
  date: Date;
  endDate?: Date;
  capacity: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  conductedBy: StaffLite | null;
  enrollments: { user: mongoose.Types.ObjectId | StaffLite }[];
}

const TRAINING_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "var(--info-bg)",      text: "var(--info-text)"    },
  ongoing:   { bg: "var(--warning-bg)",   text: "var(--warning-text)" },
  completed: { bg: "var(--success-bg)",   text: "var(--success-text)" },
  cancelled: { bg: "var(--bg-secondary)", text: "var(--muted)"        },
};

function dayKey(d: Date): string {
  // Stable YYYY-MM-DD key in local time (so a 9pm task doesn't roll into tomorrow).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(d: Date): string {
  // Treat midnight UTC as a date-only sentinel (matches activity-calendar-sync).
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return "All day";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default async function DirectorCalendarPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "director" && session.role !== "superadmin")) redirect("/login");

  const dbOk = await tryConnectDB();

  // Window: 7 days back → 30 days forward.
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setDate(end.getDate() + 30);   end.setHours(23, 59, 59, 999);

  const [activitiesRaw, appointmentsRaw, trainingsRaw, casesRaw, staff] = dbOk ? await Promise.all([
    Activity.find({ dueDate: { $gte: start, $lte: end } })
      .sort({ dueDate: 1 })
      .populate("assignee",    "name role")
      .populate("coAssignees", "name role")
      .populate("createdBy",   "name role")
      .lean<PopulatedActivity[]>(),
    Appointment.find({
      proposedDate: { $gte: start, $lte: end },
      status: { $in: ["confirmed", "confirmed_litigation", "approved_sw", "pending", "pending_sw"] },
    })
      .sort({ proposedDate: 1 })
      .populate("requester",        "name role")
      .populate("requestee",        "name role")
      .populate("coAttendees",      "name role")
      .populate("socialWorker",     "name role")
      .populate("litigationMember", "name role")
      .populate("community",        "name role")
      .lean<PopulatedAppointment[]>(),
    TrainingSession.find({
      date: { $gte: start, $lte: end },
      status: { $in: ["scheduled", "ongoing", "completed"] },
    })
      .sort({ date: 1 })
      .populate("conductedBy", "name role")
      .lean<PopulatedTrainingSession[]>(),
    Case.find({
      nextHearingDate: { $gte: start, $lte: end },
      status: { $nin: ["Closed", "Dismissed", "Disposal", "Withdrawn"] },
    })
      .sort({ nextHearingDate: 1 })
      .select("caseTitle caseNumber nextHearingDate courtName status litigationMember")
      .populate("litigationMember", "name")
      .lean<CaseLite[]>(),
    User.find({ isActive: true, role: { $nin: ["community", "pending"] } })
      .select("name role")
      .sort({ name: 1 })
      .lean<StaffLite[]>(),
  ]) : [[], [], [], [], []];

  // Per-staff load summary.
  const loadByUser = new Map<string, { planned: number; in_progress: number; done: number; overdue: number; upcoming: number }>();
  for (const u of staff) loadByUser.set(String(u._id), { planned: 0, in_progress: 0, done: 0, overdue: 0, upcoming: 0 });

  for (const a of activitiesRaw) {
    const assignees = [a.assignee, ...(a.coAssignees ?? [])].filter(Boolean) as StaffLite[];
    for (const u of assignees) {
      const key = String(u._id);
      if (!loadByUser.has(key)) loadByUser.set(key, { planned: 0, in_progress: 0, done: 0, overdue: 0, upcoming: 0 });
      const load = loadByUser.get(key)!;
      if (a.status === "planned")     load.planned++;
      if (a.status === "in_progress") load.in_progress++;
      if (a.status === "done")        load.done++;
      if (a.dueDate && a.status !== "done" && a.status !== "cancelled" && new Date(a.dueDate) < now) load.overdue++;
      if (a.dueDate && a.status !== "done" && a.status !== "cancelled" && new Date(a.dueDate) >= now) load.upcoming++;
    }
  }

  // Group activities, appointments, training sessions, and case hearings by day key.
  type DayItem =
    | { kind: "activity";    at: Date; activity: PopulatedActivity }
    | { kind: "appointment"; at: Date; appt: PopulatedAppointment }
    | { kind: "training";    at: Date; training: PopulatedTrainingSession }
    | { kind: "hearing";     at: Date; caseItem: CaseLite };
  const byDay = new Map<string, DayItem[]>();

  for (const a of activitiesRaw) {
    if (!a.dueDate) continue;
    const at = new Date(a.dueDate);
    const k = dayKey(at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push({ kind: "activity", at, activity: a });
  }
  for (const ap of appointmentsRaw) {
    const at = new Date(ap.proposedDate);
    const k = dayKey(at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push({ kind: "appointment", at, appt: ap });
  }
  for (const t of trainingsRaw) {
    const at = new Date(t.date);
    const k = dayKey(at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push({ kind: "training", at, training: t });
  }
  for (const c of casesRaw) {
    const at = new Date(c.nextHearingDate);
    const k = dayKey(at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push({ kind: "hearing", at, caseItem: c });
  }
  for (const items of byDay.values()) items.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Build the day list — every day in the window, even if empty, so blank days
  // show up as gaps (helpful for spotting capacity).
  const days: { date: Date; key: string; items: DayItem[] }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d);
    days.push({ date: new Date(d), key: k, items: byDay.get(k) ?? [] });
  }

  const todayKey = dayKey(now);
  const totalActivities = activitiesRaw.length;
  const totalAppts = appointmentsRaw.length;
  const totalTrainings = trainingsRaw.length;
  const totalHearings = casesRaw.length;

  // Sort staff by busiest first (sum of planned + in_progress).
  const staffSorted = [...staff].sort((a, b) => {
    const la = loadByUser.get(String(a._id)) ?? { planned: 0, in_progress: 0, done: 0, overdue: 0, upcoming: 0 };
    const lb = loadByUser.get(String(b._id)) ?? { planned: 0, in_progress: 0, done: 0, overdue: 0, upcoming: 0 };
    return (lb.planned + lb.in_progress) - (la.planned + la.in_progress);
  });

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Team Calendar</h1>
          <p className="text-sm text-(--muted) mt-1">
            All staff activities, appointments, trainings and case hearings from {formatDate(start)} to {formatDate(end)} — {totalActivities} task{totalActivities === 1 ? "" : "s"} · {totalAppts} appointment{totalAppts === 1 ? "" : "s"} · {totalTrainings} training{totalTrainings === 1 ? "" : "s"} · {totalHearings} hearing{totalHearings === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/director/assign"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            Assign new task
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Agenda */}
        <section className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-(--text) text-sm">Agenda</h2>
            <span className="text-xs text-(--muted)">{days.length} days</span>
          </div>

          {days.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-(--muted)">Nothing scheduled.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {days.map(({ date, key, items }) => {
                const isToday = key === todayKey;
                const isPast  = key < todayKey;
                return (
                  <div key={key} className="grid grid-cols-[120px_1fr] gap-4 px-5 py-3"
                    style={{ background: isToday ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent" }}>
                    <div className="text-xs">
                      <p className="font-bold uppercase tracking-wide"
                        style={{ color: isToday ? "var(--accent)" : isPast ? "var(--muted)" : "var(--text)" }}>
                        {isToday ? "Today" : formatDate(date)}
                      </p>
                      {!isToday && <p className="text-(--muted) mt-0.5">{date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
                      <p className="text-(--muted) mt-1">{items.length === 0 ? "—" : `${items.length} item${items.length === 1 ? "" : "s"}`}</p>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      {items.length === 0 ? (
                        <p className="text-xs text-(--muted) italic py-1">Nothing scheduled.</p>
                      ) : (
                        items.map((it, i) => {
                          if (it.kind === "appointment") {
                            const ap = it.appt;
                            const a = ap.requester?.name ?? ap.community?.name ?? "—";
                            const b = ap.requestee?.name ?? ap.litigationMember?.name ?? ap.socialWorker?.name ?? "—";
                            return (
                              <div key={`ap-${i}-${String(ap._id)}`} className="rounded-lg border px-3 py-2 text-xs"
                                style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                                    style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                                    Appointment
                                  </span>
                                  <span className="text-[10px] text-(--muted)">{formatTime(it.at)}</span>
                                  <span className="text-[10px] uppercase font-semibold"
                                    style={{ color: ap.status.startsWith("confirmed") ? "var(--success-text)" : "var(--warning-text)" }}>
                                    {ap.status.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="font-medium text-(--text) truncate">{ap.reason}</p>
                                <p className="text-(--muted) mt-0.5">
                                  {a} ↔ {b}
                                  {ap.coAttendees && ap.coAttendees.length > 0
                                    ? ` + ${ap.coAttendees.length} more`
                                    : ""}
                                </p>
                              </div>
                            );
                          }
                          if (it.kind === "training") {
                            const t = it.training;
                            const ts = TRAINING_STATUS_STYLE[t.status];
                            const enrolled = t.enrollments?.length ?? 0;
                            return (
                              <div key={`tr-${i}-${String(t._id)}`} className="rounded-lg border px-3 py-2 text-xs"
                                style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))", background: "var(--bg)" }}>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                                    Training
                                  </span>
                                  <span className="text-[10px] text-(--muted)">{formatTime(it.at)}</span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                                    style={{ background: ts.bg, color: ts.text }}>
                                    {t.status}
                                  </span>
                                  <span className="text-[10px] text-(--muted)">{enrolled}/{t.capacity} enrolled</span>
                                </div>
                                <p className="font-medium text-(--text) truncate">{t.title}</p>
                                <p className="text-(--muted) mt-0.5 truncate">
                                  {t.venue}{t.district ? ` · ${t.district}` : ""}
                                  {t.conductedBy?.name ? ` · led by ${t.conductedBy.name}` : ""}
                                </p>
                              </div>
                            );
                          }
                          if (it.kind === "hearing") {
                            const c = it.caseItem;
                            return (
                              <Link key={`hr-${i}-${String(c._id)}`} href={`/director/cases/${String(c._id)}`}
                                className="rounded-lg border px-3 py-2 text-xs block transition-colors hover:border-(--accent)"
                                style={{ borderColor: "color-mix(in srgb, var(--error) 35%, var(--border))", background: "var(--bg)" }}>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                                    Court Hearing
                                  </span>
                                  <span className="text-[10px] text-(--muted)">{formatTime(it.at)}</span>
                                  <span className="text-[10px] font-semibold uppercase"
                                    style={{ color: "var(--muted)" }}>{c.status}</span>
                                </div>
                                <p className="font-medium text-(--text) truncate">{c.caseTitle}</p>
                                <p className="text-(--muted) mt-0.5 truncate">
                                  {c.caseNumber ? `${c.caseNumber} · ` : ""}
                                  {c.courtName ?? "Court not specified"}
                                  {c.litigationMember?.name ? ` · ${c.litigationMember.name}` : ""}
                                </p>
                              </Link>
                            );
                          }
                          const a = it.activity;
                          const allNames = [a.assignee?.name, ...(a.coAssignees ?? []).map((c) => c.name)].filter(Boolean) as string[];
                          const st = STATUS_STYLE[a.status];
                          const overdue = a.dueDate && a.status !== "done" && a.status !== "cancelled" && new Date(a.dueDate) < now;
                          return (
                            <div key={`ac-${i}-${String(a._id)}`} className="rounded-lg border px-3 py-2 text-xs"
                              style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_DOT[a.priority] }} />
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ background: st.bg, color: st.text }}>
                                  {a.status.replace("_", " ")}
                                </span>
                                <span className="text-[10px] text-(--muted) capitalize">{a.category}</span>
                                <span className="text-[10px] text-(--muted)">
                                  {formatTime(it.at)}
                                  {a.endsAt
                                    ? ` – ${new Date(a.endsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                                    : ""}
                                </span>
                                {overdue && (
                                  <span className="text-[10px] uppercase font-bold"
                                    style={{ color: "var(--error-text)" }}>Overdue</span>
                                )}
                              </div>
                              <p className="font-medium text-(--text) truncate">{a.title}</p>
                              <p className="text-(--muted) mt-0.5 truncate">
                                {allNames.length > 0 ? allNames.join(", ") : "Unassigned"}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-staff load summary */}
        <aside className="rounded-2xl border overflow-hidden h-fit xl:sticky xl:top-22"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-(--text) text-sm">Team load</h2>
            <span className="text-xs text-(--muted)">{staffSorted.length} active</span>
          </div>
          {staffSorted.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-(--muted)">No active staff.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {staffSorted.map((u) => {
                const load = loadByUser.get(String(u._id)) ?? { planned: 0, in_progress: 0, done: 0, overdue: 0, upcoming: 0 };
                const active = load.planned + load.in_progress;
                return (
                  <li key={String(u._id)} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-(--text) truncate">{u.name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-(--muted) mt-0.5">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </p>
                      </div>
                      <span className="text-lg font-bold tabular-nums shrink-0"
                        style={{ color: active === 0 ? "var(--muted)" : "var(--text)" }}>
                        {active}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                      {load.in_progress > 0 && (
                        <span className="px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                          ▶ {load.in_progress} in progress
                        </span>
                      )}
                      {load.planned > 0 && (
                        <span className="px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                          📋 {load.planned} planned
                        </span>
                      )}
                      {load.overdue > 0 && (
                        <span className="px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                          ⚠ {load.overdue} overdue
                        </span>
                      )}
                      {load.done > 0 && (
                        <span className="px-1.5 py-0.5 rounded"
                          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
                          ✓ {load.done} done
                        </span>
                      )}
                      {active === 0 && load.done === 0 && load.overdue === 0 && (
                        <span className="text-(--muted) italic">No tasks in window</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
