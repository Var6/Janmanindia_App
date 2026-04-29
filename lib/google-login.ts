import { OAuth2Client, type TokenPayload } from "google-auth-library";

const SCOPES = ["openid", "email", "profile"];

export const WORKSPACE_DOMAIN = "janmanindia.org";

/** Resolve OAuth credentials for the sign-in flow. We try the dedicated login
 *  client first; if that's not configured, we fall back to the calendar client
 *  so deployments that only set one set of GOOGLE_* vars still get sign-in. */
function getCredentials(): { clientId: string; clientSecret: string } | null {
  const loginId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const loginSecret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  if (loginId && loginSecret) return { clientId: loginId, clientSecret: loginSecret };

  const calendarId = process.env.GOOGLE_CLIENT_ID;
  const calendarSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (calendarId && calendarSecret) return { clientId: calendarId, clientSecret: calendarSecret };

  return null;
}

/** True when at least one OAuth client is configured — drives whether the
 *  Sign in with Google button is rendered on the login page at all. */
export function isGoogleLoginConfigured(): boolean {
  return getCredentials() !== null;
}

/** Build the redirect URI. Prefer the actual request origin when available so
 *  the same OAuth client works on localhost, preview deploys, and prod (each
 *  origin must still be whitelisted in Google Cloud). Falls back to
 *  NEXT_PUBLIC_APP_URL otherwise. */
function getRedirectUri(requestOrigin?: string): string {
  const base = (requestOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .replace(/\/$/, "");
  return `${base}/api/auth/login-google/callback`;
}

function getOAuthClient(requestOrigin?: string): OAuth2Client {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      "Google sign-in env vars not set — provide either " +
      "GOOGLE_LOGIN_CLIENT_ID + GOOGLE_LOGIN_CLIENT_SECRET, or fall back to " +
      "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET."
    );
  }
  return new OAuth2Client(creds.clientId, creds.clientSecret, getRedirectUri(requestOrigin));
}

/** Build Google's consent URL. State must match the cookie when the callback fires. */
export function getLoginAuthUrl(state: string, requestOrigin?: string): string {
  const client = getOAuthClient(requestOrigin);
  return client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
    // No `hd` hint — community members use personal Gmail; staff use @janmanindia.org.
    // Server-side domain checks decide what role to assign.
  });
}

/** Exchange the auth code, verify the ID token signature, and return the verified claims.
 *  The redirect URI passed here must match the one used when building the auth URL. */
export async function exchangeAndVerifyIdToken(
  code: string,
  requestOrigin?: string,
): Promise<TokenPayload> {
  const client = getOAuthClient(requestOrigin);
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const creds = getCredentials();
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: creds?.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google ID token");
  if (!payload.email) throw new Error("Google ID token has no email");
  if (!payload.email_verified) throw new Error("Google email is not verified");

  return payload;
}
