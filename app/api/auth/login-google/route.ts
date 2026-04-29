import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getLoginAuthUrl, isGoogleLoginConfigured } from "@/lib/google-login";
import { safeNextPath } from "@/lib/auth";

const STATE_COOKIE = "g_login_state";
/** Where to send the user after a successful Google sign-in. Stored in a
 *  short-lived cookie so the callback can read it after Google bounces back —
 *  Google itself never sees this value, so an attacker can't tamper with it. */
const NEXT_COOKIE = "g_login_next";

/** Best-effort detection of the public origin the user is hitting us on.
 *  Honours `x-forwarded-*` headers behind a proxy/load balancer; otherwise
 *  uses the Host header. Lets the same OAuth flow work on localhost, preview
 *  deploys, and prod — provided each origin is added as an authorised
 *  redirect URI in Google Cloud Console. */
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

/** GET /api/auth/login-google — kick off the Google sign-in flow. */
export async function GET(req: NextRequest) {
  const origin = originFromRequest(req);
  try {
    if (!isGoogleLoginConfigured()) {
      // No creds at all — bounce to /login. The page hides the button when
      // this is the case, so this branch only fires if someone hits the URL
      // directly. We log it so admins notice the misconfig in access logs.
      console.warn("/api/auth/login-google hit while no Google OAuth client is configured");
      const url = new URL("/login", origin);
      url.searchParams.set("error", "google_unavailable");
      return NextResponse.redirect(url);
    }

    const state = randomBytes(24).toString("base64url");
    const url = getLoginAuthUrl(state, origin);

    const res = NextResponse.redirect(url);
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    };
    res.cookies.set(STATE_COOKIE, state, cookieOpts);

    // Stash the post-login destination if the caller passed one. The proxy
    // sets `?next=/wherever` when an unauthenticated user hits a protected
    // page, and we surface it through the login form's Google button as well.
    const next = safeNextPath(req.nextUrl.searchParams.get("next"));
    if (next) {
      res.cookies.set(NEXT_COOKIE, next, cookieOpts);
    } else {
      res.cookies.delete(NEXT_COOKIE);
    }
    return res;
  } catch (err) {
    console.error("/api/auth/login-google init failed:", err);
    const url = new URL("/login", origin);
    url.searchParams.set("error", "google_unavailable");
    return NextResponse.redirect(url);
  }
}
