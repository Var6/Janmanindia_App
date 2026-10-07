import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { insightsRoute, readJson, oid, notFound, BadRequest, str } from "@/lib/insights/api";
import { VIEWER_ROLES } from "@/lib/insights/access";
import InsightReport from "@/models/InsightReport";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { appUrl, escapeHtml, mailEnabled, mailHtml, sendMail } from "@/lib/mailer";
import { formatNumber } from "@/lib/insights/format";
import type { NumberFormat } from "@/lib/insights/types";

type Ctx = { params: Promise<{ id: string }> };

type SnapKpi = { data?: { kind: string; kpi?: { name: string; target: number; numberFormat: string; decimals: number; prefix?: string; suffix?: string }; result?: { latest: number | null; rag: string } } };
const RAG: Record<string, string> = { on_track: "on track", attention: "needs attention", off_track: "off track", no_data: "no data" };
const day = (d: Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * POST { people: userIds[], note? } — email the report to staff. Each person
 * is added to the report's sharing list so the link opens for them. The email
 * carries the period, the summary and the KPI headlines, plus the link; it
 * goes to Janman staff only. For funders, download the PDF and send it.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/reports/[id]/email", async (session) => {
    if (!mailEnabled()) throw new BadRequest("Email is not set up for this app yet (SMTP settings)");
    const r = await InsightReport.findById(oid((await ctx.params).id));
    if (!r) return notFound();
    const body = await readJson(req);
    const ids = Array.isArray(body.people) ? [...new Set(body.people.map(String))].filter((i) => mongoose.Types.ObjectId.isValid(i)) : [];
    if (!ids.length) throw new BadRequest("Choose who to send it to");
    const people = await User.find({ _id: { $in: ids }, role: { $in: VIEWER_ROLES }, isActive: true }).select("name email").lean();
    if (people.length !== ids.length) throw new BadRequest("Reports can only be emailed to active staff");
    const note = str(body.note, 1000);

    const have = new Set(r.sharedWith.map(String));
    for (const p of people) if (!have.has(String(p._id))) r.sharedWith.push(p._id as mongoose.Types.ObjectId);
    await r.save();

    const link = appUrl(`/insights/reports/${r._id}`);
    const tiles = ((r.snapshot as { tabs?: { tiles?: SnapKpi[] }[] })?.tabs ?? []).flatMap((t) => t.tiles ?? []);
    const kpis = tiles.filter((t) => t.data?.kind === "kpi" && t.data.kpi && t.data.result).slice(0, 12).map((t) => {
      const k = t.data!.kpi!, res = t.data!.result!;
      const f = (n: number | null) => formatNumber(n, k.numberFormat as NumberFormat, k.decimals, k.prefix ?? "", k.suffix ?? "");
      return { name: k.name, value: f(res.latest), target: f(k.target), rag: RAG[res.rag] ?? res.rag };
    });
    const period = `${day(r.periodStart)} to ${day(r.periodEnd)}`;

    const text = [
      `${session.name} sent you a report: ${r.title}`, period, note ? `\n${note}` : "",
      r.summary ? `\nSummary\n${r.summary}` : "",
      kpis.length ? `\nKPIs\n${kpis.map((k) => `- ${k.name}: ${k.value} (target ${k.target}, ${k.rag})`).join("\n")}` : "",
      `\nOpen the full report: ${link}`,
    ].filter(Boolean).join("\n");
    const html = mailHtml(r.title, [
      `<p style="margin:0 0 12px;color:#57534e">${escapeHtml(period)} · sent by ${escapeHtml(session.name)}</p>`,
      note ? `<p style="margin:0 0 16px;padding:12px;background:#fafaf9;border-radius:8px">${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : "",
      r.summary ? `<h2 style="font-size:15px;margin:16px 0 6px">Summary</h2><p style="margin:0;line-height:1.5">${escapeHtml(r.summary).replace(/\n/g, "<br>")}</p>` : "",
      kpis.length ? `<h2 style="font-size:15px;margin:16px 0 6px">KPIs</h2><table style="width:100%;border-collapse:collapse;font-size:13px">${kpis.map((k) =>
        `<tr><td style="padding:6px 0;border-top:1px solid #e7e5e4">${escapeHtml(k.name)}</td><td style="padding:6px 0;border-top:1px solid #e7e5e4;text-align:right"><b>${escapeHtml(k.value)}</b> / ${escapeHtml(k.target)}</td><td style="padding:6px 0 6px 10px;border-top:1px solid #e7e5e4;color:#78716c">${escapeHtml(k.rag)}</td></tr>`).join("")}</table>` : "",
    ].join(""), { href: link, label: "Open the full report" });

    const sent = await sendMail({ to: people.map((p) => p.email).filter((e): e is string => !!e), subject: `Report: ${r.title}`, text, html });
    await Notification.insertMany(people.filter((p) => String(p._id) !== session.id).map((p) => ({
      recipient: p._id, type: "insights_shared", title: `${session.name} sent you a report`, body: r.title,
      link: `/insights/reports/${r._id}`, meta: { reportId: String(r._id) },
    })));
    return NextResponse.json({ ok: true, sent, noEmail: people.filter((p) => !p.email).map((p) => p.name) });
  });
}
