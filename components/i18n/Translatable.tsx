"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/i18n/LanguageProvider";
import { translateText } from "@/lib/translate-client";

/**
 * Renders a piece of user-entered text (case facts, titles, party names, court
 * names, diary entries, …) and AUTOMATICALLY shows it in the active app
 * language. There is no per-field button — the single language switch in the
 * profile drives everything. When the app is in Hindi, the text is translated
 * via /api/translate (cached per session, so repeat views are instant); in
 * English it shows exactly as entered.
 *
 * While a first-time Hindi translation is in flight the original text is shown,
 * then swapped in place once it resolves — so the UI never blocks or flickers
 * empty. On any failure it simply keeps the original.
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
  // Cache the last resolved translation alongside the source it was for, so a
  // changed `text` falls back to the original until its translation resolves
  // (and so we never call setState synchronously inside the effect).
  const [result, setResult] = useState<{ src: string; hi: string } | null>(null);

  const source = (text ?? "").toString();

  useEffect(() => {
    if (lang !== "hi" || !source.trim()) return;
    let cancelled = false;
    translateText(source, "hi")
      .then((out) => { if (!cancelled) setResult({ src: source, hi: out }); })
      .catch(() => { /* keep original on failure */ });
    return () => { cancelled = true; };
  }, [lang, source]);

  if (!source.trim()) return null;

  const display = lang === "hi" && result && result.src === source ? result.hi : source;

  if (!preLine) return <span className={className}>{display}</span>;
  return <span className={className}><span className="whitespace-pre-line">{display}</span></span>;
}
