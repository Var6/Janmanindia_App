import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Grievance, { type GrievanceCategory } from "@/models/Grievance";

const VALID_CATEGORIES: GrievanceCategory[] = [
  "harassment","discrimination","workload","compensation",
  "facilities","interpersonal","policy","other",
];

const HR_ROLES = ["hr", "director", "superadmin"];

/** GET /api/grievances
 *  - HR/director/superadmin → all grievances
 *  - everyone else      → their own grievances
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const isHr = HR_ROLES.includes(session.role);
    if (!isHr) {
      if (!mongoose.Types.ObjectId.isValid(session.id)) {
        return NextResponse.json({ grievances: [] });
      }
      filter.submittedBy = new mongoose.Types.ObjectId(session.id);
    }

    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .populate("submittedBy", "name email role employeeId")
      .populate("respondedBy", "name role")
      .lean();

    // Mask submitter when grievance is anonymous and viewer isn't the submitter
    const masked = grievances.map((g) => {
      const isOwner = String((g.submittedBy as { _id: unknown } | null)?._id) === session.id;
      if (g.anonymous && !isOwner) {
        return { ...g, submittedBy: null };
      }
      return g;
    });

    return NextResponse.json({ grievances: masked });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/grievances — anyone authenticated can submit. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session — re-login" }, { status: 400 });
    }

    const body = await req.json();
    const { category, subject, description, incidentDate, incidentLocation, involvedPersons, anonymous } = body as {
      category?: GrievanceCategory; subject?: string; description?: string;
      incidentDate?: string; incidentLocation?: string; involvedPersons?: string;
      anonymous?: boolean;
    };

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Valid category required" }, { status: 400 });
    }
    if (!subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

    await connectDB();
    const grievance = await Grievance.create({
      submittedBy: new mongoose.Types.ObjectId(session.id),
      anonymous: !!anonymous,
      category,
      subject: subject.trim(),
      description: description.trim(),
      incidentDate: incidentDate ? new Date(incidentDate) : undefined,
      incidentLocation: incidentLocation?.trim(),
      involvedPersons: involvedPersons?.trim(),
      status: "open",
    });

    return NextResponse.json({ grievance }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("grievance submit error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
