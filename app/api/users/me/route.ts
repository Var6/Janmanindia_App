import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies, comparePassword, hashPassword } from "@/lib/auth";
import User from "@/models/User";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.id)
    .select("-passwordHash")
    .populate("communityProfile.assignedSocialWorker", "name email phone role")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      name?: string;
      phone?: string;
      avatarUrl?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    await connectDB();
    const user = await User.findById(session.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};

    if (body.name?.trim())          updates.name      = body.name.trim();
    if (body.phone?.trim())         updates.phone     = body.phone.trim();
    if ("avatarUrl" in body)        updates.avatarUrl = body.avatarUrl || null;

    // Password change. Google-only accounts (no passwordHash on file) can set
    // their first password without supplying a "current" one — they have no
    // password to verify against, and the session itself is the auth.
    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      if (user.passwordHash) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Current password is required to set a new one" }, { status: 400 });
        }
        const valid = await comparePassword(body.currentPassword, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
      }
      updates.passwordHash = await hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    await User.updateOne({ _id: session.id }, updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
