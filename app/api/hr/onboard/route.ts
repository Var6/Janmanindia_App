import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole, hashPassword } from "@/lib/auth";
import User from "@/models/User";
import { nextEmployeeId, sanitizeProjectCode } from "@/lib/employee-id";

const STAFF_ROLES = ["socialworker", "litigation", "hr", "finance", "administrator", "director"];

/** POST /api/hr/onboard — create a new staff account with auto-generated Employee ID. */
export async function POST(req: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    const body = await req.json();
    const { name, email, password, role, phone, project, barCouncilId, district, city } = body as {
      name?: string; email?: string; password?: string; role?: string; phone?: string; project?: string;
      barCouncilId?: string; district?: string; city?: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
    }
    if (!role || !STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: `role must be one of ${STAFF_ROLES.join(", ")}` }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    let projectCode: string;
    try {
      projectCode = sanitizeProjectCode(project ?? "");
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    await connectDB();
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const employeeId = await nextEmployeeId(projectCode);

    const userData: Record<string, unknown> = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone: phone?.trim(),
      isActive: true,
      employeeId,
      joinedAt: new Date(),
    };

    if (role === "litigation") {
      userData.litigationProfile = {
        barCouncilId: barCouncilId?.trim(),
        location: { district: district?.trim() ?? "", city: city?.trim() ?? "" },
        activeCaseCount: 0,
        specialisation: [],
      };
    }
    if (role === "socialworker") {
      userData.socialWorkerProfile = {
        avgResolutionTimeDays: 0, openTickets: 0, resolvedTickets: 0, slaBreaches: 0,
      };
    }

    const user = await User.create(userData);

    return NextResponse.json({
      user: {
        _id: String(user._id), name: user.name, email: user.email, role: user.role,
        phone: user.phone, isActive: user.isActive, employeeId: user.employeeId,
        joinedAt: user.joinedAt, createdAt: user.get("createdAt"),
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("onboard error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
