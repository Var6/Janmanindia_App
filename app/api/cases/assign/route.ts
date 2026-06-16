import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import { syncCaseHearing } from "@/lib/case-calendar-sync";

export async function POST(request: NextRequest) {
  try {
    await requireRole("director", "superadmin");
    await connectDB();

    const body = await request.json();
    const { caseId, location: locationOverride, nextHearingDate } = body as {
      caseId: string;
      location?: string;
      nextHearingDate?: string;
    };

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const caseDoc = await Case.findById(caseId)
      .populate("community", "name email")
      .populate("socialWorker", "name email");

    if (!caseDoc) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Persist a hearing date passed from the assign form (so the calendar sync
    // and dashboard widgets pick it up).
    if (nextHearingDate) {
      const d = new Date(nextHearingDate);
      if (!isNaN(d.getTime())) {
        caseDoc.nextHearingDate = d;
        await Case.updateOne({ _id: caseId }, { nextHearingDate: d });
      }
    }

    // Target location for matching: the override typed on the form wins,
    // otherwise the case's own district / state (which is what we really want —
    // not the social worker's home district as before).
    const swUser = caseDoc.socialWorker as unknown as { _id: string } | null;
    let swDistrict = "";
    if (swUser) {
      const sw = await User.findById(swUser._id).lean();
      swDistrict = sw?.litigationProfile?.location?.district ?? "";
    }
    const targetLoc = (locationOverride?.trim() || caseDoc.district || caseDoc.state || swDistrict || "").trim();

    // Step 1: all active litigation members, least-loaded first.
    const allCandidates = await User.find({ role: "litigation", isActive: true })
      .sort({ "litigationProfile.activeCaseCount": 1 })
      .lean();

    if (allCandidates.length === 0) {
      return NextResponse.json(
        { error: "No active litigation members exist. Add a lawyer first." },
        { status: 409 }
      );
    }

    // Step 2: prefer lawyers whose district/city matches the target location.
    // If none match (or no location known), fall back to ALL — we still assign
    // by workload rather than hard-failing.
    let candidates = allCandidates;
    let note: string | undefined;
    if (targetLoc) {
      const lc = targetLoc.toLowerCase();
      const matched = allCandidates.filter((c) => {
        const d = (c.litigationProfile?.location?.district ?? "").toLowerCase();
        const city = (c.litigationProfile?.location?.city ?? "").toLowerCase();
        return (d && (lc.includes(d) || d.includes(lc))) || (city && (lc.includes(city) || city.includes(lc)));
      });
      if (matched.length > 0) {
        candidates = matched;
      } else {
        note = `No lawyer is tagged to "${targetLoc}". Assigned the least-loaded lawyer overall — set lawyer districts in their profile to enable location matching.`;
      }
    } else {
      note = "No location on this case. Assigned the least-loaded lawyer overall.";
    }

    const hearingDate = caseDoc.nextHearingDate;
    let assignedUser: (typeof candidates)[0] | null = null;

    // Step 2: Check for calendar clash if hearing date provided
    for (const candidate of candidates) {
      if (!hearingDate) {
        assignedUser = candidate;
        break;
      }

      // Check if candidate has another open case with same hearing day
      const hearingDay = new Date(hearingDate);
      const startOfDay = new Date(hearingDay);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(hearingDay);
      endOfDay.setHours(23, 59, 59, 999);

      const clash = await Case.exists({
        litigationMember: candidate._id,
        status: { $in: ["Open", "Pending", "Escalated"] },
        nextHearingDate: { $gte: startOfDay, $lte: endOfDay },
      });

      if (!clash) {
        assignedUser = candidate;
        break;
      }
    }

    if (!assignedUser) {
      return NextResponse.json(
        {
          error:
            "All litigation members have a calendar clash on the selected hearing date. Please choose a different date or assign manually.",
        },
        { status: 409 }
      );
    }

    // Step 3: Assign and increment activeCaseCount. Set the lead
    // (litigationMember) AND add to litigationMembers[] — the lawyer's case
    // list queries the array, so without this the assigned case wouldn't show
    // up for them.
    await Promise.all([
      Case.updateOne(
        { _id: caseId },
        { $set: { litigationMember: assignedUser._id }, $addToSet: { litigationMembers: assignedUser._id } }
      ),
      User.updateOne(
        { _id: assignedUser._id },
        { $inc: { "litigationProfile.activeCaseCount": 1 } }
      ),
    ]);

    // Step 4: Sync the hearing to Google Calendar if a hearing date is set.
    // syncCaseHearing reads the case fresh and invites everyone on it (the
    // assigned advocate, social worker, community member), hosting the event on
    // the first connected person's calendar. See lib/case-calendar-sync.ts.
    if (hearingDate) {
      await syncCaseHearing(caseId);
    }

    const updatedCase = await Case.findById(caseId)
      .populate("litigationMember", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      assignedTo: { id: assignedUser._id, name: assignedUser.name, email: assignedUser.email },
      note,
      case: updatedCase,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/cases/assign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
