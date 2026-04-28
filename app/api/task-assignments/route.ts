import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import TaskAssignment from "@/models/TaskAssignment";

/** GET /api/task-assignments?limit=50&assignedBy=<id>
 *  Returns assignment history for the admin dashboard. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("administrator", "director", "superadmin", "hr");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const assignedByParam = searchParams.get("assignedBy");

    const filter: Record<string, unknown> = {};
    if (assignedByParam) filter.assignedBy = assignedByParam;

    const records = await TaskAssignment.find(filter)
      .sort({ assignedAt: -1 })
      .limit(limitParam)
      .populate("activity",         "title status priority category dueDate")
      .populate("assignedTo",       "name role employeeId avatarUrl")
      .populate("assignedBy",       "name role")
      .populate("previousAssignee", "name role")
      .lean();

    return NextResponse.json({ records });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
