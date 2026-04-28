import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getLoginAuthUrl } from "@/lib/google-login";

const STATE_COOKIE = "g_login_state";

/** GET /api/auth/login-google — kick off the Google sign-in flow. */
export async function GET() {
  try {
    const state = randomBytes(24).toString("base64url");
    const url = getLoginAuthUrl(state);

    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("/api/auth/login-google init failed:", err);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = new URL("/login", base);
    url.searchParams.set("error", "google_unavailable");
    return NextResponse.redirect(url);
  }
}
