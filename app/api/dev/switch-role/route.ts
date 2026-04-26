import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

/**
 * DEV-ONLY login bypass — exists on the `dev` branch and is disabled by default.
 *
 * Defence in depth — refuses to mint a token unless ALL three are true:
 *   1. DEV_BYPASS=true is set in the environment
 *   2. The request hostname is NOT a janmanindia.org production domain
 *   3. NEXT_PUBLIC_APP_URL (if set) does NOT point at the prod domain either
 *
 * Even if DEV_BYPASS leaks into a production env by mistake, hitting
 * https://app.janmanindia.org/api/dev/switch-role still returns 403.
 */

const VALID_ROLES = ["community", "socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin"];
const ROLE_EMAIL: Record<string, string> = {
  community:    "community@dev.janmanindia.in",
  socialworker: "sw@dev.janmanindia.in",
  litigation:   "litigation@dev.janmanindia.in",
  hr:           "hr@dev.janmanindia.in",
  finance:      "finance@dev.janmanindia.in",
  administrator:"administrator@dev.janmanindia.in",
  director:     "director@dev.janmanindia.in",
  superadmin:   "superadmin@dev.janmanindia.in",
};

function isProductionHost(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (/(^|\.)janmanindia\.org$/i.test(host)) return true;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  if (appUrl.includes("janmanindia.org")) return true;
  return false;
}

export async function POST(request: NextRequest) {
  if (process.env.DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev bypass is disabled" }, { status: 403 });
  }
  if (isProductionHost(request)) {
    return NextResponse.json({ error: "Dev bypass refused on production host" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body as { role: string };

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: ROLE_EMAIL[role] }).lean();
  if (!user) {
    return NextResponse.json({ error: `Dev user not found for role ${role}. Run \`npm run seed\` to create them.` }, { status: 404 });
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
