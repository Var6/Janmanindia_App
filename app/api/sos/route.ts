import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole, requireSession } from "@/lib/auth";
import SosAlert, { type SosStage } from "@/models/SosAlert";
import User from "@/models/User";

/** A PLV is a community member whose volunteer request has been approved. They
 *  log in as `community` but get the first tier of the SOS ladder. */
async function isApprovedPlv(userId: string): Promise<boolean> {
  const u = await User.findById(userId).select("plvStatus").lean();
  return (u as { plvStatus?: string } | null)?.plvStatus === "approved";
}

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("community");
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

    // Every fresh SOS starts at the PLV tier.
    const alert = await SosAlert.create({
      raisedBy: session.id,
      location,
      description,
      mediaUrls: mediaUrls ?? [],
      status: "open",
      stage: "plv",
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/sos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    let filter: Record<string, unknown>;

    if (session.role === "community") {
      if (await isApprovedPlv(session.id)) {
        // PLV inbox — fresh alerts awaiting a first responder, plus anything
        // they personally escalated (so they can track it).
        filter = { $or: [{ stage: "plv", status: { $ne: "resolved" } }, { escalatedBy: oid(session.id) }] };
      } else {
        // Basic community member — only their own alerts.
        filter = { raisedBy: session.id };
      }
    } else if (session.role === "socialworker") {
      // SW tier — explicit socialworker stage + legacy alerts that predate the
      // stage field (treated as already at the SW tier).
      filter = {
        status: { $in: ["open", "escalated"] },
        $or: [{ stage: "socialworker" }, { stage: { $exists: false } }, { stage: null }],
      };
    } else if (session.role === "litigation") {
      filter = { stage: "litigation", status: { $ne: "resolved" } };
    } else if (["director", "superadmin"].includes(session.role)) {
      filter = {};
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alerts = await SosAlert.find(filter)
      .sort({ createdAt: -1 })
      .populate("raisedBy", "name phone")
      .lean();

    return NextResponse.json({ alerts });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/sos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const NEXT_STAGE: Record<SosStage, SosStage> = {
  plv: "socialworker",
  socialworker: "litigation",
  litigation: "litigation", // terminal responder tier
  resolved: "resolved",
};

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { alertId, action, assignedTo } = body as {
      alertId?: string;
      action?: "escalate" | "resolve";
      assignedTo?: string;
    };

    if (!alertId || !action) {
      return NextResponse.json({ error: "alertId and action are required" }, { status: 400 });
    }

    const alert = await SosAlert.findById(alertId);
    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    // Normalise legacy alerts (no stage) to the SW tier.
    const current: SosStage = (alert.stage as SosStage) ?? "socialworker";

    // Who may act on this tier?
    const role = session.role;
    const isPriv = role === "director" || role === "superadmin";
    let mayAct = isPriv;
    if (!mayAct) {
      if (current === "plv") mayAct = role === "community" && (await isApprovedPlv(session.id));
      else if (current === "socialworker") mayAct = role === "socialworker";
      else if (current === "litigation") mayAct = role === "litigation";
    }
    if (!mayAct) {
      return NextResponse.json({ error: "You can't act on this alert at its current stage." }, { status: 403 });
    }

    if (action === "resolve") {
      alert.status = "resolved";
      alert.stage = "resolved";
      await alert.save();
      return NextResponse.json({ alert: alert.toObject() });
    }

    // escalate — advance one tier down the ladder.
    if (current === "litigation") {
      return NextResponse.json({ error: "Already with the litigation team — resolve it instead." }, { status: 400 });
    }
    const toStage = NEXT_STAGE[current];
    const now = new Date();
    alert.stage = toStage;
    alert.status = "escalated";
    alert.escalatedBy = oid(session.id);
    alert.escalatedAt = now;
    (alert.escalations ??= []).push({ by: oid(session.id), fromStage: current, toStage, at: now });
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) alert.assignedTo = oid(assignedTo);
    await alert.save();

    return NextResponse.json({ alert: alert.toObject() });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/sos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
