import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { signToken, comparePassword, COOKIE_NAME } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

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
      user: "/user",
      socialworker: "/socialworker",
      litigation: "/litigation",
      hr: "/hr",
      finance: "/finance",
      admin: "/admin",
      superadmin: "/superadmin",
    };

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirectTo: ROLE_HOME[user.role] ?? "/",
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
