import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth_token";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "changeme-at-least-32-chars-long!!";
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
