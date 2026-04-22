import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only staff roles can search citizens
  const allowed = ["socialworker", "director", "superadmin", "hr", "litigation", "finance"];
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role") ?? "community";

  if (q.length < 2) return NextResponse.json({ users: [] });

  await connectDB();

  const filter: Record<string, unknown> = {
    role,
    $or: [
      { name:  { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  };

  const users = await User.find(filter)
    .select("name email phone")
    .limit(10)
    .lean();

  return NextResponse.json({ users });
}
