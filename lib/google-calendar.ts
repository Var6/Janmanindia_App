import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuthClient(): OAuth2Client {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Derive the redirect URI from the running app's URL so dev uses localhost
  // automatically. Fall back to the explicit env var only if NEXT_PUBLIC_APP_URL
  // isn't set — keeps prod-only deployments working without extra config.
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const redirectUri = base
    ? `${base}/api/auth/google/callback`
    : process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars not set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL)");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Build the consent URL — user clicks this to start the OAuth flow. */
export function getAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on subsequent connects
    scope: SCOPES,
    state,
    hd: "janmanindia.org", // workspace hint — only allow @janmanindia.org accounts
  });
}

/** Exchange the auth code from the callback for tokens + email. */
export async function exchangeCodeForTokens(code: string): Promise<{
  refreshToken: string;
  email: string;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh_token returned. User may have already consented — try /api/auth/google/disconnect first.");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw new Error("Could not read user email from Google");

  return { refreshToken: tokens.refresh_token, email: data.email };
}

/** Sign-in flow exchange — returns full user profile + tokens. The refresh
 *  token may be undefined on subsequent sign-ins (Google only issues it once
 *  per consent), in which case we keep the previously stored one. */
export async function exchangeCodeForProfile(code: string): Promise<{
  refreshToken?: string;
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw new Error("Could not read user email from Google");

  return {
    refreshToken: tokens.refresh_token ?? undefined,
    email: data.email,
    name: data.name ?? undefined,
    picture: data.picture ?? undefined,
    sub: data.id ?? undefined,
  };
}

/** Returns an authenticated Calendar API client for a user's refresh token. */
function calendarFor(refreshToken: string): calendar_v3.Calendar {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: client });
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmails?: string[];
  location?: string;
}

/** Create a Calendar event on the user's primary calendar.
 *  Returns the new eventId. */
export async function createEvent(refreshToken: string, ev: CalendarEventInput): Promise<string | null> {
  try {
    const cal = calendarFor(refreshToken);
    const res = await cal.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: ev.summary,
        description: ev.description,
        location: ev.location,
        start: { dateTime: ev.start.toISOString(), timeZone: "Asia/Kolkata" },
        end:   { dateTime: ev.end.toISOString(),   timeZone: "Asia/Kolkata" },
        attendees: ev.attendeeEmails?.map((email) => ({ email })),
        reminders: { useDefault: true },
      },
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("Google Calendar createEvent failed:", err);
    return null;
  }
}

export async function updateEvent(refreshToken: string, eventId: string, ev: Partial<CalendarEventInput>): Promise<boolean> {
  try {
    const cal = calendarFor(refreshToken);
    const requestBody: calendar_v3.Schema$Event = {};
    if (ev.summary)      requestBody.summary     = ev.summary;
    if (ev.description)  requestBody.description = ev.description;
    if (ev.location)     requestBody.location    = ev.location;
    if (ev.start)        requestBody.start = { dateTime: ev.start.toISOString(), timeZone: "Asia/Kolkata" };
    if (ev.end)          requestBody.end   = { dateTime: ev.end.toISOString(),   timeZone: "Asia/Kolkata" };
    if (ev.attendeeEmails) requestBody.attendees = ev.attendeeEmails.map((email) => ({ email }));

    await cal.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody,
    });
    return true;
  } catch (err) {
    console.error("Google Calendar updateEvent failed:", err);
    return false;
  }
}

export async function deleteEvent(refreshToken: string, eventId: string): Promise<boolean> {
  try {
    const cal = calendarFor(refreshToken);
    await cal.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
    return true;
  } catch (err) {
    console.error("Google Calendar deleteEvent failed:", err);
    return false;
  }
}

export interface BusyInterval { start: Date; end: Date }

/** Query Google Calendar's freebusy endpoint for one user. Returns the list
 *  of busy intervals on their primary calendar within [start, end]. Empty
 *  array on any failure — the caller should still let the user proceed. */
export async function getBusyIntervals(
  refreshToken: string,
  start: Date,
  end: Date,
): Promise<BusyInterval[]> {
  try {
    const cal = calendarFor(refreshToken);
    const { data } = await cal.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        timeZone: "Asia/Kolkata",
        items: [{ id: "primary" }],
      },
    });
    const busy = data.calendars?.primary?.busy ?? [];
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (err) {
    console.error("Google Calendar freebusy.query failed:", err);
    return [];
  }
}

/** Merge overlapping intervals into a single sorted list of "blocked" ranges.
 *  Sorting then sweeping is enough — we never deal with thousands of busy
 *  intervals per user. */
function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: BusyInterval[] = [{ start: new Date(sorted[0].start), end: new Date(sorted[0].end) }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur  = sorted[i];
    if (cur.start.getTime() <= last.end.getTime()) {
      if (cur.end.getTime() > last.end.getTime()) last.end = new Date(cur.end);
    } else {
      out.push({ start: new Date(cur.start), end: new Date(cur.end) });
    }
  }
  return out;
}

/** Convert a UTC Date into IST hour/minute (rounded by minute). Used so the
 *  working-hours filter operates on the user's local clock, not UTC. */
function istParts(d: Date): { hour: number; minute: number; weekday: number } {
  // IST = UTC+5:30. Add 5h30m and read UTC fields.
  const shifted = new Date(d.getTime() + (5 * 60 + 30) * 60_000);
  return {
    hour:    shifted.getUTCHours(),
    minute:  shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(), // 0 = Sun, 6 = Sat
  };
}

/** Find candidate free slots for one or more users. Generates 30-minute
 *  candidates from `searchStart` for `daysOut` days (working hours 09:00 →
 *  18:00 IST, skip Sundays), discards any that overlap a merged busy range,
 *  and returns the `count` slots whose start time is closest to `around`.
 *
 *  This is intentionally simple: no preference for the requester's own
 *  business hours, no per-attendee weight. Good enough for a 5-person org. */
export async function suggestFreeSlots(
  refreshTokens: string[],
  around: Date,
  durationMin: number,
  count = 5,
  daysOut = 14,
): Promise<Date[]> {
  const searchStart = new Date(around);
  searchStart.setMinutes(0, 0, 0);
  // Look back 1 day so we can also offer earlier-same-day slots if proposed
  // time is in the late afternoon.
  const windowStart = new Date(searchStart.getTime() - 24 * 60 * 60_000);
  const windowEnd   = new Date(searchStart.getTime() + daysOut * 24 * 60 * 60_000);

  // Pull busy intervals from every attendee's calendar in parallel, then
  // merge into one combined "blocked" list.
  const everyoneBusy = (await Promise.all(
    refreshTokens.map((t) => getBusyIntervals(t, windowStart, windowEnd)),
  )).flat();
  const blocked = mergeIntervals(everyoneBusy);

  function overlaps(start: Date, end: Date): boolean {
    for (const b of blocked) {
      if (b.start.getTime() < end.getTime() && b.end.getTime() > start.getTime()) return true;
    }
    return false;
  }

  const STEP_MIN     = 30;
  const WORK_START_H = 9;
  const WORK_END_H   = 18;
  const candidates: Date[] = [];

  for (let t = windowStart.getTime(); t <= windowEnd.getTime(); t += STEP_MIN * 60_000) {
    const slotStart = new Date(t);
    if (slotStart.getTime() < Date.now() + 30 * 60_000) continue; // skip slots starting in the next 30 min
    const { hour, minute, weekday } = istParts(slotStart);
    if (weekday === 0) continue; // skip Sundays
    if (hour < WORK_START_H) continue;
    // Only allow 09:00, 09:30, 10:00 … <18:00
    if (hour >= WORK_END_H) continue;
    void minute;
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
    // Don't let the slot spill past 18:00 IST.
    const endParts = istParts(slotEnd);
    if (endParts.hour > WORK_END_H || (endParts.hour === WORK_END_H && endParts.minute > 0)) continue;
    if (overlaps(slotStart, slotEnd)) continue;
    candidates.push(slotStart);
  }

  // Sort by absolute distance from the originally proposed time and take top
  // `count`. Re-sort the result chronologically so the UI shows them in
  // ascending order — easier to scan.
  candidates.sort((a, b) => Math.abs(a.getTime() - around.getTime()) - Math.abs(b.getTime() - around.getTime()));
  return candidates.slice(0, count).sort((a, b) => a.getTime() - b.getTime());
}
