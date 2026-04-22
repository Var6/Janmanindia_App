import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import LogisticsTicket, {
  type LogisticsCategory, type LogisticsUrgency,
} from "@/models/LogisticsTicket";

const VALID_CATEGORIES: LogisticsCategory[] = [
  "equipment", "transport", "supplies", "maintenance", "office", "other",
];
const VALID_URGENCY: LogisticsUrgency[] = ["normal", "high", "critical"];

const ADMIN_ROLES = ["administrator", "director", "superadmin"];

/** GET /api/logistics
 *  - administrator/director/superadmin → all tickets (filterable)
 *  - everyone else → tickets they raised
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status");
    const category = searchParams.get("category");
    const district = searchParams.get("district");

    const filter: Record<string, unknown> = {};
    if (status)   filter.status = status;
    if (category) filter.category = category;
    if (district) filter.district = district;

    const isAdmin = ADMIN_ROLES.includes(session.role);
    if (!isAdmin) {
      if (!mongoose.Types.ObjectId.isValid(session.id)) {
        return NextResponse.json({ tickets: [] });
      }
      filter.raisedBy = new mongoose.Types.ObjectId(session.id);
    }

    const tickets = await LogisticsTicket.find(filter)
      .sort({ urgency: -1, createdAt: -1 })
      .populate("raisedBy",   "name role employeeId email")
      .populate("assignedTo", "name role")
      .lean();

    return NextResponse.json({ tickets });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/logistics — anyone authenticated can raise. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session — re-login" }, { status: 400 });
    }

    const body = await req.json();
    const { category, urgency, title, description, beneficiary, district, location } = body as {
      category?: LogisticsCategory; urgency?: LogisticsUrgency;
      title?: string; description?: string;
      beneficiary?: string; district?: string; location?: string;
    };

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Valid category required" }, { status: 400 });
    }
    if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 });

    const u: LogisticsUrgency = (urgency && VALID_URGENCY.includes(urgency)) ? urgency : "normal";

    await connectDB();
    const ticket = await LogisticsTicket.create({
      raisedBy: new mongoose.Types.ObjectId(session.id),
      category,
      urgency: u,
      title: title.trim(),
      description: description.trim(),
      beneficiary: beneficiary?.trim(),
      district: district?.trim(),
      location: location?.trim(),
      status: "open",
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("logistics create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
