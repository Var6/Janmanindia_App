import { NextResponse } from "next/server";
import { viewerRoute } from "@/lib/insights/api";
import { isAdmin, staffDirectory } from "@/lib/insights/access";

/** GET — active staff, for sharing, alert recipients and @mentions.
 *  Names and roles only; email addresses stay on the server. */
export async function GET() {
  return viewerRoute("GET /api/insights/people", async (session) => {
    const people = await staffDirectory();
    return NextResponse.json({
      people: people.map(({ _id, name, role }) => ({ _id, name, role })),
      canShare: isAdmin(session),
    });
  });
}
