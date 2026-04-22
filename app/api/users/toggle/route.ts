import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User from "@/models/User";
import Asset from "@/models/Asset";

/** POST /api/users/toggle?id=...&active=true|false — activate/deactivate.
 *  When deactivating, blocks if employee still has assets in 'assigned' status. */
export async function POST(request: NextRequest) {
  try {
    await requireRole("hr", "director", "superadmin");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const active = searchParams.get("active") === "true";

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    if (!active) {
      const outstanding = await Asset.countDocuments({ employee: id, status: "assigned" });
      if (outstanding > 0) {
        return NextResponse.json({
          error: `Cannot offboard — ${outstanding} asset(s) still assigned. Mark them returned/lost/damaged first.`,
        }, { status: 409 });
      }
    }

    const update: Record<string, unknown> = { isActive: active };
    if (!active) update.exitedAt = new Date();
    else update.$unset = { exitedAt: "" };

    await User.findByIdAndUpdate(id, update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("toggle user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
