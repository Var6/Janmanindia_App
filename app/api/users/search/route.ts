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

  // Privacy: community members can normally only look up staff (not other
  // community members or privileged roles). Exception — looking up another
  // *community* member for the case-enquiry "filing on behalf" flow is
  // allowed but restricted to exact phone/email matches so the directory
  // can't be browsed by name (you have to already know how to contact them).
  const COMMUNITY_VISIBLE_ROLES = ["socialworker", "litigation", "hr", "finance"];
  const isCommunityToCommunity = session.role === "community" && role === "community";
  if (session.role === "community" && !isCommunityToCommunity && !COMMUNITY_VISIBLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (q.length < 2) return NextResponse.json({ users: [] });

  await connectDB();

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter: Record<string, unknown> = {
    role,
    isActive: true,
    $or: isCommunityToCommunity
      ? [{ phone: q.trim() }, { email: q.trim().toLowerCase() }]
      : [
          { name:  { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ],
  };

  const users = await User.find(filter)
    .select("name email phone role")
    .limit(10)
    .lean();

  return NextResponse.json({ users });
}
