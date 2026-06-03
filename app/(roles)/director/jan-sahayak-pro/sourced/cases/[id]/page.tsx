import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_CASES } from "@/lib/jna-sourced/demo-data";
import { getServerT } from "@/lib/i18n-server";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = DEMO_CASES.find((x) => x.id === id);
  if (!c) notFound();
  const t = await getServerT();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/director/jan-sahayak-pro/sourced/cases" className="text-xs text-(--muted) hover:text-(--accent)">
          {t("← all cases")}
        </Link>
        <h2 className="text-xl font-bold text-(--text) mt-2">{c.title}</h2>
        <p className="text-sm text-(--muted) mt-1">{c.client} {t("v.")} {c.respondent}</p>
        <div className="flex gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded border border-(--border) text-(--accent)">{c.status}</span>
          <span className="px-2 py-0.5 rounded border border-(--border) text-(--accent)">{c.priority}</span>
          <span className="px-2 py-0.5 rounded border border-(--border) text-(--muted)">{c.type}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
          <h3 className="text-sm font-bold text-(--text) mb-3">{t("Metadata")}</h3>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-xs">
            <dt className="text-(--muted)">{t("Court")}</dt>     <dd className="text-(--text)">{c.court}</dd>
            <dt className="text-(--muted)">{t("Case No.")}</dt>  <dd className="text-(--text)">{c.caseNo || "—"}</dd>
            <dt className="text-(--muted)">{t("FIR No.")}</dt>   <dd className="text-(--text)">{c.firNo || "—"}</dd>
            <dt className="text-(--muted)">{t("Section")}</dt>   <dd className="text-(--text)">{c.section || "—"}</dd>
            <dt className="text-(--muted)">{t("PS")}</dt>        <dd className="text-(--text)">{c.ps || "—"}</dd>
            <dt className="text-(--muted)">{t("District")}</dt>  <dd className="text-(--text)">{c.district}</dd>
            <dt className="text-(--muted)">{t("Advocate")}</dt>  <dd className="text-(--text)">{c.advocate}</dd>
            <dt className="text-(--muted)">{t("Worker")}</dt>    <dd className="text-(--text)">{c.worker}</dd>
            <dt className="text-(--muted)">{t("Created")}</dt>   <dd className="text-(--text)">{c.createdAt}</dd>
            <dt className="text-(--muted)">{t("Updated")}</dt>   <dd className="text-(--text)">{c.updatedAt}</dd>
          </dl>
        </section>

        <section className="bg-(--surface) border border-(--border) rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-(--text) mb-2">{t("Facts")}</h3>
            <p className="text-xs text-(--text) whitespace-pre-line">{c.facts || "—"}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--text) mb-2">{t("Grounds")}</h3>
            <p className="text-xs text-(--text) whitespace-pre-line">{c.grounds || "—"}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--text) mb-2">{t("Relief")}</h3>
            <p className="text-xs text-(--text) whitespace-pre-line">{c.relief || "—"}</p>
          </div>
        </section>
      </div>

      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
        <h3 className="text-sm font-bold text-(--text) mb-3">{t("Hearings")} ({c.hearings.length})</h3>
        {c.hearings.length === 0 ? (
          <p className="text-xs text-(--muted)">{t("No hearings logged.")}</p>
        ) : (
          <ul className="space-y-3">
            {c.hearings.map((h) => (
              <li key={h.id} className="border-l-2 border-(--accent) pl-3">
                <div className="text-xs font-semibold text-(--text)">{h.date} · {h.purpose}</div>
                <div className="text-[11px] text-(--muted)">{h.court}</div>
                <div className="text-xs text-(--text) mt-1">{h.outcome}</div>
                {h.nextDate && <div className="text-[11px] text-(--accent) mt-1">{t("Next:")} {h.nextDate}</div>}
                <div className="text-[10px] text-(--muted) mt-1">{t("by")} {h.by}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
        <h3 className="text-sm font-bold text-(--text) mb-3">{t("Case Diary")} ({c.diary.length})</h3>
        {c.diary.length === 0 ? (
          <p className="text-xs text-(--muted)">{t("No diary entries.")}</p>
        ) : (
          <ul className="space-y-3">
            {c.diary.map((d) => (
              <li key={d.id} className="border-l-2 border-(--border) pl-3">
                <div className="text-xs font-semibold text-(--text)">{d.date} · {d.action}</div>
                <div className="text-xs text-(--text) mt-1">{d.notes}</div>
                <div className="text-[10px] text-(--muted) mt-1">{t("by")} {d.by}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
        <h3 className="text-sm font-bold text-(--text) mb-3">{t("Documents")} ({c.documents.length})</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {c.documents.map((doc, i) => (
            <li key={i} className="text-xs text-(--text) px-3 py-2 rounded-lg border border-(--border)">
              📄 {doc}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
