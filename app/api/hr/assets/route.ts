import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Asset, { type AssetType } from "@/models/Asset";

const VALID_TYPES: AssetType[] = [
  "laptop","phone","sim","vehicle","id_card","email_account","uniform","stationery","key","other",
];

/** GET /api/hr/assets?employee=<id>&status=assigned — list assets, filtered. */
export async function GET(request: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    await connectDB();

    const { searchParams } = new URL(request.url);
    const employee = searchParams.get("employee");
    const status   = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (employee && mongoose.Types.ObjectId.isValid(employee)) filter.employee = employee;
    if (status) filter.status = status;

    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .populate("employee", "name email role employeeId")
      .populate("assignedBy", "name")
      .populate("returnedBy", "name")
      .lean();
    return NextResponse.json({ assets });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/hr/assets — assign a new asset to an employee. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("hr", "director", "superadmin");
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session — re-login" }, { status: 400 });
    }

    const body = await req.json();
    const { employee, type, name, identifier, notes } = body as {
      employee?: string; type?: AssetType; name?: string; identifier?: string; notes?: string;
    };

    if (!employee || !mongoose.Types.ObjectId.isValid(employee)) {
      return NextResponse.json({ error: "Valid employee id required" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    await connectDB();
    const asset = await Asset.create({
      employee: new mongoose.Types.ObjectId(employee),
      type, name: name.trim(),
      identifier: identifier?.trim(),
      notes: notes?.trim(),
      status: "assigned",
      assignedBy: new mongoose.Types.ObjectId(session.id),
      assignedAt: new Date(),
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("asset create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
