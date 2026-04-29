import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth_token";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET environment variable must be set to a string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type JWTPayload = {
  id: string;
  role: string;
  name: string;
};

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Read and verify the auth_token cookie from the current request context. */
export async function getSessionFromCookies(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/** Require a session — throws with 401 JSON body if not authenticated. */
export async function requireSession(): Promise<JWTPayload> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/** Require a specific role — throws 403 if role doesn't match. */
export async function requireRole(
  ...allowed: string[]
): Promise<JWTPayload> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export { COOKIE_NAME };

/** Validate a `next` parameter from a login redirect. We only accept paths
 *  relative to our own origin — that's how we stop an attacker from crafting
 *  a `?next=https://evil.example.com` and using our login flow as an open
 *  redirect after authentication. Returns the safe path or null. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    // Reject anything that isn't an in-app path. Must start with a single "/"
    // (so "//evil.com" — which a URL parser would treat as a protocol-relative
    // host — is rejected too).
    if (typeof raw !== "string") return null;
    if (raw.length < 1 || raw.length > 512) return null;
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
    // Reject login-related destinations to avoid bouncing the user back to
    // the page they just came from.
    if (raw.startsWith("/login") || raw.startsWith("/register") || raw.startsWith("/api/")) return null;
    return raw;
  } catch {
    return null;
  }
}
