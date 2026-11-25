import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { viewerRoute, readJson, str, oid, notFound, BadRequest } from "@/lib/insights/api";
import { canSee, VIEWER_ROLES } from "@/lib/insights/access";
import InsightReport from "@/models/InsightReport";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { appUrl, escapeHtml, mailHtml, sendMail } from "@/lib/mailer";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST { text, tileId?, mentions?: userIds[] } — comment on the report or on
 * one tile in it. Anyone who can open the report can comment. Each person
 * @mentioned (whose "@Name" is still in the text) gets a notification and,
 * if email is set up, an email, and is given access to the report.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  return viewerRoute("POST /api/insights/reports/[id]/comments", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r || !canSee(r, session)) return notFound();
    const body = await readJson(req);
    const text = str(body.text, 2000);
    if (!text) throw new BadRequest("Comment text is required");

    const ids = Array.isArray(body.mentions) ? [...new Set(body.mentions.map(String))].filter((i) => mongoose.Types.ObjectId.isValid(i)).slice(0, 20) : [];
    const people = ids.length
      ? (await User.find({ _id: { $in: ids }, role: { $in: VIEWER_ROLES }, isActive: true }).select("name email").lean())
          .filter((p) => text.includes(`@${p.name}`) && String(p._id) !== session.id)
      : [];

    r.comments.push({
      text, tileId: str(body.tileId, 60), by: oid(session.id), byName: session.name, at: new Date(),
      mentions: people.length ? people.map((p) => p._id as mongoose.Types.ObjectId) : undefined,
    });
    const have = new Set(r.sharedWith.map(String));
    for (const p of people) if (!have.has(String(p._id))) r.sharedWith.push(p._id as mongoose.Types.ObjectId);
    await r.save();

    if (people.length) {
      const link = `/insights/reports/${r._id}`;
      await Notification.insertMany(people.map((p) => ({
        recipient: p._id, type: "insights_mention", title: `${session.name} mentioned you on a report`,
        body: `${r.title}: ${text.slice(0, 200)}`, link, meta: { reportId: String(r._id) },
      })));
      await sendMail({
        to: people.map((p) => p.email).filter((e): e is string => !!e),
        subject: `${session.name} mentioned you on "${r.title}"`,
        text: `${session.name} wrote on the report "${r.title}":\n\n${text}\n\nReply in the Janman app: ${appUrl(link)}`,
        html: mailHtml(r.title, `<p style="margin:0 0 8px;color:#57534e">${escapeHtml(session.name)} mentioned you:</p><p style="margin:0;padding:12px;background:#fafaf9;border-radius:8px;line-height:1.5">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`, { href: appUrl(link), label: "Reply in the app" }),
      });
    }
    return NextResponse.json({ ok: true, mentioned: people.map((p) => p.name) }, { status: 201 });
  });
}

/** DELETE ?commentId= — the author (or a superadmin) removes a comment. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return viewerRoute("DELETE /api/insights/reports/[id]/comments", async (session) => {
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r || !canSee(r, session)) return notFound();
    const id = req.nextUrl.searchParams.get("commentId") ?? "";
    const c = r.comments.find((x) => String(x._id) === id);
    if (!c) return notFound();
    if (String(c.by) !== session.id && session.role !== "superadmin") {
      return NextResponse.json({ error: "Only the person who wrote it can delete this comment" }, { status: 403 });
    }
    r.comments = r.comments.filter((x) => String(x._id) !== id);
    await r.save();
    return NextResponse.json({ ok: true });
  });
}
