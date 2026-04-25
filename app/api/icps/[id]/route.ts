import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Icp from "@/models/Icp";
import mongoose from "mongoose";

const SW_ROLES = ["socialworker", "director", "superadmin"];

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!SW_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only social workers can edit an ICP" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const body = await request.json();
    // Block immutable identifiers
    delete body._id; delete body.case; delete body.community; delete body.interviewer;
    delete body.createdAt; delete body.updatedAt; delete body.__v;

    if (body.status === "complete" && !body.finalisedAt) body.finalisedAt = new Date();

    const icp = await Icp.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });
    if (!icp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ icp });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/icps/[id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
