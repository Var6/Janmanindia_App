"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LanguageProvider";

interface Resource {
  _id: string;
  kind: string;
  title: string;
  description: string;
  category?: string;
  eligibility?: string;
  benefit?: string;
  howToApply?: string;
  link?: string;
  contactPhone?: string;
  isActive: boolean;
}

/** Browse + manage social-security schemes or livelihood options. Community
 *  members and PLVs read; staff (director / administrator / social worker) can
 *  add, edit, deactivate, and delete entries. */
export default function ResourceDirectory({ kind }: { kind: "scheme" | "livelihood" }) {
  const t = useT();
  const [resources, setResources] = useState<Resource[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/resources?kind=${kind}`)
      .then((r) => r.json())
      .then((d) => { setResources(d.resources ?? []); setCanManage(!!d.canManage); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = { kind } as Record<string, unknown>;
    for (const f of ["title", "description", "category", "eligibility", "benefit", "howToApply", "link", "contactPhone"]) {
      const v = fd.get(f); if (v) body[f] = v;
    }
    try {
      const res = await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { (e.target as HTMLFormElement).reset(); setAdding(false); load(); }
    } finally { setBusy(false); }
  }

  async function toggle(r: Resource) {
    await fetch("/api/resources", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r._id, isActive: !r.isActive }) });
    load();
  }
  async function remove(r: Resource) {
    if (!confirm(t("Delete this entry?"))) return;
    await fetch(`/api/resources?id=${r._id}`, { method: "DELETE" });
    load();
  }

  const isScheme = kind === "scheme";
  const inCls = "w-full px-3 py-2 rounded-lg border text-sm";
  const inStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">{isScheme ? t("Social Security Schemes") : t("Livelihood Support")}</h1>
          <p className="text-sm text-(--muted) mt-1 max-w-2xl">
            {isScheme
              ? t("Government schemes and entitlements you may be eligible for. Ask your social worker if you need help applying.")
              : t("Small-loan, NBFC and livelihood options — for a rickshaw, a shop, or a skilling course. Your social worker can help you apply.")}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setAdding((s) => !s)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: adding ? "var(--bg-secondary)" : "var(--accent)", color: adding ? "var(--muted)" : "var(--accent-contrast)" }}>
            {adding ? t("Cancel") : `+ ${t("Add entry")}`}
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="title" required placeholder={t("Title")} className={inCls} style={inStyle} />
            <input name="category" placeholder={t("Category (e.g. Pension, Loan)")} className={inCls} style={inStyle} />
          </div>
          <textarea name="description" required rows={2} placeholder={t("Description")} className={inCls} style={inStyle} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="eligibility" placeholder={t("Who is eligible?")} className={inCls} style={inStyle} />
            <input name="benefit" placeholder={t("What you get")} className={inCls} style={inStyle} />
          </div>
          <textarea name="howToApply" rows={2} placeholder={t("How to apply")} className={inCls} style={inStyle} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="link" placeholder={t("Official link (optional)")} className={inCls} style={inStyle} />
            <input name="contactPhone" placeholder={t("Contact phone (optional)")} className={inCls} style={inStyle} />
          </div>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {busy ? t("Saving…") : t("Save")}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-(--muted) py-8 text-center">{t("Loading…")}</p>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-3xl mb-2">{isScheme ? "🏛️" : "💼"}</p>
          <p className="text-sm text-(--muted)">{t("Nothing listed yet. Check back soon.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((r) => (
            <article key={r._id} className="rounded-2xl border p-5 space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)", opacity: r.isActive ? 1 : 0.55 }}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-(--text)">{r.title}</h2>
                {r.category && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "color-mix(in srgb,var(--accent) 12%,transparent)", color: "var(--accent)" }}>{r.category}</span>}
              </div>
              <p className="text-sm text-(--muted)">{r.description}</p>
              {r.eligibility && <p className="text-xs text-(--text)"><span className="font-semibold">{t("Eligibility")}:</span> {r.eligibility}</p>}
              {r.benefit && <p className="text-xs text-(--text)"><span className="font-semibold">{t("Benefit")}:</span> {r.benefit}</p>}
              {r.howToApply && <p className="text-xs text-(--text)"><span className="font-semibold">{t("How to apply")}:</span> {r.howToApply}</p>}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>{t("Official link")} →</a>}
                {r.contactPhone && <a href={`tel:${r.contactPhone}`} className="text-xs font-semibold" style={{ color: "var(--accent)" }}>📞 {r.contactPhone}</a>}
              </div>
              {canManage && (
                <div className="flex items-center gap-3 pt-2 border-t text-xs" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => toggle(r)} className="hover:underline text-(--muted)">{r.isActive ? t("Deactivate") : t("Activate")}</button>
                  <button onClick={() => remove(r)} className="hover:underline" style={{ color: "var(--error-text)" }}>{t("Delete")}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="rounded-2xl border p-5 text-center" style={{ background: "color-mix(in srgb,var(--accent) 5%,var(--surface))", borderColor: "var(--border)" }}>
        <p className="text-sm text-(--muted) mb-2">{t("Need help applying?")}</p>
        <Link href="/community/speak-to-us" className="inline-block px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          {t("Ask your social worker")}
        </Link>
      </div>
    </div>
  );
}
