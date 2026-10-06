import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole, type JWTPayload } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { InsightQueryError } from "@/lib/insights/query";

/** Roles that can use Insights. Everything in the module is behind this. */
export const INSIGHTS_ROLES = ["director", "superadmin"];

/**
 * Wraps an Insights route handler: checks the session role, connects to the
 * database, and turns thrown errors into JSON responses (a bad query spec is
 * a 400, not a 500).
 */
export async function insightsRoute(
  label: string,
  handler: (session: JWTPayload) => Promise<Response>,
): Promise<Response> {
  try {
    const session = await requireRole(...INSIGHTS_ROLES);
    await connectDB();
    return await handler(session);
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof InsightQueryError || e instanceof BadRequest) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error(label, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export class BadRequest extends Error {}

export function oid(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid id");
  return new mongoose.Types.ObjectId(id);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequest("Body must be JSON");
  }
}

export function str(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

export function num(v: unknown): number | undefined {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
