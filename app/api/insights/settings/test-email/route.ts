import { NextResponse } from "next/server";
import { insightsRoute } from "@/lib/insights/api";
import { appUrl, mailHtml, sendMailChecked } from "@/lib/mailer";
import User from "@/models/User";

/** POST — send a test email to the signed-in director, and say exactly what
 *  the mail server answered if it fails. */
export async function POST() {
  return insightsRoute("POST /api/insights/settings/test-email", async (session) => {
    const me = await User.findById(session.id).select("email").lean();
    const to = String(me?.email ?? "");
    const error = await sendMailChecked(
      to,
      "Test email from Janman Insights",
      `This is a test. If you are reading it, email from Janman Insights works.\n\n${appUrl("/director/insights/settings")}`,
      mailHtml("Test email", `<p style="font-size:15px;line-height:1.5">If you are reading this, email from Janman Insights works.</p>`, { href: appUrl("/director/insights/settings"), label: "Back to Settings" }),
    );
    return error ? NextResponse.json({ error }, { status: 502 }) : NextResponse.json({ ok: true, to });
  });
}
