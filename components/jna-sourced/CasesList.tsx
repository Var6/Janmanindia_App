"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_CASES } from "@/lib/jna-sourced/demo-data";
import { CASE_STATUSES, PRIORITIES } from "@/lib/jna-sourced/constants";
import { useT } from "@/components/i18n/LanguageProvider";

const STATUS_TONE: Record<string, string> = {
  active:  "bg-blue-500/15  text-blue-300  border-blue-500/40",
  overdue: "bg-red-500/15   text-red-300   border-red-500/40",
  stayed:  "bg-amber-500/15 text-amber-300 border-amber-500/40",
  closed:  "bg-gray-500/15  text-gray-300  border-gray-500/40",
};

const PRIORITY_TONE: Record<string, string> = {
  high:   "bg-red-500/15    text-red-300    border-red-500/40",
  medium: "bg-amber-500/15  text-amber-300  border-amber-500/40",
  low:    "bg-green-500/15  text-green-300  border-green-500/40",
};

export default function CasesList() {
  const t = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return DEMO_CASES.filter((c) => {
      if (status && c.status !== status) return false;
      if (priority && c.priority !== priority) return false;
      if (!needle) return true;
      return [c.title, c.client, c.respondent, c.court, c.caseNo, c.advocate, c.district]
        .some((v) => v.toLowerCase().includes(needle));
    });
  }, [q, status, priority]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search by title, client, court, advocate…")}
          className="flex-1 bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text) placeholder:text-(--muted) focus:border-(--accent) outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
        >
          <option value="">{t("All statuses")}</option>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
        >
          <option value="">{t("All priorities")}</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="text-xs text-(--muted)">{filtered.length} case{filtered.length === 1 ? "" : "s"}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/director/jan-sahayak-pro/sourced/cases/${c.id}`}
            className="bg-(--surface) border border-(--border) rounded-2xl p-4 hover:border-(--accent) transition-colors block"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-semibold text-sm text-(--text) leading-snug">{c.title}</p>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_TONE[c.status] ?? ""}`}>{c.status}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${PRIORITY_TONE[c.priority] ?? ""}`}>{c.priority}</span>
              </div>
            </div>
            <p className="text-xs text-(--muted) mb-2">{c.client} v. {c.respondent}</p>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <dt className="text-(--muted)">{t("Court")}</dt>      <dd className="text-(--text)">{c.court}</dd>
              <dt className="text-(--muted)">{t("Case No.")}</dt>   <dd className="text-(--text)">{c.caseNo || "—"}</dd>
              <dt className="text-(--muted)">{t("Advocate")}</dt>   <dd className="text-(--text)">{c.advocate}</dd>
              <dt className="text-(--muted)">{t("District")}</dt>   <dd className="text-(--text)">{c.district}</dd>
            </dl>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-(--muted) text-center py-12">{t("No cases match these filters.")}</p>
      )}
    </div>
  );
}
