/** Datetime helpers used by client forms.
 *
 *  The catch with <input type="datetime-local"> is that it submits a *naïve*
 *  string — "2026-04-30T14:30" with no timezone offset. If we send that raw
 *  to the server (Vercel runs in UTC), `new Date(str)` reads it as UTC and
 *  the user's 14:30 IST silently becomes 14:30 UTC, which Google Calendar
 *  then displays as 20:00 IST.
 *
 *  These helpers convert on the client, where the browser's local timezone
 *  is the right interpretation for what the user typed. */

/** Turn a datetime-local input value ("YYYY-MM-DDTHH:mm") into a
 *  fully-qualified UTC ISO instant. Returns undefined for empty / invalid
 *  input so callers can drop the field cleanly. */
export function localInputToISO(s: string): string | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
