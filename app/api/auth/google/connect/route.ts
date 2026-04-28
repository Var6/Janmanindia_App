import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";

/** GET /api/auth/google/connect — redirect to Google's OAuth consent screen. */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));

  // State is the user's id so we know who to attach the refresh token to in the callback.
  const url = getAuthUrl(session.id);
  return NextResponse.redirect(url);
}
