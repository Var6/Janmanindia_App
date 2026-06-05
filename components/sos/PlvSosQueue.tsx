"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import SosQueuePanel from "@/components/sos/SosQueuePanel";

/** Shown on the community SOS page only when the signed-in member is an
 *  approved PLV (Para-Legal Volunteer). PLVs are the first tier of the SOS
 *  ladder: they triage incoming community alerts and escalate genuine ones to
 *  a social worker. */
export default function PlvSosQueue() {
  const t = useT();
  const [isPlv, setIsPlv] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => setIsPlv(d.user?.plvStatus === "approved"))
      .catch(() => setIsPlv(false));
  }, []);

  if (!isPlv) return null;

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb,var(--accent) 15%,transparent)", color: "var(--accent)" }}>
          {t("PLV")}
        </span>
      </div>
      <SosQueuePanel
        title={t("Incoming SOS to triage")}
        subtitle={t("As a Para-Legal Volunteer, you're the first responder. Confirm genuine emergencies and escalate them to a social worker.")}
        escalateLabel={t("Escalate to social worker")}
        emptyText={t("No incoming SOS alerts right now.")}
      />
    </div>
  );
}
