import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { exchangeAndVerifyIdToken, WORKSPACE_DOMAIN } from "@/lib/google-login";
import User from "@/models/User";
import type { Role } from "@/models/User";

const STATE_COOKIE = "g_login_state";

const ROLE_HOME: Record<Role, string> = {
  community: "/community",
  socialworker: "/socialworker",
  litigation: "/litigation",
  hr: "/hr",
  finance: "/finance",
  administrator: "/administrator",
  director: "/director",
  superadmin: "/superadmin",
  pending: "/pending",
};

function loginRedirect(base: string, error: string, detail?: unknown): NextResponse {
  const url = new URL("/login", base);
  url.searchParams.set("error", error);
  if (detail) {
    const msg =
      detail instanceof Error ? detail.message :
      typeof detail === "string" ? detail :
      JSON.stringify(detail);
    // Trim aggressively so a long stack doesn't blow up the URL.
    url.searchParams.set("detail", msg.slice(0, 200));
  }
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/** Best-effort detection of the public origin the user is hitting us on —
 *  must match the origin used when building the auth URL so Google's redirect
 *  URI check passes during the code exchange. */
function originFromRequest(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost.split(",")[0]?.trim()}`;
  }
  const host = req.headers.get("host");
  if (host) {
    const proto = req.nextUrl.protocol.replace(":", "") || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

/** GET /api/auth/login-google/callback — Google redirects here after the user consents. */
export async function GET(req: NextRequest) {
  // Prefer the actual request origin so the OAuth redirect URI matches what we
  // sent up. Fall back to the configured app URL only as a last resort.
  const origin = originFromRequest(req);
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) return loginRedirect(baseUrl, "google_denied");

    // Validate state against the cookie we set on the initiating request.
    // Both must be present and equal — defends against CSRF.
    const cookieState = req.cookies.get(STATE_COOKIE)?.value;
    if (!code || !state || !cookieState || state !== cookieState) {
      return loginRedirect(baseUrl, "google_invalid_state");
    }

    let claims;
    try {
      claims = await exchangeAndVerifyIdToken(code, origin);
    } catch (err) {
      console.error("Google ID token verification failed:", err);
      return loginRedirect(baseUrl, "google_token_invalid");
    }

    const email = claims.email!.toLowerCase();
    const sub = claims.sub!;
    const fullName =
      (typeof claims.name === "string" && claims.name.trim()) ||
      email.split("@")[0];
    const picture = typeof claims.picture === "string" ? claims.picture : undefined;

    try {
      await connectDB();
    } catch (err) {
      console.error("[google-login] connectDB failed:", err);
      return loginRedirect(baseUrl, "db_connect_failed", err);
    }

    const isWorkspace = email.endsWith(`@${WORKSPACE_DOMAIN}`);

    let user;
    try {
      user = await User.findOne({ googleSub: sub });
      if (!user) user = await User.findOne({ email });
    } catch (err) {
      console.error("[google-login] User lookup failed:", err);
      return loginRedirect(baseUrl, "db_lookup_failed", err);
    }

    try {
      if (user) {
        if (!user.isActive) {
          return loginRedirect(baseUrl, "account_deactivated");
        }
        const updates: Record<string, unknown> = {
          lastLoginAt: new Date(),
          googleSub: sub,
        };
        if (!user.name && fullName) updates.name = fullName;
        if (!user.avatarUrl && picture) updates.avatarUrl = picture;
        await User.updateOne({ _id: user._id }, { $set: updates });
      } else {
        const initialRole: Role = isWorkspace ? "pending" : "community";
        user = await User.create({
          name: fullName,
          email,
          googleSub: sub,
          role: initialRole,
          isActive: true,
          lastLoginAt: new Date(),
          avatarUrl: picture,
          ...(initialRole === "community"
            ? { communityProfile: { verificationStatus: "pending" } }
            : {}),
        });
      }
    } catch (err) {
      console.error("[google-login] User upsert failed:", err);
      return loginRedirect(baseUrl, "db_upsert_failed", err);
    }

    // Need to read the refresh-token field (select:false by default) to know
    // whether to auto-redirect this @janmanindia.org user through the calendar
    // consent screen — first-time staff land on /api/auth/google/connect and
    // grant calendar access in one flow before reaching their dashboard.
    //
    // Skipped in dev because the calendar OAuth client and the login OAuth
    // client are different in this project, and the calendar one rarely has
    // localhost redirect URIs registered. Users can connect calendar from
    // their profile page when they need it.
    let needsCalendarConsent = false;
    if (process.env.NODE_ENV === "production") {
      try {
        const calendarStatus = await User.findById(user._id).select("+googleRefreshToken").lean();
        needsCalendarConsent = isWorkspace && !calendarStatus?.googleRefreshToken;
      } catch (err) {
        console.error("[google-login] Calendar status check failed (non-fatal):", err);
      }
    }

    let token: string;
    try {
      token = await signToken({
        id: String(user._id),
        role: user.role,
        name: user.name,
      });
    } catch (err) {
      console.error("[google-login] signToken failed:", err);
      return loginRedirect(baseUrl, "token_sign_failed", err);
    }

    // Auto-chain into the calendar consent flow for workspace users who haven't
    // granted calendar access yet — /api/auth/google/connect requires the
    // session cookie to already be set, so we set it on this response.
    const redirectTo = needsCalendarConsent
      ? "/api/auth/google/connect"
      : (ROLE_HOME[user.role as Role] ?? "/");
    const res = NextResponse.redirect(new URL(redirectTo, baseUrl));
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    // Log the full stack and any mongoose validation details so we can see
    // exactly what blew up in the dev terminal.
    console.error("[google-login] uncaught:", err);
    if (err && typeof err === "object" && "errors" in err) {
      console.error("Validation errors:", JSON.stringify((err as { errors: unknown }).errors, null, 2));
    }
    return loginRedirect(baseUrl, "google_callback_error", err);
  }
}
