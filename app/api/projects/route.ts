import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Project from "@/models/Project";
import Expense from "@/models/Expense";
import Case from "@/models/Case";
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

    const projects = await Project.find({}).sort({ createdAt: -1 }).populate("manager", "name email").lean();

    // Pull every expense that affects fund maths: already-paid (deducted) and
    // director-approved-but-unpaid (money we still OWE). Each is attributed to a
    // project either directly (expense.project) or via its case's project, so
    // case-scoped requisitions/reimbursements draw down the right fund.
    const expenses = await Expense.find({ status: { $in: ["director_approved", "paid"] } })
      .select("project case amount status").lean();

    const caseScoped = [...new Set(expenses.filter((e) => !e.project && e.case).map((e) => String(e.case)))];
    const caseToProject = new Map<string, string>();
    if (caseScoped.length) {
      const cases = await Case.find({ _id: { $in: caseScoped } }).select("project").lean();
      for (const c of cases) if (c.project) caseToProject.set(String(c._id), String(c.project));
    }

    const paid = new Map<string, number>();
    const owed = new Map<string, number>();
    for (const e of expenses) {
      const pid = e.project ? String(e.project) : (e.case ? caseToProject.get(String(e.case)) : undefined);
      if (!pid) continue;
      const amt = e.amount ?? 0;
      if (e.status === "paid") paid.set(pid, (paid.get(pid) ?? 0) + amt);
      else owed.set(pid, (owed.get(pid) ?? 0) + amt); // director_approved → still to be paid
    }

    const enriched = projects.map((p) => {
      const id = String(p._id);
      const spent = paid.get(id) ?? 0;
      const owedAmt = owed.get(id) ?? 0;
      // Director approval COMMITS the money: remaining drops as soon as an
      // expense is approved (owed), not only when it's eventually paid out —
      // so every fund view agrees with the approval queue.
      const remaining = Math.max(0, (p.totalBudget ?? 0) - spent - owedAmt);
      return { ...p, spent, owed: owedAmt, remaining };
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
    const { code, name, description, status, startDate, endDate, totalBudget, managerId, allocations, phases } = body as {
      code: string; name: string; description?: string; status?: string;
      startDate?: string; endDate?: string; totalBudget?: number; managerId?: string;
      allocations?: { source: string; amount: number; receivedAt?: string; notes?: string }[];
      phases?: { name: string; startDate?: string; endDate?: string; budget?: number; status?: string; objectives?: { label: string; target?: number; current?: number; done?: boolean }[] }[];
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
      phases: (phases ?? []).map(p => ({
        name: String(p.name ?? "").trim(),
        startDate: p.startDate ? new Date(p.startDate) : undefined,
        endDate:   p.endDate   ? new Date(p.endDate)   : undefined,
        budget: p.budget != null ? Math.max(0, Number(p.budget)) : undefined,
        status: ["upcoming", "active", "completed"].includes(p.status as string) ? p.status : "upcoming",
        objectives: (p.objectives ?? []).map(o => ({ label: String(o.label ?? "").trim(), target: o.target, current: o.current ?? 0, done: !!o.done })),
      })).filter(p => p.name),
      createdBy: session.id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/projects", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
