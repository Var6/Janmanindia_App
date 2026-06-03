import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession, signToken, COOKIE_NAME } from "@/lib/auth";
import User from "@/models/User";

/**
 * Switch the ACTIVE role of a multi-role user. Superadmin can grant a person
 * several roles (e.g. hr + director); this re-issues their session token with
 * the chosen role as active so every existing role-based access check just
 * works — the user is cleanly "acting as" one role at a time, no conflicts.
 *
 * Body: { role }. The chosen role is re-validated against the user's assigned
 * roles in the database (not just the token), so a stale/forged token can't
 * grant a role the superadmin didn't assign.
 */
const ROLE_HOME: Record<string, string> = {
  community: "/community",
  socialworker: "/socialworker",
  litigation: "/litigation",
  hr: "/hr",
  finance: "/finance",
  administrator: "/administrator",
  director: "/director",
  superadmin: "/superadmin",
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { role } = (await req.json()) as { role?: string };
    if (!role || !ROLE_HOME[role]) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.id).select("role roles name isActive").lean();
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const allowed = Array.from(new Set([user.role, ...(user.roles ?? [])]));
    if (!allowed.includes(role as (typeof allowed)[number])) {
      return NextResponse.json({ error: "You haven't been granted that role." }, { status: 403 });
    }

    const token = await signToken({
      id: String(user._id),
      role,
      name: user.name,
      ...(allowed.length > 1 ? { roles: allowed } : {}),
    });

    const res = NextResponse.json({ success: true, role, redirectTo: ROLE_HOME[role] });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
