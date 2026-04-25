import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Expense from "@/models/Expense";
import Project from "@/models/Project";
import mongoose from "mongoose";

// Roles allowed to submit an expense for org-related spending.
// Administrators handle most office logistics; opening it up to staff means
// social workers / litigation can also flag a cost they've personally incurred.
const SUBMITTER_ROLES = ["administrator", "hr", "director", "superadmin", "socialworker", "litigation", "finance"];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status");
    const project  = searchParams.get("project");
    const mine     = searchParams.get("mine") === "true";

    const filter: Record<string, unknown> = {};
    if (status)  filter.status  = status;
    if (project && mongoose.Types.ObjectId.isValid(project)) filter.project = project;
    if (mine) filter.submittedBy = session.id;

    const expenses = await Expense.find(filter)
      .sort({ submittedAt: -1 })
      .populate("project", "code name totalBudget")
      .populate("submittedBy", "name email role")
      .populate("hrVerification.by", "name")
      .populate("directorApproval.by", "name")
      .populate("payment.by", "name")
      .populate("rejection.by", "name")
      .lean();

    return NextResponse.json({ expenses });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/expenses", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SUBMITTER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Your role can't submit expenses" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { projectId, category, title, description, amount, vendor, receiptUrl, incurredAt } = body as {
      projectId: string;
      category: string;
      title: string;
      description?: string;
      amount: number;
      vendor?: string;
      receiptUrl?: string;
      incurredAt?: string;
    };

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    }
    if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    const allowedCats = ["admin", "training", "exploration", "staff", "travel", "legal", "other"];
    if (!category || !allowedCats.includes(category)) {
      return NextResponse.json({ error: `category must be one of ${allowedCats.join(", ")}` }, { status: 400 });
    }
    const project = await Project.findById(projectId).lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const expense = await Expense.create({
      project: projectId,
      category,
      title: title.trim(),
      description: description?.trim(),
      amount: numericAmount,
      currency: "INR",
      vendor: vendor?.trim(),
      receiptUrl: receiptUrl?.trim(),
      incurredAt: incurredAt ? new Date(incurredAt) : undefined,
      status: "submitted",
      submittedBy: session.id,
      submittedRole: session.role,
      submittedAt: new Date(),
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/expenses", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
