import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type Role =
  | "user"
  | "socialworker"
  | "litigation"
  | "hr"
  | "finance"
  | "admin"
  | "superadmin";

const ROLE_HOME: Record<Role, string> = {
  user: "/user",
  socialworker: "/socialworker",
  litigation: "/litigation",
  hr: "/hr",
  finance: "/finance",
  admin: "/admin",
  superadmin: "/superadmin",
};

const ALL_ROLES = Object.keys(ROLE_HOME) as Role[];
const TRAINING_ROLES: Role[] = ["user", "socialworker", "litigation"];

const SKIP_PREFIXES = [
  "/_next/",
  "/api/auth/",
  "/api/dev/",
  "/login",
  "/register",
  "/dev",
  "/favicon.ico",
];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "changeme-at-least-32-chars-long!!";
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

/** Dev bypass — only active when DEV_BYPASS=true in env */
async function handleDevBypass(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.DEV_BYPASS !== "true") return null;

  const devRole = request.cookies.get("dev_role")?.value as Role | undefined;
  if (!devRole || !ALL_ROLES.includes(devRole)) return null;

  // If a valid auth_token exists AND its id is a real ObjectId, let normal flow handle it
  const token = request.cookies.get("auth_token")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const id = (payload as { id?: string }).id ?? "";
      if (/^[a-f\d]{24}$/i.test(id)) return null; // real ObjectId — fall through
    } catch {
      // expired/invalid
    }
    // Token present but has fake ID or is invalid — clear it and redirect to /dev
    const res = NextResponse.redirect(new URL("/dev", request.url));
    res.cookies.delete("auth_token");
    return res;
  }

  // No token: send to /dev so the user picks a role and gets a real JWT
  return NextResponse.redirect(new URL("/dev", request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, public auth routes, and dev panel
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Dev bypass — mint JWT from dev_role cookie when DEV_BYPASS=true
  const devResponse = await handleDevBypass(request);
  if (devResponse) return devResponse;

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

  // /training accessible by user, socialworker, litigation only
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
