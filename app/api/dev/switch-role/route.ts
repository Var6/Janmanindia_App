import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = ["user", "socialworker", "litigation", "hr", "finance", "admin", "superadmin"];

export async function POST(request: NextRequest) {
  if (process.env.DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev bypass is disabled" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body as { role: string };

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true, role });
  response.cookies.set("dev_role", role, {
    httpOnly: false, // readable by client for display
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  // Clear any previous auth token so proxy re-mints for the new role
  response.cookies.delete("auth_token");

  return response;
}
