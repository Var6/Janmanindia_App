import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type Role =
  | "community"
  | "socialworker"
  | "litigation"
  | "hr"
  | "finance"
  | "administrator"
  | "director"
  | "superadmin";

const ROLE_HOME: Record<Role, string> = {
  community: "/community",
  socialworker: "/socialworker",
  litigation: "/litigation",
  hr: "/hr",
  finance: "/finance",
  administrator: "/administrator",
  director: "/director",
  superadmin: "/superadmin",
};

const ALL_ROLES = Object.keys(ROLE_HOME) as Role[];
const TRAINING_ROLES: Role[] = ["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];

const SKIP_PREFIXES = [
  "/_next/",
  "/api/auth/",
  "/login",
  "/register",
  "/favicon.ico",
  // Next.js exposes app/icon.png and app/apple-icon.png at these routes for
  // browser tab favicons and Apple touch icons. They're served as binary
  // images without trailing extensions, so the matcher's *.png exclusion
  // can't catch them — gate-skip them explicitly so anonymous tabs render
  // the favicon.
  "/icon",
  "/apple-icon",
  // Public legal pages — these URLs are referenced from the Google OAuth
  // consent screen, which crawls them anonymously during verification. They
  // must stay reachable without a session cookie.
  "/privacy",
  "/terms",
  // Public marketing pages — community + campaigns are linked from the
  // home page footer and are intended for first-time visitors. Google's
  // app-verification crawler also follows these.
  "/jan-sahayak",
  "/events",
  // Dev-branch only — the routes themselves are env-gated and refuse to act
  // on the production host, so leaving these in the skip list is safe.
  "/dev",
  "/api/dev/",
];

/** Exact-match public paths. `/` can't go in SKIP_PREFIXES because every URL
 *  startsWith("/"), so we whitelist it explicitly here. */
const PUBLIC_EXACT_PATHS = new Set<string>(["/"]);

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET environment variable must be set to a string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function rolePrefixFromPath(pathname: string): Role | null {
  for (const role of ALL_ROLES) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) {
      return role;
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, public marketing pages, and public auth routes —
  // anonymous visitors (including Google's verification crawler) hit these
  // without a session cookie.
  if (PUBLIC_EXACT_PATHS.has(pathname) || SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  // No token → redirect to /login with next param
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let payload: { id: string; role: Role; name: string };
  try {
    const { payload: p } = await jwtVerify(token, getSecret());
    payload = p as { id: string; role: Role; name: string };
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth_token");
    return response;
  }

  const { role } = payload;

  // superadmin can visit any route
  if (role === "superadmin") return NextResponse.next();

  // /training accessible by all signed-in roles
  if (pathname === "/training" || pathname.startsWith("/training/")) {
    if (TRAINING_ROLES.includes(role)) return NextResponse.next();
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  // Role-prefix mismatch → redirect to their own dashboard
  const targetRole = rolePrefixFromPath(pathname);
  if (targetRole && targetRole !== role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
