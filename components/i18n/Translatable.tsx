"use client";

import { useState } from "react";
import { useLang, useT } from "@/components/i18n/LanguageProvider";
import { translateText } from "@/lib/translate-client";

/**
 * Renders a block of user-entered text with a small "Translate" toggle.
 *
 * Clicking translates the text into the *active* app language (Hindi when the
 * app is in Hindi, English when in English) via /api/translate, then lets the
 * reader flip back to the original. Translation is opt-in and visible — we
 * never silently rewrite case data — and results are cached per session.
 *
 * Use this for free-text the user typed (case facts, diary entries, court
 * order briefs, verdicts, titles). Static UI labels use `t()` instead.
 */
export default function Translatable({
  text,
  className,
  preLine = true,
}: {
  text?: string | null;
  className?: string;
  /** Render with whitespace-pre-line (default) — most case text is multi-line. */
  preLine?: boolean;
}) {
  const { lang } = useLang();
  const t = useT();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const source = (text ?? "").toString();
  if (!source.trim()) return null;

  async function toggle() {
    if (showTranslated) { setShowTranslated(false); return; }
    if (translated !== null) { setShowTranslated(true); return; }
    setLoading(true); setFailed(false);
    try {
      const out = await translateText(source, lang);
      setTranslated(out);
      setShowTranslated(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const display = showTranslated && translated !== null ? translated : source;

  return (
    <span className={className}>
      <span className={preLine ? "whitespace-pre-line" : undefined}>{display}</span>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="ml-2 inline-flex items-center gap-1 align-baseline text-[10px] font-semibold hover:underline disabled:opacity-60"
        style={{ color: "var(--accent)" }}
        title={showTranslated ? t("Show original") : t("Translate")}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
          <path d="M2 4h6M5 2.5v1.5c0 2.5-1.2 4.5-3 5.5M3.5 7c.6 1.2 1.8 2.2 3.5 2.8" strokeLinecap="round" />
          <path d="M9 13.5l2.5-6 2.5 6M9.8 11.8h3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {loading ? t("Translating…") : showTranslated ? t("Show original") : t("Translate")}
      </button>
      {failed && (
        <span className="ml-1.5 text-[10px]" style={{ color: "var(--error-text)" }}>
          {t("Translation failed")}
        </span>
      )}
    </span>
  );
}
