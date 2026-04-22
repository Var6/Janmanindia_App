import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Activity, { type ActivityCategory, type ActivityPriority } from "@/models/Activity";

const VALID_CATEGORIES: ActivityCategory[] = [
  "fieldwork", "meeting", "court", "training", "documentation",
  "outreach", "research", "admin", "other",
];
const VALID_PRIORITIES: ActivityPriority[] = ["low", "medium", "high"];

const ASSIGN_ROLES = ["director", "superadmin", "administrator", "hr"];

/** GET /api/activities?assignee=<id|me>&status=...
 *  Default scope: own activities (assignee = self) + activities you created. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community") {
      return NextResponse.json({ error: "Activities are staff-only" }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    const assigneeParam = searchParams.get("assignee");
    const statusParam = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    const isPrivileged = ASSIGN_ROLES.includes(session.role);

    if (assigneeParam && assigneeParam !== "me") {
      if (!isPrivileged) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (mongoose.Types.ObjectId.isValid(assigneeParam)) {
        filter.assignee = new mongoose.Types.ObjectId(assigneeParam);
      }
    } else if (mongoose.Types.ObjectId.isValid(session.id)) {
      const me = new mongoose.Types.ObjectId(session.id);
      filter.$or = [{ assignee: me }, { createdBy: me }];
    } else {
      return NextResponse.json({ activities: [] });
    }

    if (statusParam) filter.status = statusParam;

    const activities = await Activity.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .populate("assignee",  "name role employeeId")
      .populate("createdBy", "name role")
      .lean();

    return NextResponse.json({ activities });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/activities — create. Anyone can create for themselves;
 *  director/superadmin/administrator/hr can assign to others. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community") {
      return NextResponse.json({ error: "Activities are staff-only" }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session — re-login" }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, category, priority, assignee, dueDate } = body as {
      title?: string; description?: string;
      category?: ActivityCategory; priority?: ActivityPriority;
      assignee?: string; dueDate?: string;
    };

    if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const cat: ActivityCategory = (category && VALID_CATEGORIES.includes(category)) ? category : "other";
    const pri: ActivityPriority = (priority && VALID_PRIORITIES.includes(priority)) ? priority : "medium";

    const isPrivileged = ASSIGN_ROLES.includes(session.role);
    let assigneeId = new mongoose.Types.ObjectId(session.id);
    if (assignee && assignee !== session.id) {
      if (!isPrivileged) {
        return NextResponse.json({ error: "Only director/administrator/hr can assign to others" }, { status: 403 });
      }
      if (!mongoose.Types.ObjectId.isValid(assignee)) {
        return NextResponse.json({ error: "Invalid assignee id" }, { status: 400 });
      }
      assigneeId = new mongoose.Types.ObjectId(assignee);
    }

    await connectDB();
    const activity = await Activity.create({
      title: title.trim(),
      description: description?.trim(),
      category: cat,
      priority: pri,
      status: "planned",
      assignee: assigneeId,
      createdBy: new mongoose.Types.ObjectId(session.id),
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("activity create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
