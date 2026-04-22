import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import DistrictHelpline from "@/models/DistrictHelpline";

interface PopulatedSW { _id: unknown; name: string; phone?: string; email?: string }

/** GET /api/community/contacts — for a community member, returns:
 *  - assigned social worker (primary contact)
 *  - district helpline (fallback if SW unreachable)
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "community") {
      return NextResponse.json({ error: "Only community members" }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ assignedSocialWorker: null, districtHelpline: null });
    }

    await connectDB();
    const me = await User.findById(session.id)
      .select("citizenProfile")
      .populate<{ citizenProfile: { assignedSocialWorker?: PopulatedSW; district?: string } | undefined }>(
        "citizenProfile.assignedSocialWorker",
        "name phone email"
      )
      .lean();

    const sw = (me?.citizenProfile?.assignedSocialWorker ?? null) as unknown as PopulatedSW | null;
    const district = me?.citizenProfile?.district;

    let helpline = null;
    if (district) {
      helpline = await DistrictHelpline.findOne({ district }).lean();
    }

    return NextResponse.json({
      district: district ?? null,
      assignedSocialWorker: sw ? {
        _id: String(sw._id),
        name: sw.name,
        phone: sw.phone ?? null,
        email: sw.email ?? null,
      } : null,
      districtHelpline: helpline,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
