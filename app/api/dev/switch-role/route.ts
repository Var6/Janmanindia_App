import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

const VALID_ROLES = ["user", "socialworker", "litigation", "hr", "finance", "admin", "superadmin"];
const ROLE_EMAIL: Record<string, string> = {
  user:        "user@dev.janmanindia.in",
  socialworker:"sw@dev.janmanindia.in",
  litigation:  "litigation@dev.janmanindia.in",
  hr:          "hr@dev.janmanindia.in",
  finance:     "finance@dev.janmanindia.in",
  admin:       "admin@dev.janmanindia.in",
  superadmin:  "superadmin@dev.janmanindia.in",
};

export async function POST(request: NextRequest) {
  if (process.env.DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev bypass is disabled" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body as { role: string };

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: ROLE_EMAIL[role] }).lean();
  if (!user) {
    return NextResponse.json({ error: "Dev user not found — run /api/dev/seed first" }, { status: 404 });
  }

  const token = await signToken({ id: String(user._id), role, name: user.name });

  const response = NextResponse.json({ success: true, role });
  response.cookies.set("dev_role", role, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
