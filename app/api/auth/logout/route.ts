import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Resolve absolute URL from the incoming request when NEXT_PUBLIC_APP_URL is unset.
  // This avoids hard-coding any localhost fallback into production builds.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const response = NextResponse.redirect(new URL("/login", base));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
