import { google } from "googleapis";

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

export type CalendarEventInput = {
  title: string;
  description?: string;
  startDateTime: Date;
  attendeeEmails: string[];
  caseId: string;
};

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<string> {
  const calendar = getCalendarClient();

  const endDateTime = new Date(input.startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: input.title,
      description: `${input.description ?? ""}\n\ncaseId:${input.caseId}`,
      start: { dateTime: input.startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
      attendees: input.attendeeEmails.map((email) => ({ email })),
    },
  });

  return res.data.id!;
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<void> {
  const calendar = getCalendarClient();

  const patch: Record<string, unknown> = {};
  if (input.title) patch.summary = input.title;
  if (input.description) patch.description = input.description;
  if (input.startDateTime) {
    const end = new Date(input.startDateTime);
    end.setHours(end.getHours() + 1);
    patch.start = { dateTime: input.startDateTime.toISOString() };
    patch.end = { dateTime: end.toISOString() };
  }
  if (input.attendeeEmails) {
    patch.attendees = input.attendeeEmails.map((email) => ({ email }));
  }

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: patch,
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

export function getCalendarEmbedUrl(email: string): string {
  const encoded = encodeURIComponent(email);
  return `https://calendar.google.com/calendar/embed?src=${encoded}&ctz=Asia%2FKolkata&mode=WEEK`;
}
