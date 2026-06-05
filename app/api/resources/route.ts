import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Resource from "@/models/Resource";

// Who may add / edit / remove resource entries.
const MANAGE_ROLES = ["director", "superadmin", "administrator", "socialworker"];

function canManage(role: string) {
  return MANAGE_ROLES.includes(role);
}

/** GET /api/resources?kind=scheme|livelihood — list resources. Everyone signed
 *  in sees active entries; managers also see inactive ones. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();
    const kind = request.nextUrl.searchParams.get("kind");
    const filter: Record<string, unknown> = {};
    if (kind === "scheme" || kind === "livelihood") filter.kind = kind;
    if (!canManage(session.role)) filter.isActive = true;

    const resources = await Resource.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ resources, canManage: canManage(session.role) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/resources", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManage(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await connectDB();

    const b = await request.json();
    if (!["scheme", "livelihood"].includes(b.kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    if (!b.title?.trim() || !b.description?.trim()) return NextResponse.json({ error: "title and description are required" }, { status: 400 });

    const resource = await Resource.create({
      kind: b.kind,
      title: String(b.title).trim(),
      description: String(b.description).trim(),
      category: b.category?.trim(),
      eligibility: b.eligibility?.trim(),
      benefit: b.benefit?.trim(),
      howToApply: b.howToApply?.trim(),
      link: b.link?.trim(),
      contactPhone: b.contactPhone?.trim(),
      createdBy: session.id,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/resources", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManage(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await connectDB();

    const b = await request.json();
    if (!b.id || !mongoose.Types.ObjectId.isValid(b.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const resource = await Resource.findById(b.id);
    if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

    for (const f of ["title", "description", "category", "eligibility", "benefit", "howToApply", "link", "contactPhone"] as const) {
      if (typeof b[f] === "string") resource[f] = b[f].trim();
    }
    if (typeof b.isActive === "boolean") resource.isActive = b.isActive;
    await resource.save();
    return NextResponse.json({ resource });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/resources", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!["director", "superadmin"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await connectDB();
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await Resource.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/resources", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
