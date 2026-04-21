import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession, requireRole } from "@/lib/auth";
import Appointment from "@/models/Appointment";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (session.role === "user") {
      filter.citizen = session.id;
    } else if (session.role === "socialworker") {
      filter.socialWorker = session.id;
    } else if (session.role === "litigation") {
      filter.litigationMember = session.id;
    } else if (!["admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointments = await Appointment.find(filter)
      .sort({ proposedDate: 1 })
      .populate("citizen", "name email phone")
      .populate("socialWorker", "name email")
      .populate("litigationMember", "name email")
      .lean();

    return NextResponse.json({ appointments });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("user");
    await connectDB();

    const body = await request.json();
    const { socialWorkerId, proposedDate, reason } = body as {
      socialWorkerId: string;
      proposedDate: string;
      reason: string;
    };

    if (!socialWorkerId || !proposedDate || !reason) {
      return NextResponse.json(
        { error: "socialWorkerId, proposedDate, and reason are required" },
        { status: 400 }
      );
    }

    const appointment = await Appointment.create({
      citizen: session.id,
      socialWorker: socialWorkerId,
      proposedDate: new Date(proposedDate),
      reason,
      status: "pending_sw",
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = await request.json();
    const { appointmentId, action, litigationMemberId, notes } = body as {
      appointmentId: string;
      action: "approve_sw" | "reject_sw" | "confirm_litigation" | "reject_litigation";
      litigationMemberId?: string;
      notes?: string;
    };

    if (!appointmentId || !action) {
      return NextResponse.json({ error: "appointmentId and action are required" }, { status: 400 });
    }

    const apt = await Appointment.findById(appointmentId);
    if (!apt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    if (action === "approve_sw" || action === "reject_sw") {
      if (session.role !== "socialworker") {
        return NextResponse.json({ error: "Only social workers can approve/reject at this stage" }, { status: 403 });
      }
      if (String(apt.socialWorker) !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await Appointment.updateOne(
        { _id: appointmentId },
        {
          status: action === "approve_sw" ? "approved_sw" : "rejected",
          ...(litigationMemberId ? { litigationMember: litigationMemberId } : {}),
          swNotes: notes,
        }
      );
    } else if (action === "confirm_litigation" || action === "reject_litigation") {
      if (session.role !== "litigation") {
        return NextResponse.json({ error: "Only litigation members can confirm/reject at this stage" }, { status: 403 });
      }
      if (String(apt.litigationMember) !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await Appointment.updateOne(
        { _id: appointmentId },
        {
          status: action === "confirm_litigation" ? "confirmed_litigation" : "rejected",
          litigationNotes: notes,
        }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await Appointment.findById(appointmentId).lean();
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
