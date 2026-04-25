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
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const skip = Number(searchParams.get("skip") ?? "0");

    // Build filter based on role
    const filter: Record<string, unknown> = {};

    if (session.role === "community") {
      filter.community = session.id;
    } else if (session.role === "litigation") {
      filter.litigationMember = session.id;
    } else if (session.role === "socialworker") {
      filter.socialWorker = session.id;
    }
    // admin / superadmin see all

    if (status) filter.status = status;
    if (path) filter.path = path;

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

    // Only user or admin/superadmin can create cases
    if (!["community", "director", "superadmin", "socialworker"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { caseTitle, path: rawPath, caseType, communityId } = body as {
      caseTitle: string;
      path?: "criminal" | "highcourt";
      caseType?: string;
      communityId?: string;
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

    const communityRef = session.role === "community" ? session.id : communityId;
    if (!communityRef) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }

    // Generate unique case number
    const count = await Case.countDocuments({});
    const caseNumber = `JMI-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const newCase = await Case.create({
      caseTitle,
      caseNumber,
      path,
      caseType: caseType?.trim() || undefined,
      community: communityRef,
      status: "Open",
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
