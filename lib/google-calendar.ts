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
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars not set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)");
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
