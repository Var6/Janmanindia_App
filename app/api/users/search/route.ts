import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role") ?? "community";

  // Privacy: community members can only look up other staff (not other community
  // members or privileged roles). Staff can look up anyone.
  const COMMUNITY_VISIBLE_ROLES = ["socialworker", "litigation", "hr", "finance"];
  if (session.role === "community" && !COMMUNITY_VISIBLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (q.length < 2) return NextResponse.json({ users: [] });

  await connectDB();

  const filter: Record<string, unknown> = {
    role,
    isActive: true,
    $or: [
      { name:  { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  };

  const users = await User.find(filter)
    .select("name email phone role")
    .limit(10)
    .lean();

  return NextResponse.json({ users });
}
