import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Grievance, { type GrievanceStatus } from "@/models/Grievance";

const VALID_STATUSES: GrievanceStatus[] = ["open", "in_review", "responded", "closed"];

/** PATCH /api/grievances/[id] — HR responds and/or updates status. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hr", "director", "superadmin");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { hrResponse, status } = body as { hrResponse?: string; status?: GrievanceStatus };

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();
    const grievance = await Grievance.findById(id);
    if (!grievance) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (hrResponse?.trim()) {
      grievance.hrResponse = hrResponse.trim();
      grievance.respondedBy = new mongoose.Types.ObjectId(session.id);
      grievance.respondedAt = new Date();
      if (!status) grievance.status = "responded";
    }
    if (status) {
      grievance.status = status;
      if (status === "closed") grievance.closedAt = new Date();
    }
    await grievance.save();

    return NextResponse.json({ grievance });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("grievance update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
