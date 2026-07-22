/**
 * Small phone helpers used by the login/register flows so community members can
 * sign in with their mobile number instead of an email (many don't have one).
 *
 * We store phone numbers as typed (trimmed) for display continuity, and match
 * on the trailing 10 digits — the Indian mobile number — so "+91 98765 43210",
 * "+919876543210" and "9876543210" all resolve to the same account.
 */

/** Strip everything except digits. */
export function digitsOnly(s: string | undefined | null): string {
  return (s ?? "").replace(/\D/g, "");
}

/** The trailing 10 digits (Indian mobile), or "" if fewer than 10 digits. */
export function last10(s: string | undefined | null): string {
  const d = digitsOnly(s);
  return d.length >= 10 ? d.slice(-10) : "";
}

/** A value looks like a phone (no "@", at least 10 digits) rather than an email. */
export function looksLikePhone(s: string | undefined | null): boolean {
  if (!s || s.includes("@")) return false;
  return digitsOnly(s).length >= 10;
}

/**
 * Mongo filter that matches a user by the trailing 10 digits of their phone.
 * Restricted to accounts that actually have a password (login accounts) so it
 * never resolves to a passwordless intake stub.
 */
export function phoneLoginFilter(input: string): Record<string, unknown> | null {
  const ten = last10(input);
  if (!ten) return null;
  return {
    passwordHash: { $exists: true, $ne: null },
    phone: new RegExp(`${ten}$`),
  };
}
