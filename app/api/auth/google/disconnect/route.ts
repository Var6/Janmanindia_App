import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

/** POST /api/auth/google/disconnect — clears the user's Google tokens. */
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  await User.updateOne(
    { _id: session.id },
    { $unset: { googleRefreshToken: "", googleEmail: "", googleConnectedAt: "" } }
  );
  return NextResponse.json({ ok: true });
}
