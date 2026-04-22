"use client";

import { useEffect, useState } from "react";
import { NATIONAL_EMERGENCY } from "@/lib/helplines";

interface SW { _id: string; name: string; phone: string | null; email: string | null }
interface Helpline {
  _id: string; district: string;
  primaryName: string; primaryPhone: string;
  secondaryName?: string; secondaryPhone?: string; notes?: string;
}

/**
 * Three-tier contact ladder for community members:
 *   1. Assigned Social Worker (always shown first)
 *   2. District helpline — revealed only after the user clicks "SW not reachable"
 *   3. National emergency — always available below
 */
export default function CommunityContactPanel() {
  const [sw, setSw] = useState<SW | null>(null);
  const [helpline, setHelpline] = useState<Helpline | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    fetch("/api/community/contacts")
      .then((r) => r.json())
      .then((d) => {
        setSw(d.assignedSocialWorker);
        setHelpline(d.districtHelpline);
        setDistrict(d.district);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return <div className="rounded-2xl border border-(--border) bg-(--surface) p-5 text-center text-xs text-(--muted)">Loading contacts…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Assigned SW — primary contact */}
      <section className="rounded-2xl border-2 p-5"
        style={{ background: "var(--accent-subtle)", borderColor: "var(--accent)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
          Your Social Worker · First point of contact
        </p>
        {sw ? (
          <>
            <p className="font-semibold text-(--text)">{sw.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sw.phone ? (
                <a href={`tel:${sw.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-(--accent-contrast)"
                  style={{ background: "var(--accent)" }}>
                  📞 {sw.phone}
                </a>
              ) : (
                <p className="text-xs text-(--muted)">No phone on file.</p>
              )}
              {sw.email && (
                <a href={`mailto:${sw.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-(--border) text-(--text)">
                  ✉ Email
                </a>
              )}
            </div>
            {!showFallback && (
              <button onClick={() => setShowFallback(true)}
                className="mt-3 text-xs font-semibold underline" style={{ color: "var(--accent)" }}>
                Social Worker not reachable? Show district helpline →
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-(--text)">No social worker assigned yet.</p>
            <p className="text-xs text-(--muted) mt-1">
              Use the district helpline below in the meantime.
            </p>
          </>
        )}
      </section>

      {/* District helpline — gated unless no SW or user clicked the fallback link */}
      {(showFallback || !sw) && (
        helpline ? (
          <section className="rounded-2xl border border-(--border) bg-(--surface) p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-(--muted) mb-1">
              District Helpline · {helpline.district}
            </p>
            <p className="font-semibold text-(--text)">{helpline.primaryName}</p>
            <a href={`tel:${helpline.primaryPhone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--success, #16a34a)" }}>
              📞 {helpline.primaryPhone}
            </a>
            {helpline.secondaryPhone && (
              <a href={`tel:${helpline.secondaryPhone.replace(/[^\d+]/g, "")}`}
                className="ml-2 inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-semibold border border-(--border) text-(--text)">
                Alt: {helpline.secondaryPhone}
              </a>
            )}
            {helpline.notes && <p className="text-xs text-(--muted) mt-2">{helpline.notes}</p>}
          </section>
        ) : (
          <section className="rounded-2xl border border-(--border) bg-(--surface) p-5 text-center">
            <p className="text-sm text-(--muted)">
              {district
                ? `No district helpline configured yet for ${district}.`
                : "District not set on your profile — HR can configure helplines per district."}
            </p>
          </section>
        )
      )}

      {/* National emergency — always shown */}
      <section className="rounded-2xl border border-(--border) bg-(--surface) p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-(--muted) mb-2">
          National Emergency · always available
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NATIONAL_EMERGENCY.map((h) => (
            <li key={h.number}>
              <a href={`tel:${h.number}`}
                className="block rounded-xl border border-(--border) px-3 py-2 hover:border-(--accent) transition-colors">
                <p className="text-xs text-(--muted) truncate">{h.name}</p>
                <p className="text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>{h.number}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
