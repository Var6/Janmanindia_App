import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const path = searchParams.get("path");
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const skip = Number(searchParams.get("skip") ?? "0");

    // Build filter based on role
    const filter: Record<string, unknown> = {};

    if (session.role === "community") {
      filter.community = session.id;
    } else if (session.role === "litigation") {
      // Litigation members see cases assigned to them PLUS any existing-case
      // tracker entry (community or staff registered an in-progress case
      // without yet picking a lawyer — those need to be visible so a lawyer
      // can claim them).
      filter.$or = [
        { litigationMember: session.id },
        { isExistingCase: true },
      ];
    } else if (session.role === "socialworker") {
      filter.socialWorker = session.id;
    }
    // admin / superadmin see all

    if (status) filter.status = status;
    if (path) filter.path = path;

    // Free-text search across caseNumber + caseTitle for typeahead pickers.
    // If the role visibility filter already used `$or` (litigation), combine
    // the two sets via `$and` so we don't lose either constraint.
    if (q && q.length >= 1) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      const searchOr = [{ caseNumber: re }, { caseTitle: re }];
      if (Array.isArray(filter.$or)) {
        const visibilityOr = filter.$or as Record<string, unknown>[];
        delete filter.$or;
        filter.$and = [{ $or: visibilityOr }, { $or: searchOr }];
      } else {
        filter.$or = searchOr;
      }
    }

    const [cases, total] = await Promise.all([
      Case.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("community", "name email")
        .populate("litigationMember", "name")
        .populate("socialWorker", "name")
        .lean(),
      Case.countDocuments(filter),
    ]);

    return NextResponse.json({ cases, total, limit, skip });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/cases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    // Cases can be authored by anyone *except* HR (HR doesn't deal in
    // legal matters) and there's no role gate to block tracking. Community
    // members can register existing cases for tracking; staff create or
    // import cases for community members.
    if (session.role === "hr") {
      return NextResponse.json({ error: "HR can't create cases" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { caseTitle, path: rawPath, caseType, communityId,
            status, isExistingCase, currentStep, existingNotes } = body as {
      caseTitle: string;
      path?: "criminal" | "highcourt";
      caseType?: string;
      communityId?: string;
      status?: "Open" | "Closed" | "Escalated" | "Pending" | "Dismissed";
      /** Set true when registering a case that's already underway elsewhere
       *  — the workflow stages all default to "not done" but the case shows
       *  with an "Existing" badge and lands in the litigation visibility
       *  queue regardless of explicit assignment. */
      isExistingCase?: boolean;
      currentStep?: string;
      existingNotes?: string;
    };

    if (!caseTitle) {
      return NextResponse.json({ error: "caseTitle is required" }, { status: 400 });
    }

    // Resolve workflow path: explicit `path` wins; otherwise derive from caseType
    let path: "criminal" | "highcourt" | undefined = rawPath;
    if (!path && caseType) {
      const { lookupCaseType } = await import("@/lib/case-types");
      path = lookupCaseType(caseType)?.path;
    }
    if (!path) {
      return NextResponse.json({ error: "Either path or a recognised caseType is required" }, { status: 400 });
    }
    if (!["criminal", "highcourt"].includes(path)) {
      return NextResponse.json({ error: "path must be criminal or highcourt" }, { status: 400 });
    }

    // Community members can only file under their own name; staff can pick
    // any community member they're authoring for.
    const communityRef = session.role === "community" ? session.id : communityId;
    if (!communityRef) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }

    const ALLOWED_STATUSES = ["Open", "Closed", "Escalated", "Pending", "Dismissed"] as const;
    const initialStatus = (status && ALLOWED_STATUSES.includes(status))
      ? status
      : "Open";

    // Community-authored cases default to "existing" since the tracker UI is
    // explicitly for in-progress matters. Staff can set the flag explicitly.
    const flaggedExisting = Boolean(isExistingCase) || session.role === "community";

    // Generate unique case number
    const count = await Case.countDocuments({});
    const caseNumber = `JMI-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const newCase = await Case.create({
      caseTitle,
      caseNumber,
      path,
      caseType: caseType?.trim() || undefined,
      community: communityRef,
      // Litigation lawyers who file their own cases get auto-assigned so the case
      // shows up in their list and they can update it without a separate hand-off.
      ...(session.role === "litigation" ? { litigationMember: session.id } : {}),
      status: initialStatus,
      isExistingCase: flaggedExisting,
      currentStep:    currentStep?.trim() || undefined,
      existingNotes:  existingNotes?.trim() || undefined,
      documents: [],
      caseDiary: [],
      ...(path === "criminal"
        ? {
            criminalPath: {
              firFiled: false,
              chargesheetFiled: false,
              chargesheetAlertSent: false,
              chargesFramed: false,
              chargeDocs: [],
              trial: {
                prosecutionWitnesses: [],
                defenseWitnesses: [],
                evidenceDocs: [],
                forensicDocs: [],
              },
            },
          }
        : {
            highCourtPath: {
              petitionFiled: { filed: false },
              supportingAffidavit: { filed: false },
              admission: { filed: false },
              counterAffidavit: { filed: false },
              rejoinder: { filed: false },
              pleaClose: { filed: false },
              inducement: { filed: false },
            },
          }),
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/cases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
