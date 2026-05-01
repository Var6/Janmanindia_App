import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Report from "@/models/Report";
import { lookupTemplate } from "@/lib/report-templates";

const PRIVILEGED = ["director", "superadmin", "administrator"];

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role === "community") redirect("/community");

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const dbOk = await tryConnectDB();
  if (!dbOk) {
    return <p className="text-sm text-(--muted)">Database is unreachable.</p>;
  }

  const report = await Report.findById(id)
    .populate("submittedBy", "name role email")
    .lean();
  if (!report) notFound();

  const sub = report.submittedBy as unknown as { _id: unknown; name: string; role: string; email?: string } | null;
  const isAuthor = sub && String(sub._id) === session.id;
  if (!isAuthor && !PRIVILEGED.includes(session.role)) {
    return (
      <div className="space-y-4 max-w-xl">
        <p className="text-sm rounded-xl px-4 py-3"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          You don&apos;t have access to this report.
        </p>
        <Link href="/reports" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          ← Back to reports
        </Link>
      </div>
    );
  }

  const template = lookupTemplate(report.template);
  const data = (report.data ?? {}) as Record<string, unknown>;
  const submittedAt = (report as unknown as { createdAt: Date }).createdAt;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/reports" className="text-xs font-medium text-(--muted) hover:text-(--accent) transition-colors">
          ← All reports
        </Link>
        <h1 className="text-2xl font-bold text-(--text) mt-2">{template?.name ?? report.template}</h1>
        <p className="text-xs text-(--muted) mt-1">
          Filed by {sub?.name ?? "—"}{sub?.role ? ` (${sub.role})` : ""}
          {submittedAt && ` · ${new Date(submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
        </p>
      </div>

      {!template ? (
        <div className="rounded-2xl border p-5 text-sm text-(--muted)"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          This report uses an unknown template ({report.template}). Raw data:
          <pre className="mt-3 p-3 rounded-lg text-[11px] overflow-auto"
            style={{ background: "var(--bg-secondary, #f3f4f6)" }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <dl className="rounded-2xl border divide-y"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {template.fields.map((f) => {
            const v = data[f.id];
            return (
              <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 px-5 py-3.5">
                <dt className="text-xs font-semibold text-(--muted) uppercase tracking-wide">{f.label}</dt>
                <dd className="text-sm text-(--text) min-w-0 break-words">
                  <Value field={f.type} value={v} />
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

function Value({ field, value }: { field: string; value: unknown }) {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-(--muted) italic">—</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={String(v)} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (field === "url" && typeof value === "string") {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="underline hover:text-(--accent)" style={{ color: "var(--accent)" }}>
        {value}
      </a>
    );
  }
  if (field === "long_text" && typeof value === "string") {
    return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
  }
  if (field === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return <span>{d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>;
    }
  }
  return <span>{String(value)}</span>;
}
