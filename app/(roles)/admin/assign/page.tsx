"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Lawyer = { _id: string; name: string; email: string; litigationProfile?: { activeCaseCount: number; location: string } };
type CaseItem = { _id: string; caseTitle: string; litigationMember?: { name: string } };

function AssignContent() {
  const searchParams = useSearchParams();
  const prefillCaseId = searchParams.get("caseId") ?? "";

  const [caseId, setCaseId] = useState(prefillCaseId);
  const [location, setLocation] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message?: string; assignedTo?: string; error?: string } | null>(null);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    fetch("/api/users?role=litigation").then((r) => r.json()).then((d) => setLawyers(d.users ?? [])).catch(() => {});
    fetch("/api/cases?limit=50").then((r) => r.json()).then((d) => setCases(d.cases ?? [])).catch(() => {});
  }, []);

  async function handleAuto(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, location, nextHearingDate: hearingDate || undefined }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  async function handleManual(lawyerId: string) {
    if (!caseId) { setResult({ error: "Select a case first." }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ litigationMember: lawyerId }),
      });
      const d = await res.json();
      setResult(res.ok ? { message: "Lawyer manually assigned." } : { error: d.error });
    } catch {
      setResult({ error: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(text)">Reassign Case</h1>
        <p className="text-sm text-(muted) mt-1">Auto-assign based on location &amp; workload, or manually pick a lawyer.</p>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border text-sm ${result.error ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {result.error ?? result.message}
        </div>
      )}

      <form onSubmit={handleAuto} className="bg-(surface) rounded-2xl border border-(border) p-6 space-y-5">
        <h2 className="font-semibold text-(text)">Auto-Assign</h2>

        <div>
          <label className="block text-sm font-medium text-(text) mb-1.5">Case <span className="text-red-500">*</span></label>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
          >
            <option value="">Select case…</option>
            {cases.map((c) => (
              <option key={c._id} value={c._id}>{c.caseTitle}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">Case Location <span className="text-red-500">*</span></label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g. Lucknow"
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-(text) mb-1.5">Next Hearing Date</label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-(border) bg-(bg) text-(text) text-sm focus:outline-none focus:ring-2 focus:ring-(accent)/40"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-(accent) text-(accent-contrast) text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Assigning…" : "Auto-Assign Lawyer"}
        </button>
      </form>

      <section className="bg-(surface) rounded-2xl border border-(border) overflow-hidden">
        <div className="px-5 py-4 border-b border-(border)">
          <h2 className="font-semibold text-(text)">Manual Assignment</h2>
          <p className="text-xs text-(muted) mt-0.5">Select a case above first, then pick a lawyer.</p>
        </div>
        {lawyers.length === 0 ? (
          <div className="py-8 text-center text-sm text-(muted)">No lawyers found.</div>
        ) : (
          <div className="divide-y divide-(border)">
            {lawyers.map((l) => (
              <div key={l._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-(text)">{l.name}</p>
                  <p className="text-xs text-(muted)">
                    {l.litigationProfile?.location ?? "—"} · {l.litigationProfile?.activeCaseCount ?? 0} active case(s)
                  </p>
                </div>
                <button
                  onClick={() => handleManual(l._id)}
                  disabled={loading || !caseId}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-(accent)/10 text-(accent) hover:bg-(accent)/20 disabled:opacity-40 transition-colors"
                >
                  Assign
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
    <Suspense fallback={<div className="py-10 text-center text-sm text-(muted)">Loading…</div>}>
      <AssignContent />
    </Suspense>
  );
}
