"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

type Lawyer = {
  _id: string;
  name: string;
  email: string;
  litigationProfile?: { activeCaseCount?: number; location?: { district?: string; city?: string } };
};
type CaseItem = {
  _id: string;
  caseTitle: string;
  district?: string;
  state?: string;
  courtName?: string;
  nextHearingDate?: string;
  litigationMember?: { name?: string };
};

function AssignContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const prefillCaseId = searchParams.get("caseId") ?? "";

  const [caseId, setCaseId] = useState(prefillCaseId);
  const [location, setLocation] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message?: string; assignedTo?: string; note?: string; error?: string } | null>(null);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    fetch("/api/users?role=litigation").then((r) => r.json()).then((d) => setLawyers(d.users ?? [])).catch(() => {});
    fetch("/api/cases?limit=50").then((r) => r.json()).then((d) => setCases(d.cases ?? [])).catch(() => {});
  }, []);

  const selectedCase = cases.find((c) => c._id === caseId);

  // When a case is picked, auto-fill the location (where it's filed) and the
  // next hearing date FROM THE CASE. The director can still override either.
  useEffect(() => {
    if (!selectedCase) return;
    setLocation(selectedCase.district || selectedCase.state || "");
    setHearingDate(selectedCase.nextHearingDate ? selectedCase.nextHearingDate.slice(0, 10) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function handleAuto(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) { setResult({ error: t("Select a case first.") }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, location: location.trim() || undefined, nextHearingDate: hearingDate || undefined }),
      });
      const d = await res.json();
      setResult(res.ok
        ? { message: t("Assigned to") + ` ${d.assignedTo?.name ?? ""}.`, note: d.note }
        : { error: d.error });
    } catch {
      setResult({ error: t("Network error.") });
    } finally {
      setLoading(false);
    }
  }

  async function handleManual(lawyerId: string) {
    if (!caseId) { setResult({ error: t("Select a case first.") }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ litigationMember: lawyerId }),
      });
      const d = await res.json();
      setResult(res.ok ? { message: t("Lawyer manually assigned.") } : { error: d.error });
    } catch {
      setResult({ error: t("Network error.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">{t("Reassign Case")}</h1>
        <p className="text-sm text-(--muted) mt-1">{t("Auto-assign based on location & workload, or manually pick a lawyer.")}</p>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border text-sm ${result.error ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {result.error ?? result.message}
          {result.note && <p className="mt-1 text-xs opacity-80">{result.note}</p>}
        </div>
      )}

      <form onSubmit={handleAuto} className="bg-(--surface) rounded-2xl border border-(--border) p-6 space-y-5">
        <h2 className="font-semibold text-(--text)">{t("Auto-Assign")}</h2>

        <div>
          <label className="block text-sm font-medium text-(--text) mb-1.5">{t("Case")} <span className="text-red-500">*</span></label>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/40"
          >
            <option value="">{t("Select case…")}</option>
            {cases.map((c) => (
              <option key={c._id} value={c._id}>{c.caseTitle}</option>
            ))}
          </select>
          {selectedCase && (
            <p className="text-xs text-(--muted) mt-1.5">
              {selectedCase.courtName ? `${selectedCase.courtName} · ` : ""}
              {selectedCase.litigationMember?.name
                ? t("Currently with") + ` ${selectedCase.litigationMember.name}`
                : t("Currently unassigned")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">{t("Case Location")}</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("Auto-filled from the case")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/40"
            />
            <p className="text-xs text-(--muted) mt-1">{t("Used to match a lawyer in the same district. Edit to override.")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">{t("Next Hearing Date")}</label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg) text-(--text) text-sm focus:outline-none focus:ring-2 focus:ring-(--accent)/40"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !caseId}
          className="w-full py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("Assigning…") : t("Auto-Assign Lawyer")}
        </button>
      </form>

      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <div className="px-5 py-4 border-b border-(--border)">
          <h2 className="font-semibold text-(--text)">{t("Manual Assignment")}</h2>
          <p className="text-xs text-(--muted) mt-0.5">{t("Select a case above first, then pick a lawyer.")}</p>
        </div>
        {lawyers.length === 0 ? (
          <div className="py-8 text-center text-sm text-(--muted)">{t("No lawyers found.")}</div>
        ) : (
          <div className="divide-y divide-(--border)">
            {lawyers.map((l) => (
              <div key={l._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-(--text)">{l.name}</p>
                  <p className="text-xs text-(--muted)">
                    {l.litigationProfile?.location?.district || "—"} · {l.litigationProfile?.activeCaseCount ?? 0} {t("active case(s)")}
                  </p>
                </div>
                <button
                  onClick={() => handleManual(l._id)}
                  disabled={loading || !caseId}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-(--accent)/10 text-(--accent) hover:bg-(--accent)/20 disabled:opacity-40 transition-colors"
                >
                  {t("Assign")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AssignPage() {
  return (
    <Suspense fallback={<SkeletonCard lines={4} />}>
      <AssignContent />
    </Suspense>
  );
}
