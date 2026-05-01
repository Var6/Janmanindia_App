import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";

/**
 * POST /api/community/lite-create
 *
 * Create a stub community-member account on behalf of someone who hasn't
 * signed up themselves yet. Used by the case-enquiry form when a community
 * member or social worker is filing for a victim that isn't already in the
 * system. The created user has no password — they can claim the account
 * later by registering with the same email.
 *
 * Authorisation: any signed-in role except `pending`. Community members are
 * allowed because the enquiry workflow is community-facing — the original
 * Google Form was filled by community paralegals on behalf of victims.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "pending") {
      return NextResponse.json({ error: "Account not yet activated." }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, email, district, village } = body as {
      name: string;
      phone?: string;
      email?: string;
      district?: string;
      village?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json(
        { error: "Provide a phone number or email so the social worker can reach them." },
        { status: 400 }
      );
    }

    await connectDB();

    // Email is unique on the User model. If the caller didn't supply one, we
    // synthesise a stub address so the schema's required+unique constraint
    // holds. The user can later overwrite this when they register themselves.
    const stubEmail = email?.trim().toLowerCase()
      || `community-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@noreply.janmanindia.local`;

    const existing = await User.findOne({ email: stubEmail });
    if (existing) {
      return NextResponse.json(
        { error: "A community member with that email already exists.", existingId: String(existing._id) },
        { status: 409 }
      );
    }

    const user = await User.create({
      name: name.trim(),
      email: stubEmail,
      role: "community",
      phone: phone?.trim() || undefined,
      isActive: true,
      communityProfile: {
        district: district?.trim() || undefined,
        village: village?.trim() || undefined,
        verificationStatus: "pending",
      },
    });

    return NextResponse.json(
      {
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/community/lite-create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
