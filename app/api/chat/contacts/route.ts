import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import { canDirectMessage } from "@/lib/chat-permissions";

/** GET /api/chat/contacts — list users this session is allowed to chat with. */
export async function GET() {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) return NextResponse.json({ contacts: [] });
    await connectDB();

    let allowedRoles: string[];
    if (session.role === "community") {
      allowedRoles = ["socialworker"];
    } else {
      // staff can chat with all staff and with community
      allowedRoles = ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin", "community"];
    }

    const users = await User.find({
      _id: { $ne: session.id },
      role: { $in: allowedRoles },
      isActive: true,
    })
      .select("name role employeeId")
      .sort({ role: 1, name: 1 })
      .lean();

    // Defensive — re-filter via canDirectMessage
    const contacts = users.filter((u) => canDirectMessage(session.role, u.role));
    return NextResponse.json({ contacts });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
