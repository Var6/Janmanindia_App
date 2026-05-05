"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CASE_TYPES, lookupCaseType } from "@/lib/case-types";

type Community = { _id: string; name: string; email: string; phone?: string };

export default function CreateCaseForm() {
  const router = useRouter();

  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<Community[]>([]);
  const [searching, setSearching] = useState(false);
  const [community, setCommunity]     = useState<Community | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [caseType, setCaseType]   = useState("");
  // Initial status + tracking fields. Default Open keeps the form one-click
  // for fresh cases; Pending / Escalated apply when registering one that's
  // already underway (police station, lower court, etc).
  const [caseStatus, setCaseStatus]   = useState<"Open" | "Pending" | "Escalated">("Open");
  const [isExisting, setIsExisting]   = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [existingNotes, setExistingNotes] = useState("");
  // Court-side metadata for cases the lawyer is registering after the fact —
  // matters with an FIR / court case number already on record. Mapped to the
  // top-level Case fields (`courtCaseNumber`, `courtName`, `relevantSections`)
  // and to `enquiry.firNumber` / `enquiry.policeStation` on submission.
  const [courtCaseNumber, setCourtCaseNumber] = useState("");
  const [courtName, setCourtName]             = useState("");
  const [firNumber, setFirNumber]             = useState("");
  const [policeStation, setPoliceStation]     = useState("");
  const [relevantSections, setRelevantSections] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query || query.length < 2 || community) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=community`);
        const data = await res.json();
        setResults(data.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, community]);

  function reset() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setCommunity(null);
    setCaseTitle("");
    setCaseType("");
    setCaseStatus("Open");
    setIsExisting(false);
    setCurrentStep("");
    setExistingNotes("");
    setCourtCaseNumber("");
    setCourtName("");
    setFirNumber("");
    setPoliceStation("");
    setRelevantSections("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) { setError("Please select a community member first."); return; }
    if (!caseTitle.trim()) { setError("Case title is required."); return; }
    if (!caseType) { setError("Pick a case type so we can route the workflow."); return; }
    const meta = lookupCaseType(caseType);
    if (!meta) { setError("That case type isn't recognised — pick one from the list."); return; }
    setSubmitting(true);
    setError("");
    try {
      // Build enquiry sub-doc only when at least one intake field is set —
      // the API drops empty enquiry blocks but sending `{}` would still trip
      // the validator path. Keeps the wire body tidy for fresh-case creation.
      const enquiry: Record<string, string> = {};
      if (firNumber.trim())     enquiry.firNumber     = firNumber.trim();
      if (policeStation.trim()) enquiry.policeStation = policeStation.trim();

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseTitle: caseTitle.trim(),
          caseType,
          path: meta.path,
          communityId: community._id,
          status: caseStatus,
          isExistingCase: isExisting,
          currentStep:   currentStep.trim() || undefined,
          existingNotes: existingNotes.trim() || undefined,
          courtCaseNumber:  courtCaseNumber.trim() || undefined,
          courtName:        courtName.trim()       || undefined,
          relevantSections: relevantSections.trim() || undefined,
          ...(Object.keys(enquiry).length ? { enquiry } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create case.");
      } else {
        reset();
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M3 8h10M8 3v10"/>
          </svg>
          Create Case for Community Member
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border p-6 space-y-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-(--text)">Create Case for Community Member</h2>
            <button type="button" onClick={reset}
              className="text-xs text-(--muted) hover:text-(--text) px-2 py-1 rounded-lg hover:bg-(--bg-secondary) transition-colors">
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm"
              style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb,var(--error) 25%,transparent)" }}>
              {error}
            </div>
          )}

          {/* Community search */}
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              Search Community <span style={{ color: "var(--error)" }}>*</span>
            </label>
            {community ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
                style={{ background: "var(--bg)", borderColor: "var(--accent)" }}>
                <div>
                  <p className="text-sm font-medium text-(--text)">{community.name}</p>
                  <p className="text-xs text-(--muted)">{community.email}</p>
                </div>
                <button type="button" onClick={() => { setCommunity(null); setQuery(""); }}
                  className="text-xs hover:underline" style={{ color: "var(--error)" }}>
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted)">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
                    {results.map((u) => (
                      <button key={u._id} type="button"
                        onClick={() => { setCommunity(u); setQuery(""); setResults([]); }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <p className="font-medium text-(--text)">{u.name}</p>
                        <p className="text-xs text-(--muted)">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {query.length >= 2 && !searching && results.length === 0 && (
                  <p className="text-xs text-(--muted) mt-1">No community members found matching "{query}".</p>
                )}
              </div>
            )}
          </div>

          {/* Case title */}
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              Case Title <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} required
              placeholder="Brief description of the case"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Case type */}
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">
              Case Type <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <select value={caseType} onChange={(e) => setCaseType(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
              <option value="" disabled>Choose a case type…</option>
              {CASE_TYPES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.types.map((t) => (
                    <option key={t.code + g.group} value={t.code}>
                      {t.code} — {t.name}{t.hi ? ` · ${t.hi}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-(--muted) mt-1">
              We&apos;ll route the workflow (criminal / high court) automatically based on the selected type.
            </p>
          </div>

          {/* In-progress case toggle — when on, the form gains "current step"
              and "history" so a user can register a case that's already
              underway elsewhere instead of starting one fresh. */}
          <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border px-3.5 py-2.5"
            style={{ borderColor: isExisting ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <input type="checkbox" checked={isExisting} onChange={(e) => setIsExisting(e.target.checked)}
              className="mt-0.5 accent-(--accent) cursor-pointer" />
            <span>
              <p className="text-sm font-medium text-(--text)">Already in progress (track only)</p>
              <p className="text-[11px] text-(--muted) mt-0.5">
                The case is already underway at a police station / court. Janman is monitoring,
                not filing. Litigation members will see this case in their queue.
              </p>
            </span>
          </label>

          {isExisting && (
            <>
              <div>
                <label className="block text-sm font-medium text-(--text) mb-1.5">Current status</label>
                <select value={caseStatus} onChange={(e) => setCaseStatus(e.target.value as "Open" | "Pending" | "Escalated")}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                  <option value="Open">Open — actively progressing</option>
                  <option value="Pending">Pending — waiting on the other side</option>
                  <option value="Escalated">Escalated — needs senior intervention</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text) mb-1.5">Where it is right now</label>
                <input value={currentStep} onChange={(e) => setCurrentStep(e.target.value)} maxLength={300}
                  placeholder="e.g. FIR filed at Patna Bypass PS, awaiting chargesheet"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text) mb-1.5">Past steps / history</label>
                <textarea value={existingNotes} onChange={(e) => setExistingNotes(e.target.value)} rows={3}
                  placeholder="Briefly note what's already happened — incident date, FIR number, lawyer involved, hearing dates so far…"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
              </div>

              {/* Court-side metadata for the matter we're tracking. The
                  internal Janman case number is auto-generated server-side
                  (JMI-YYYY-NNNNN); these fields capture the *external*
                  numbers that already exist on the FIR / court record. */}
              <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mt-3 mb-2">
                  Existing case numbers
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-1.5">FIR No. / Complaint Case No.</label>
                    <input value={firNumber} onChange={(e) => setFirNumber(e.target.value)} maxLength={120}
                      placeholder="123/2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-1.5">Court Case / Registration No.</label>
                    <input value={courtCaseNumber} onChange={(e) => setCourtCaseNumber(e.target.value)} maxLength={120}
                      placeholder="GR 456/2026 · ST 78/2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-1.5">Court Name</label>
                    <input value={courtName} onChange={(e) => setCourtName(e.target.value)} maxLength={200}
                      placeholder="CJM Court, Patna"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-1.5">Police Station</label>
                    <input value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} maxLength={200}
                      placeholder="Khajanchi Hat PS"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-(--text) mb-1.5">Relevant Sections</label>
                    <input value={relevantSections} onChange={(e) => setRelevantSections(e.target.value)} maxLength={300}
                      placeholder="BNS 64, 351 r/w POCSO §6"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
                  </div>
                </div>
                <p className="text-[11px] text-(--muted) mt-2">
                  All optional — fill what you have on hand. The internal Janman case number is generated automatically.
                </p>
              </div>
            </>
          )}

          <button type="submit" disabled={submitting || !community || !caseTitle.trim() || !caseType}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {submitting ? "Creating…" : "Create Case"}
          </button>
        </form>
      )}
    </div>
  );
}
