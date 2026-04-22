import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import { createCalendarEvent } from "@/lib/gcal";

export async function POST(request: NextRequest) {
  try {
    await requireRole("director", "superadmin");
    await connectDB();

    const body = await request.json();
    const { caseId } = body as { caseId: string };

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const caseDoc = await Case.findById(caseId)
      .populate("citizen", "name email")
      .populate("socialWorker", "name email");

    if (!caseDoc) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Determine location from case or social worker — fall back to empty if missing
    const swUser = caseDoc.socialWorker as unknown as { _id: string } | null;
    let district = "";
    if (swUser) {
      const sw = await User.findById(swUser._id).lean();
      district = sw?.litigationProfile?.location?.district ?? "";
    }

    // Step 1: Filter litigation members by role, isActive=true, matching district
    const filter: Record<string, unknown> = { role: "litigation", isActive: true };
    if (district) filter["litigationProfile.location.district"] = district;

    const candidates = await User.find(filter)
      .sort({ "litigationProfile.activeCaseCount": 1 })
      .lean();

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No active litigation members found for this district" },
        { status: 409 }
      );
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

    // Step 3: Assign and increment activeCaseCount
    await Promise.all([
      Case.updateOne({ _id: caseId }, { litigationMember: assignedUser._id }),
      User.updateOne(
        { _id: assignedUser._id },
        { $inc: { "litigationProfile.activeCaseCount": 1 } }
      ),
    ]);

    // Step 4: Create Google Calendar event if hearing date set
    if (hearingDate) {
      try {
        const citizen = caseDoc.citizen as unknown as { email?: string } | null;
        const swDoc = caseDoc.socialWorker as unknown as { email?: string } | null;
        const attendees = [
          assignedUser.email,
          citizen?.email,
          swDoc?.email,
        ].filter(Boolean) as string[];

        const eventId = await createCalendarEvent({
          title: `Hearing: ${caseDoc.caseTitle}`,
          description: `Case #${caseDoc.caseNumber}`,
          startDateTime: new Date(hearingDate),
          attendeeEmails: attendees,
          caseId: String(caseDoc._id),
        });

        await Case.updateOne({ _id: caseId }, { googleCalendarEventId: eventId });
      } catch (calErr) {
        console.error("Calendar event creation error:", calErr);
      }
    }

    const updatedCase = await Case.findById(caseId)
      .populate("litigationMember", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      assignedTo: { id: assignedUser._id, name: assignedUser.name, email: assignedUser.email },
      case: updatedCase,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/cases/assign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
