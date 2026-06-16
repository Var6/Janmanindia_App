import { google } from "googleapis";

/**
 * Google Calendar sync for case hearings.
 *
 * Auth: a Google **service account**. Set in the environment:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   — the service account's email
 *   GOOGLE_SERVICE_ACCOUNT_KEY     — its private key (with literal \n escapes)
 *   GOOGLE_CALENDAR_ID             — a REAL calendar the service account can
 *                                    edit (share that calendar with the service
 *                                    account email, "Make changes to events").
 *                                    Do NOT leave this as "primary" — that's the
 *                                    service account's own calendar, which no
 *                                    human can see.
 *
 * Attendees (so a hearing lands in a lawyer's personal calendar) require
 * Domain-Wide Delegation. Without it, the Google API rejects an insert that
 * carries attendees — so we automatically retry WITHOUT attendees, guaranteeing
 * the event still lands on the shared org calendar the team/director watch.
 */

/** True only when the service-account credentials are actually present, so
 *  callers can skip cleanly instead of throwing on every case save. */
export function isCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

/** A service account can't invite attendees without Domain-Wide Delegation —
 *  detect that specific failure so we can retry without them. */
function isAttendeeDelegationError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err ?? "");
  return /domain-wide delegation|cannot invite attendees|forbiddenForServiceAccounts/i.test(msg);
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  startDateTime: Date;
  attendeeEmails: string[];
  caseId: string;
};

export async function createCalendarEvent(input: CalendarEventInput): Promise<string> {
  if (!isCalendarConfigured()) return "";
  const calendar = getCalendarClient();

  const endDateTime = new Date(input.startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);

  const base = {
    summary: input.title,
    description: `${input.description ?? ""}\n\ncaseId:${input.caseId}`,
    start: { dateTime: input.startDateTime.toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Kolkata" },
  };
  const attendees = input.attendeeEmails.filter(Boolean).map((email) => ({ email }));

  try {
    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendUpdates: "none",
      requestBody: attendees.length ? { ...base, attendees } : base,
    });
    return res.data.id ?? "";
  } catch (err) {
    if (attendees.length && isAttendeeDelegationError(err)) {
      // Retry without attendees so the hearing still lands on the shared calendar.
      const res = await calendar.events.insert({ calendarId: CALENDAR_ID, sendUpdates: "none", requestBody: base });
      return res.data.id ?? "";
    }
    throw err;
  }
}

export async function updateCalendarEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void> {
  if (!isCalendarConfigured() || !eventId) return;
  const calendar = getCalendarClient();

  const patch: Record<string, unknown> = {};
  if (input.title) patch.summary = input.title;
  if (input.description) patch.description = input.description;
  if (input.startDateTime) {
    const end = new Date(input.startDateTime);
    end.setHours(end.getHours() + 1);
    patch.start = { dateTime: input.startDateTime.toISOString(), timeZone: "Asia/Kolkata" };
    patch.end = { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" };
  }
  const attendees = input.attendeeEmails?.filter(Boolean).map((email) => ({ email }));

  try {
    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: "none",
      requestBody: attendees?.length ? { ...patch, attendees } : patch,
    });
  } catch (err) {
    if (attendees?.length && isAttendeeDelegationError(err)) {
      await calendar.events.patch({ calendarId: CALENDAR_ID, eventId, sendUpdates: "none", requestBody: patch });
      return;
    }
    throw err;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isCalendarConfigured() || !eventId) return;
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

export function getCalendarEmbedUrl(email: string): string {
  const encoded = encodeURIComponent(email);
  return `https://calendar.google.com/calendar/embed?src=${encoded}&ctz=Asia%2FKolkata&mode=WEEK`;
}

/**
 * Self-test used by the admin diagnostic: confirms the service account can
 * actually write to the configured calendar by creating + deleting a throwaway
 * event. Returns a structured result so the UI can show exactly what's wrong.
 */
export async function checkCalendarHealth(): Promise<{
  ok: boolean;
  configured: boolean;
  calendarId: string;
  detail: string;
}> {
  const configured = isCalendarConfigured();
  const calendarId = CALENDAR_ID;
  if (!configured) {
    return { ok: false, configured: false, calendarId, detail: "Service-account credentials are not set (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY)." };
  }
  try {
    const calendar = getCalendarClient();
    const start = new Date(Date.now() + 3600_000);
    const end = new Date(start.getTime() + 1800_000);
    const ins = await calendar.events.insert({
      calendarId,
      sendUpdates: "none",
      requestBody: {
        summary: "Janman calendar health-check (auto-deleted)",
        start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
      },
    });
    if (ins.data.id) await calendar.events.delete({ calendarId, eventId: ins.data.id });
    return { ok: true, configured: true, calendarId, detail: "Created and deleted a test event successfully." };
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? String(err);
    return { ok: false, configured: true, calendarId, detail: msg };
  }
}
