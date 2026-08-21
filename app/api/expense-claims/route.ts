import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import ExpenseClaim from "@/models/ExpenseClaim";
import Project from "@/models/Project";
import User from "@/models/User";
import mongoose from "mongoose";

// Same submitter group as single expenses — any staff member can file a claim.
const SUBMITTER_ROLES = ["administrator", "hr", "director", "superadmin", "socialworker", "litigation", "finance"];
const LIST_VIEWER_ROLES = ["director", "superadmin", "administrator", "hr", "finance"];
const DESIGNATIONS = ["volunteer", "consultant", "director"];

type IncomingLine = {
  incurredAt?: string;
  vendor?: string;
  head?: string;
  amount?: number | string;
  receiptUrls?: string[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mine  = searchParams.get("mine") === "true";
    const queue = searchParams.get("queue"); // "approver" | "finance"
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (mine) {
      filter.submittedBy = session.id;
    } else if (queue === "approver") {
      // Claims routed to the current user as the chosen approving director.
      filter.approver = session.id;
    } else if (queue === "finance") {
      if (!["finance", "director", "superadmin"].includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      filter.status = status ?? "approved";
    } else {
      // Org-wide list — finance-viewer group only (privacy).
      if (!LIST_VIEWER_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    if (status && !filter.status) filter.status = status;

    const claims = await ExpenseClaim.find(filter)
      .sort({ submittedAt: -1 })
      .populate("project", "code name")
      .populate("approver", "name role")
      .populate("submittedBy", "name email role")
      .populate("approval.by", "name")
      .populate("payment.by", "name")
      .populate("rejection.by", "name")
      .lean();

    return NextResponse.json({ claims });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/expense-claims", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!SUBMITTER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Your role can't file an expenditure application" }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const {
      designation, applicationDate, projectId, projectOther,
      approverId, approverOther, lineItems,
    } = body as {
      designation?: string;
      applicationDate?: string;
      projectId?: string;
      projectOther?: string;
      approverId?: string;
      approverOther?: string;
      lineItems?: IncomingLine[];
    };

    if (!designation || !DESIGNATIONS.includes(designation)) {
      return NextResponse.json({ error: `designation must be one of ${DESIGNATIONS.join(", ")}` }, { status: 400 });
    }

    // Project: a real project id OR a free-text "Other" — need one.
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    if (!projectId && !projectOther?.trim()) {
      return NextResponse.json({ error: "A project is required" }, { status: 400 });
    }
    if (projectId) {
      const project = await Project.findById(projectId).select("_id").lean();
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Approver: a real director user id OR a free-text "Other" — need one.
    if (approverId && !mongoose.Types.ObjectId.isValid(approverId)) {
      return NextResponse.json({ error: "Invalid approverId" }, { status: 400 });
    }
    if (!approverId && !approverOther?.trim()) {
      return NextResponse.json({ error: "Choose who should approve this claim" }, { status: 400 });
    }
    if (approverId) {
      const approver = await User.findById(approverId).select("_id role").lean();
      if (!approver) return NextResponse.json({ error: "Approver not found" }, { status: 404 });
      if (!["director", "superadmin"].includes((approver as { role?: string }).role ?? "")) {
        return NextResponse.json({ error: "The chosen approver must be a director" }, { status: 400 });
      }
    }

    // Line items — at least one, each with a head and positive amount.
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "Add at least one expense line" }, { status: 400 });
    }
    const cleanLines = [];
    for (const [i, raw] of lineItems.entries()) {
      const head = String(raw.head ?? "").trim();
      const amount = Number(raw.amount);
      if (!head) return NextResponse.json({ error: `Line ${i + 1}: head is required` }, { status: 400 });
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: `Line ${i + 1}: amount must be a positive number` }, { status: 400 });
      }
      const receiptUrls = Array.isArray(raw.receiptUrls)
        ? raw.receiptUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 10)
        : [];
      cleanLines.push({
        head,
        amount,
        vendor: raw.vendor?.trim() || undefined,
        incurredAt: raw.incurredAt ? new Date(raw.incurredAt) : undefined,
        receiptUrls,
      });
    }
    const totalAmount = cleanLines.reduce((s, l) => s + l.amount, 0);

    const claim = await ExpenseClaim.create({
      applicantName: session.name,
      submittedBy: session.id,
      submittedRole: session.role,
      designation,
      applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
      project: projectId || undefined,
      projectOther: projectId ? undefined : projectOther?.trim(),
      approver: approverId || undefined,
      approverOther: approverId ? undefined : approverOther?.trim(),
      lineItems: cleanLines,
      totalAmount,
      currency: "INR",
      status: "submitted",
      submittedAt: new Date(),
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/expense-claims", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
