import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Project from "@/models/Project";
import Expense from "@/models/Expense";
import mongoose from "mongoose";

const SUPERADMIN_ROLES = ["superadmin", "director"]; // director can also see + create for the org

/**
 * GET returns all projects with computed `spent` (sum of paid expenses) and
 * `remaining` (totalBudget - spent). Visible to anyone signed in for transparency,
 * but only superadmin/director can mutate.
 */
export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const [projects, paid] = await Promise.all([
      Project.find({}).sort({ createdAt: -1 }).populate("manager", "name email").lean(),
      Expense.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: "$project", spent: { $sum: "$amount" } } },
      ]),
    ]);
    const spentByProject = new Map(paid.map(p => [String(p._id), p.spent as number]));

    const enriched = projects.map(p => {
      const spent = spentByProject.get(String(p._id)) ?? 0;
      const remaining = Math.max(0, (p.totalBudget ?? 0) - spent);
      return { ...p, spent, remaining };
    });
    return NextResponse.json({ projects: enriched });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/projects", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SUPERADMIN_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only superadmin / director can create projects" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { code, name, description, status, startDate, endDate, totalBudget, managerId, allocations } = body as {
      code: string; name: string; description?: string; status?: string;
      startDate?: string; endDate?: string; totalBudget?: number; managerId?: string;
      allocations?: { source: string; amount: number; receivedAt?: string; notes?: string }[];
    };

    const cleanCode = String(code ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    if (cleanCode.length !== 3) {
      return NextResponse.json({ error: "code must be exactly 3 letters (A–Z)" }, { status: 400 });
    }
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const existing = await Project.findOne({ code: cleanCode });
    if (existing) return NextResponse.json({ error: `Project code ${cleanCode} already exists` }, { status: 409 });

    const project = await Project.create({
      code: cleanCode,
      name: name.trim(),
      description: description?.trim(),
      status: (status as "active" | "completed" | "on_hold") ?? "active",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:   endDate   ? new Date(endDate)   : undefined,
      totalBudget: Math.max(0, Number(totalBudget ?? 0)),
      manager: managerId && mongoose.Types.ObjectId.isValid(managerId) ? managerId : undefined,
      allocations: (allocations ?? []).map(a => ({
        source: a.source,
        amount: Math.max(0, Number(a.amount ?? 0)),
        receivedAt: a.receivedAt ? new Date(a.receivedAt) : undefined,
        notes: a.notes,
      })),
      createdBy: session.id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/projects", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
