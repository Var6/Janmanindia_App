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

    // Community sees only the social worker they've been assigned to —
    // not the org-wide SW list. If they have no assignment yet, no
    // contacts are shown (and the page nudges them to wait for one).
    let users;
    if (session.role === "community") {
      const me = await User.findById(session.id).select("communityProfile.assignedSocialWorker").lean();
      const swId = me?.communityProfile?.assignedSocialWorker;
      if (!swId) {
        return NextResponse.json({ contacts: [] });
      }
      users = await User.find({ _id: swId, isActive: true, role: "socialworker" })
        .select("name role employeeId")
        .lean();
    } else {
      users = await User.find({
        _id: { $ne: session.id },
        role: { $in: ["socialworker", "litigation", "hr", "finance", "administrator", "director", "superadmin", "community"] },
        isActive: true,
      })
        .select("name role employeeId")
        .sort({ role: 1, name: 1 })
        .lean();
    }

    // Defensive — re-filter via canDirectMessage
    const contacts = users.filter((u) => canDirectMessage(session.role, u.role));
    return NextResponse.json({ contacts });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
