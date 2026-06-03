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
    // Optional: the full set of EXTRA roles a user may act as (multi-position).
    // When present, sets the `roles` array; `role` (primary) may be omitted.
    let rolesInput: string[] | null = null;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      id = typeof body.id === "string" ? body.id : null;
      role = typeof body.role === "string" ? body.role : null;
      rolesInput = Array.isArray(body.roles) ? body.roles.map(String) : null;
    } else {
      // form-encoded fallback (used by the no-JS form submit on the users page)
      const fd = await req.formData();
      id = String(fd.get("id") ?? "") || null;
      role = String(fd.get("role") ?? "") || null;
    }

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!role && !rolesInput) {
      return NextResponse.json({ error: "role or roles is required" }, { status: 400 });
    }
    if (role && !ASSIGNABLE_ROLES.includes(role as Role)) {
      return NextResponse.json(
        { error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
    if (rolesInput && rolesInput.some((r) => !ASSIGNABLE_ROLES.includes(r as Role))) {
      return NextResponse.json(
        { error: `roles may only contain: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (role) {
      update.role = role;
      // Default community-profile shape so the verification queue picks them up.
      if (role === "community") update["communityProfile.verificationStatus"] = "pending";
    }
    if (rolesInput) {
      // De-duplicated extra-role set. The active/primary role is always
      // implicitly included by the switcher, so we don't force it in here.
      update.roles = Array.from(new Set(rolesInput));
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
