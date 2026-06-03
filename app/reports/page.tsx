import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { tryConnectDB } from "@/lib/mongoose";
import Report from "@/models/Report";
import { REPORT_TEMPLATES, lookupTemplate } from "@/lib/report-templates";
import NoDBBanner from "@/components/shared/NoDBBanner";

const PRIVILEGED = ["director", "superadmin", "administrator"];

export default async function ReportsIndex() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role === "community") redirect("/community");

  const t = await getServerT();
  const startLabel = t("Start →");
  const dbOk = await tryConnectDB();

  // Privileged roles see everyone's reports; rank-and-file only see their own.
  const filter: Record<string, unknown> = {};
  if (!PRIVILEGED.includes(session.role) && mongoose.Types.ObjectId.isValid(session.id)) {
    filter.submittedBy = new mongoose.Types.ObjectId(session.id);
  }

  const reports = dbOk
    ? await Report.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("submittedBy", "name role")
        .lean()
    : [];

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Field Reports")}</h1>
        <p className="text-sm text-(--muted) mt-1">
          {PRIVILEGED.includes(session.role)
            ? t("All field reports submitted by the team. Pick a template to file a new one.")
            : t("Reports you've submitted. Pick a template to file a new one.")}
        </p>
      </div>

      {/* Template grid — entry point for filing a new report */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted) mb-3">{t("File a new report")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TEMPLATES.filter((t) => t.authorRoles.includes(session.role)).map((t) => (
            <Link key={t.id} href={`/reports/new/${t.id}`}
              className="block rounded-2xl border p-5 hover:border-(--accent) transition-colors group"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <p className="text-sm font-bold text-(--text) group-hover:text-(--accent) transition-colors">{t.name}</p>
              {t.description && <p className="text-xs text-(--muted) mt-1.5 leading-relaxed line-clamp-2">{t.description}</p>}
              <p className="mt-3 text-xs font-semibold" style={{ color: "var(--accent)" }}>{startLabel}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Submitted reports list */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted) mb-3">
          {t("Recent submissions")} {reports.length > 0 && <span className="font-normal lowercase">· {reports.length}</span>}
        </h2>
        {reports.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm text-(--muted)">{dbOk ? t("No reports yet — pick a template above to file the first one.") : t("Connect database.")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {reports.map((r) => {
                const tpl = lookupTemplate(r.template);
                const sub = r.submittedBy as unknown as { name: string; role: string } | null;
                const submittedAt = (r as unknown as { createdAt: Date }).createdAt;
                return (
                  <Link key={String(r._id)} href={`/reports/${String(r._id)}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 hover:bg-(--bg) transition-colors">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                      {tpl?.name ?? r.template}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--text) truncate">
                        {r.summary?.title ?? "—"}
                        {r.summary?.district && <span className="text-(--muted) font-normal"> · {r.summary.district}</span>}
                      </p>
                      <p className="text-xs text-(--muted) truncate">
                        {sub?.name ?? "—"}{sub?.role ? ` (${sub.role})` : ""}
                        {r.summary?.eventDate && ` · ${new Date(r.summary.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                    <p className="text-xs text-(--muted) whitespace-nowrap">
                      {submittedAt && new Date(submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
