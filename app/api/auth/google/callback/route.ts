import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

/** GET /api/auth/google/callback — "Connect Google Calendar" from the profile page.
 *  For first-time Google sign-in, the unified flow lives at /api/auth/login-google/callback. */
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!session) return NextResponse.redirect(new URL("/login", baseUrl));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const profileUrl = new URL(`/${session.role}/profile`, baseUrl);

  if (errorParam) {
    profileUrl.searchParams.set("google", "denied");
    return NextResponse.redirect(profileUrl);
  }
  if (!code || !state || state !== session.id) {
    profileUrl.searchParams.set("google", "invalid_state");
    return NextResponse.redirect(profileUrl);
  }

  try {
    const { refreshToken, email } = await exchangeCodeForTokens(code);
    await connectDB();
    await User.updateOne(
      { _id: session.id },
      { $set: {
        googleRefreshToken: refreshToken,
        googleEmail: email.toLowerCase(),
        googleConnectedAt: new Date(),
      }}
    );
    profileUrl.searchParams.set("google", "connected");
    return NextResponse.redirect(profileUrl);
  } catch (err) {
    console.error("Google OAuth exchange failed:", err);
    profileUrl.searchParams.set("google", "failed");
    return NextResponse.redirect(profileUrl);
  }
}
