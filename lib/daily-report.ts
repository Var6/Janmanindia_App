import mongoose from "mongoose";
import User from "@/models/User";
import StaffDailyReport from "@/models/StaffDailyReport";
import Notification from "@/models/Notification";

/* ── Shared constants ──────────────────────────────────────────────────────
 * Who reviews everyone's reports (the "director and above" group the user
 * defined: director, superadmin, administrator, HR). */
export const REPORT_VIEWER_ROLES = ["director", "superadmin", "administrator", "hr"];
/** Who gets the 3-consecutive-days-missed escalation. */
export const ESCALATION_ROLES = ["director", "superadmin", "administrator"];
/** Everyone who must file a daily report. */
export const REPORTING_ROLES = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

/* ── IST date helpers ──────────────────────────────────────────────────────
 * The whole org works on Indian time; a report belongs to the IST calendar
 * day it was written on, regardless of the server's timezone. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

/** "YYYY-MM-DD" for the IST calendar day of the given instant (default now). */
export function istDateKey(at: Date = new Date()): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** IST hour-of-day (0-23) for the given instant. */
export function istHour(at: Date = new Date()): number {
  return new Date(at.getTime() + IST_OFFSET_MS).getUTCHours();
}

/** dateKey shifted by n days (n may be negative). */
export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Rich-text sanitiser ───────────────────────────────────────────────────
 * The editor produces contentEditable HTML. Keep formatting tags only, strip
 * every attribute, and drop script/style/iframe subtrees entirely so nothing
 * executable or trackable is ever stored or rendered. */
const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
]);

export function sanitizeReportHtml(input: string): string {
  let html = String(input ?? "");
  // Remove dangerous subtrees wholesale (content included).
  html = html.replace(/<(script|style|iframe|object|embed|link|meta|form|svg|math)\b[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");
  // Rewrite every remaining tag: drop attributes; unwrap disallowed tags.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (m, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const closing = m.startsWith("</");
    if (closing) return `</${tag}>`;
    const selfClose = tag === "br" || tag === "hr" ? " /" : "";
    return `<${tag}${selfClose}>`;
  });
  // Neutralise any leftover event-handler-looking text fragments.
  html = html.replace(/javascript:/gi, "");
  return html.trim().slice(0, 100_000);
}

/** Plain-text preview (first ~300 chars) for lists and notifications. */
export function htmlToPreview(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/* ── Reminder engine ───────────────────────────────────────────────────────
 * runDailyReportReminders() is safe to call repeatedly (notifications are
 * deduped per person per day). Two triggers call it:
 *  - the Vercel cron at 18:00 IST (authoritative), and
 *  - an opportunistic hook in GET /api/notifications after 6pm IST, so the
 *    system still works on deployments without cron configured. */
export async function runDailyReportReminders(): Promise<{ due: number; escalations: number }> {
  const today = istDateKey();
  let dueCreated = 0;
  let escalationsCreated = 0;

  const staff = await User.find({ role: { $in: REPORTING_ROLES }, isActive: true })
    .select("name role createdAt")
    .lean<{ _id: mongoose.Types.ObjectId; name: string; role: string; createdAt?: Date }[]>();
  if (staff.length === 0) return { due: 0, escalations: 0 };

  const staffIds = staff.map((u) => u._id);

  // One query covers today (due-reminder) + the 3-day escalation window.
  const windowKeys = [today, shiftDateKey(today, -1), shiftDateKey(today, -2), shiftDateKey(today, -3)];
  const reports = await StaffDailyReport.find({ author: { $in: staffIds }, dateKey: { $in: windowKeys } })
    .select("author dateKey")
    .lean();
  const submitted = new Set(reports.map((r) => `${String(r.author)}:${r.dateKey}`));

  // ── 6pm "your report is due" reminders ─────────────────────────────────
  const missingToday = staff.filter((u) => !submitted.has(`${String(u._id)}:${today}`));
  if (missingToday.length > 0) {
    // Dedupe: skip anyone already reminded for this dateKey.
    const already = await Notification.find({
      type: "daily_report_due",
      "meta.date": today,
      recipient: { $in: missingToday.map((u) => u._id) },
    }).select("recipient").lean();
    const alreadySet = new Set(already.map((n) => String(n.recipient)));
    const docs = missingToday
      .filter((u) => !alreadySet.has(String(u._id)))
      .map((u) => ({
        recipient: u._id,
        type: "daily_report_due",
        title: "📝 Your daily report is due",
        body: "Take two minutes to write today's report before you sign off.",
        link: "/reports/daily",
        meta: { date: today },
        read: false,
      }));
    if (docs.length > 0) {
      await Notification.insertMany(docs);
      dueCreated = docs.length;
    }
  }

  // ── 3 consecutive missed days → escalate to directors ──────────────────
  const misses = (u: { _id: mongoose.Types.ObjectId }) =>
    [1, 2, 3].every((n) => !submitted.has(`${String(u._id)}:${shiftDateKey(today, -n)}`));
  // Only flag people who existed for the whole window (new joiners exempt).
  const cutoff = new Date(`${shiftDateKey(today, -3)}T00:00:00Z`);
  const defaulters = staff.filter((u) => u.createdAt && new Date(u.createdAt) < cutoff && misses(u as never));

  if (defaulters.length > 0) {
    const directors = await User.find({ role: { $in: ESCALATION_ROLES }, isActive: true })
      .select("_id")
      .lean();
    for (const d of defaulters) {
      // Directors themselves can be defaulters — never self-notify only; the
      // rest of the director group still hears about it.
      const recipients = directors.filter((dir) => String(dir._id) !== String(d._id));
      if (recipients.length === 0) continue;
      const exists = await Notification.findOne({
        type: "daily_report_missing",
        "meta.userId": String(d._id),
        "meta.upTo": shiftDateKey(today, -1),
      }).select("_id").lean();
      if (exists) continue;
      await Notification.insertMany(
        recipients.map((r) => ({
          recipient: r._id,
          type: "daily_report_missing",
          title: `⚠️ ${d.name} — no daily report for 3 days`,
          body: `${d.name} (${d.role}) hasn't submitted a daily report for 3 consecutive days. Please follow up.`,
          link: "/reports/daily/review",
          meta: { userId: String(d._id), upTo: shiftDateKey(today, -1) },
          read: false,
        }))
      );
      escalationsCreated += recipients.length;
    }
  }

  return { due: dueCreated, escalations: escalationsCreated };
}
