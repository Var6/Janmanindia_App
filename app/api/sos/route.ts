import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole, requireSession } from "@/lib/auth";
import SosAlert from "@/models/SosAlert";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("user");
    await connectDB();

    const body = await request.json();
    const { location, description, mediaUrls } = body as {
      location: string;
      description: string;
      mediaUrls?: string[];
    };

    if (!location || !description) {
      return NextResponse.json({ error: "location and description are required" }, { status: 400 });
    }

    const alert = await SosAlert.create({
      raisedBy: session.id,
      location,
      description,
      mediaUrls: mediaUrls ?? [],
      status: "open",
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/sos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (session.role === "user") {
      filter.raisedBy = session.id;
    } else if (session.role === "socialworker") {
      filter.status = "open";
    } else if (!["admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alerts = await SosAlert.find(filter)
      .sort({ createdAt: -1 })
      .populate("raisedBy", "name phone")
      .lean();

    return NextResponse.json({ alerts });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole("socialworker", "admin", "superadmin");
    await connectDB();

    const body = await request.json();
    const { alertId, action, assignedTo } = body as {
      alertId: string;
      action: "escalate" | "resolve";
      assignedTo?: string;
    };

    if (!alertId || !action) {
      return NextResponse.json({ error: "alertId and action are required" }, { status: 400 });
    }

    const alert = await SosAlert.findById(alertId);
    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    if (action === "escalate") {
      await SosAlert.updateOne(
        { _id: alertId },
        {
          status: "escalated",
          escalatedBy: session.id,
          escalatedAt: new Date(),
          ...(assignedTo ? { assignedTo } : {}),
        }
      );
    } else if (action === "resolve") {
      await SosAlert.updateOne({ _id: alertId }, { status: "resolved" });
    }

    const updated = await SosAlert.findById(alertId).lean();
    return NextResponse.json({ alert: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
