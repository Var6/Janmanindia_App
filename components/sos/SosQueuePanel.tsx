"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

interface SosAlert {
  _id: string;
  location: string;
  description: string;
  status: string;
  stage?: string;
  createdAt: string;
  raisedBy?: { name?: string; phone?: string } | null;
}

const STAGE_LABEL: Record<string, string> = {
  plv: "With PLVs", socialworker: "With Social Worker", litigation: "With Litigation", resolved: "Resolved",
};

/** Reusable SOS queue for any responder tier (PLV / social worker / litigation
 *  / director). Fetches /api/sos — which already returns only the alerts this
 *  role may act on — and offers Escalate / Resolve (the API enforces who can do
 *  what at each stage). */
export default function SosQueuePanel({
  title, subtitle, escalateLabel, allowEscalate = true, emptyText,
}: {
  title: string;
  subtitle?: string;
  escalateLabel: string;
  allowEscalate?: boolean;
  emptyText: string;
}) {
  const t = useT();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/sos").then((r) => r.json()).then((d) => setAlerts(d.alerts ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(alertId: string, action: "escalate" | "resolve") {
    setBusy(alertId);
    try {
      const res = await fetch("/api/sos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      if (res.ok) load();
    } finally { setBusy(null); }
  }

  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-semibold text-(--text)">{title} ({alerts.length})</h2>
        </div>
        {subtitle && <p className="text-xs text-(--muted) mt-1">{subtitle}</p>}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-(--muted)">{t("Loading…")}</div>
      ) : alerts.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-sm text-(--muted)">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a._id} className="rounded-2xl border p-5" style={{ background: "color-mix(in srgb,#dc2626 6%,var(--surface))", borderColor: "color-mix(in srgb,#dc2626 25%,var(--border))" }}>
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                  <p className="font-semibold text-(--text)">
                    {a.raisedBy?.name ?? t("Unknown")}{a.raisedBy?.phone ? ` · ${a.raisedBy.phone}` : ""}
                  </p>
                  <p className="text-xs text-(--muted) mt-0.5">📍 {a.location}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--muted)" }}>
                    {t(STAGE_LABEL[a.stage ?? "socialworker"] ?? "With Social Worker")}
                  </span>
                  <p className="text-[12px] text-(--muted) mt-1">{new Date(a.createdAt).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <p className="text-sm text-(--text) mb-4">{a.description}</p>
              <div className="flex gap-2">
                {allowEscalate && a.stage !== "litigation" && (
                  <button onClick={() => act(a._id, "escalate")} disabled={busy === a._id}
                    className="px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-60"
                    style={{ background: "#dc2626" }}>
                    {busy === a._id ? t("Working…") : escalateLabel}
                  </button>
                )}
                <button onClick={() => act(a._id, "resolve")} disabled={busy === a._id}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border text-(--text) transition-colors disabled:opacity-60"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  {t("Mark Resolved")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
