import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User from "@/models/User";

/** GET /api/users?role=socialworker,litigation — list staff (HR/director/superadmin). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    await connectDB();

    const { searchParams } = new URL(request.url);
    const rolesParam = searchParams.get("role");
    const filter: Record<string, unknown> = {};
    if (rolesParam) {
      const roles = rolesParam.split(",").map((r) => r.trim()).filter(Boolean);
      if (roles.length) filter.role = { $in: roles };
    }

    const users = await User.find(filter)
      .select("name email phone role isActive employeeId joinedAt exitedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
