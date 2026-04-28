import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import User, { type Role } from "@/models/User";

const ASSIGNABLE_ROLES: Role[] = [
  "community",
  "socialworker",
  "litigation",
  "hr",
  "finance",
  "administrator",
  "director",
  "superadmin",
];

/** POST /api/users/set-role — promote a pending Google sign-in (or any user)
 *  to a specific role. Director / superadmin only.
 *  Accepts the id+role from a form-encoded POST so we can submit straight from
 *  the users page without JS. */
export async function POST(req: NextRequest) {
  try {
    await requireRole("director", "superadmin");
    await connectDB();

    let id: string | null = null;
    let role: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      id = typeof body.id === "string" ? body.id : null;
      role = typeof body.role === "string" ? body.role : null;
    } else {
      // form-encoded fallback (used by the no-JS form submit on the users page)
      const fd = await req.formData();
      id = String(fd.get("id") ?? "") || null;
      role = String(fd.get("role") ?? "") || null;
    }

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!role || !ASSIGNABLE_ROLES.includes(role as Role)) {
      return NextResponse.json(
        { error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Default community-profile shape so verification queue picks them up.
    const update: Record<string, unknown> = { role };
    if (role === "community") {
      update["communityProfile.verificationStatus"] = "pending";
    }

    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ ok: true, role: user.role });
    }
    const referer = req.headers.get("referer") ?? "/director/users";
    return NextResponse.redirect(referer, { status: 303 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("/api/users/set-role failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
