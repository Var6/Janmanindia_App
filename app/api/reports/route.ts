import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Report from "@/models/Report";
import { lookupTemplate, validateAgainstTemplate, REPORT_TEMPLATES } from "@/lib/report-templates";

const PRIVILEGED = ["director", "superadmin", "administrator"];

/** GET /api/reports?template=&mine=  — list reports the caller can see. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community") {
      // Field reports are an internal artefact; community members never need
      // to see them and should never be allowed to enumerate other people's
      // submissions.
      return NextResponse.json({ error: "Reports are staff-only" }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    const template = searchParams.get("template")?.trim();
    const mine     = searchParams.get("mine") === "true";

    const filter: Record<string, unknown> = {};
    if (template) filter.template = template;
    // Privileged roles see everyone's reports. Everyone else sees only their
    // own submissions, regardless of the `mine` flag.
    if (!PRIVILEGED.includes(session.role) || mine) {
      filter.submittedBy = new mongoose.Types.ObjectId(session.id);
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("submittedBy", "name role")
      .lean();

    return NextResponse.json({
      reports,
      templates: REPORT_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/reports", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/reports — submit a new report. Body: `{ template, data }`. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = await request.json() as { template?: string; data?: Record<string, unknown> };
    const tpl = body.template ? lookupTemplate(body.template) : undefined;
    if (!tpl) {
      return NextResponse.json({ error: "Unknown report template." }, { status: 400 });
    }
    if (!tpl.authorRoles.includes(session.role)) {
      return NextResponse.json({ error: `Your role can't submit "${tpl.name}".` }, { status: 403 });
    }

    const validation = validateAgainstTemplate(tpl, body.data ?? {});
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const data = validation.data;

    // Build the cached summary block so the list page doesn't need to crack
    // the data blob open per row.
    const summary: Record<string, unknown> = {};
    if (tpl.summary?.titleField    && typeof data[tpl.summary.titleField]    === "string") summary.title    = data[tpl.summary.titleField];
    if (tpl.summary?.districtField && typeof data[tpl.summary.districtField] === "string") summary.district = data[tpl.summary.districtField];
    if (tpl.summary?.dateField     && typeof data[tpl.summary.dateField]     === "string") summary.eventDate = new Date(data[tpl.summary.dateField] as string);

    const report = await Report.create({
      template:      tpl.id,
      data,
      submittedBy:   session.id,
      submittedRole: session.role,
      summary,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/reports", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
