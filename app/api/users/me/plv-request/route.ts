import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";

/** Community member submits a request to be considered as a Para Legal Volunteer. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "community") {
      return NextResponse.json({ error: "Only community members can request PLV status" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const motivation = String((body as { motivation?: string }).motivation ?? "").trim();
    if (motivation.length < 20) {
      return NextResponse.json({ error: "Tell us briefly (20+ characters) why you want to become a PLV." }, { status: 400 });
    }

    const user = await User.findById(session.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.communityProfile = user.communityProfile ?? { verificationStatus: "pending" };
    if (user.communityProfile.plvStatus === "approved") {
      return NextResponse.json({ error: "You're already an approved PLV." }, { status: 400 });
    }
    user.communityProfile.plvStatus = "requested";
    user.communityProfile.plvMotivation = motivation;
    user.communityProfile.plvRequestedAt = new Date();
    user.communityProfile.plvRejectionReason = undefined;
    user.communityProfile.plvDecidedBy = undefined;
    user.communityProfile.plvDecidedAt = undefined;
    user.markModified("communityProfile");
    await user.save();

    return NextResponse.json({ ok: true, plvStatus: "requested" });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/users/me/plv-request", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
