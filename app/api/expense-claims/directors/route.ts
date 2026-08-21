import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";

/**
 * GET /api/expense-claims/directors — the list of directors an applicant can
 * name under "Expense Approved By". Any authenticated staff member can read it
 * (it only exposes names + ids of approvers), unlike the fuller /api/users.
 */
export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const directors = await User.find({ role: { $in: ["director", "superadmin"] }, isActive: true })
      .select("name role")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ directors });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/expense-claims/directors", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
