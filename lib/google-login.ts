import { OAuth2Client, type TokenPayload } from "google-auth-library";

const SCOPES = ["openid", "email", "profile"];

export const WORKSPACE_DOMAIN = "janmanindia.org";

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/login-google/callback`;
}

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google sign-in env vars not set (GOOGLE_LOGIN_CLIENT_ID, GOOGLE_LOGIN_CLIENT_SECRET)"
    );
  }
  return new OAuth2Client(clientId, clientSecret, getRedirectUri());
}

/** Build Google's consent URL. State must match the cookie when the callback fires. */
export function getLoginAuthUrl(state: string): string {
  const client = getOAuthClient();
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

/** Exchange the auth code, verify the ID token signature, and return the verified claims. */
export async function exchangeAndVerifyIdToken(code: string): Promise<TokenPayload> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_LOGIN_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google ID token");
  if (!payload.email) throw new Error("Google ID token has no email");
  if (!payload.email_verified) throw new Error("Google email is not verified");

  return payload;
}
