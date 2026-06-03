import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { lookupTemplate } from "@/lib/report-templates";
import ReportForm from "@/components/reports/ReportForm";
import { getServerT } from "@/lib/i18n-server";

export default async function NewReportPage({ params }: { params: Promise<{ template: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role === "community") redirect("/community");

  const t = await getServerT();

  const { template: templateId } = await params;
  const template = lookupTemplate(templateId);
  if (!template) notFound();

  if (!template.authorRoles.includes(session.role)) {
    return (
      <div className="space-y-4 max-w-xl">
        <h1 className="text-2xl font-bold text-(--text)">{template.name}</h1>
        <p className="text-sm rounded-xl px-4 py-3"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          {t("Your role can't submit this report — talk to a director if you need access.")}
        </p>
        <Link href="/reports" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          ← {t("Back to reports")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/reports" className="text-xs font-medium text-(--muted) hover:text-(--accent) transition-colors">
          ← {t("All reports")}
        </Link>
        <h1 className="text-2xl font-bold text-(--text) mt-2">{template.name}</h1>
      </div>
      <ReportForm template={template} />
    </div>
  );
}
