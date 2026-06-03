"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/LanguageProvider";

interface Tab {
  href: string;
  label: string;
  /** One-character emoji shown to the left of the label. */
  icon: string;
}

interface Props {
  tabs: Tab[];
  /** Optional sub-heading shown above the tab strip. */
  description?: string;
}

/** A simple horizontal tab strip used by the community side of the app to
 *  group several pages under a single sidebar entry — Speak to Us / SOS /
 *  Chat under "Help & Support", Case Tracker / Appointments under "Cases
 *  & Appointments". Highlights the active tab by matching the current
 *  pathname; otherwise just navigates. Keeping this dumb / Link-based
 *  means each underlying page keeps its own data-fetching logic — we don't
 *  rebuild them as a single mega-component. */
export default function SectionTabs({ tabs, description }: Props) {
  const pathname = usePathname();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 rounded-2xl border w-fit overflow-x-auto"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
              style={
                active
                  ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                  : { background: "transparent", color: "var(--muted)" }
              }
              prefetch
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
      {description && <p className="text-xs text-(--muted) px-1">{description}</p>}
    </div>
  );
}

/** Help & Support — Speak to Us / SOS / Chat. Used by the community
 *  pathway so all three help-seeking flows live under one sidebar item. */
export function CommunityHelpTabs() {
  const t = useT();
  return (
    <SectionTabs
      tabs={[
        { href: "/community/speak-to-us", label: t("Speak to us"), icon: "🎤" },
        { href: "/community/sos",         label: t("SOS"),         icon: "🚨" },
        { href: "/chat",                  label: t("Chat"),        icon: "💬" },
      ]}
      description={t("Reach out for help — record a voice message, raise an emergency alert, or chat with your social worker.")}
    />
  );
}

/** Cases & Appointments — surface case tracking and appointment booking
 *  under one sidebar entry. */
export function CommunityCasesTabs() {
  const t = useT();
  return (
    <SectionTabs
      tabs={[
        { href: "/community/case-tracker", label: t("Case tracker"), icon: "📂" },
        { href: "/community/appointments", label: t("Appointments"), icon: "📅" },
      ]}
      description={t("Track your cases and book meetings with your team.")}
    />
  );
}
