import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { signToken, comparePassword, COOKIE_NAME, safeNextPath } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, next } = body as { email: string; password: string; next?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    // Google-only accounts have no password on file. Don't leak that fact —
    // return the same generic "Invalid credentials" message so attackers can't
    // enumerate which emails are SSO-only.
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Update lastLoginAt
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const token = await signToken({
      id: String(user._id),
      role: user.role,
      name: user.name,
    });

    const ROLE_HOME: Record<string, string> = {
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

    // Prefer the page the user was trying to reach when they got bounced to
    // /login. Falls back to their role home only if the next param is missing
    // or doesn't pass our same-origin allowlist.
    const redirectTo = safeNextPath(next) ?? ROLE_HOME[user.role] ?? "/";

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirectTo,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
