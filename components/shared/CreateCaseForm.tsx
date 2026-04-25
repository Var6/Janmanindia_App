"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Community = { _id: string; name: string; email: string; phone?: string };

export default function CreateCaseForm() {
  const router = useRouter();

  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<Community[]>([]);
  const [searching, setSearching] = useState(false);
  const [community, setCommunity]     = useState<Community | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [path, setPath]           = useState<"criminal" | "highcourt">("criminal");
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
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=user`);
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
    setPath("criminal");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) { setError("Please select a community first."); return; }
    if (!caseTitle.trim()) { setError("Case title is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseTitle: caseTitle.trim(), path, communityId: community._id }),
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

          {/* Path */}
          <div>
            <label className="block text-sm font-medium text-(--text) mb-1.5">Case Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["criminal", "highcourt"] as const).map((p) => (
                <button key={p} type="button"
                  onClick={() => setPath(p)}
                  className="py-2.5 px-4 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor:  path === p ? "var(--accent)" : "var(--border)",
                    background:   path === p ? "color-mix(in srgb,var(--accent) 10%,transparent)" : "var(--bg)",
                    color:        path === p ? "var(--accent)" : "var(--muted)",
                  }}>
                  {p === "criminal" ? "Criminal" : "High Court"}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting || !community || !caseTitle.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {submitting ? "Creating…" : "Create Case"}
          </button>
        </form>
      )}
    </div>
  );
}
