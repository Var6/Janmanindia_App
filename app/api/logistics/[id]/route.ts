import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import LogisticsTicket, { type LogisticsStatus } from "@/models/LogisticsTicket";

const ADMIN_ROLES = ["administrator", "director", "superadmin"];
const VALID_STATUSES: LogisticsStatus[] = ["open", "in_progress", "fulfilled", "rejected", "closed"];

/** PATCH /api/logistics/[id] — administrator updates status / responds. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(...ADMIN_ROLES);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { status, response, rejectedReason } = body as {
      status?: LogisticsStatus; response?: string; rejectedReason?: string;
    };

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();
    const ticket = await LogisticsTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (response !== undefined) ticket.response = response.trim();
    if (rejectedReason !== undefined) ticket.rejectedReason = rejectedReason.trim();

    if (status) {
      ticket.status = status;
      if (status === "in_progress" && !ticket.assignedTo) {
        ticket.assignedTo = new mongoose.Types.ObjectId(session.id);
      }
      if (status === "fulfilled") ticket.fulfilledAt = new Date();
      if (status === "closed")    ticket.closedAt = new Date();
    }

    await ticket.save();
    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("logistics update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
