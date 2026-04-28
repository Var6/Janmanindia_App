import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User from "@/models/User";

/** POST /api/users/appoint-hr?id=<userId> — change a user's role to "hr". */
export async function POST(req: NextRequest) {
  try {
    await requireRole("director", "superadmin");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role: "hr" } },
      { new: true }
    );
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const referer = req.headers.get("referer") ?? "/director/users";
    return NextResponse.redirect(referer, { status: 303 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
