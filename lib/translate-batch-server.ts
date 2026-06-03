import "server-only";
import type { Lang } from "@/lib/i18n";
import { translateMany } from "@/lib/translate-store";

/**
 * Server-side BATCH translation for list views (case titles, etc.).
 *
 * A server component calls this once with all the strings on the page; it
 * resolves them through the persistent translation cache (in-process → MongoDB
 * → Claude, see lib/translate-store) in a single round and returns a lookup.
 * Each unique string is translated once ever and reused forever, so warm pages
 * cost nothing and we never re-spend tokens on data we've already seen.
 *
 *   const tt = await translateTitles(cases.map(c => c.caseTitle), lang);
 *   <p>{tt(c.caseTitle)}</p>
 *
 * Degrades safely to the original text (English language, missing API key on
 * local dev, DB down, or model error).
 */
export async function translateTitles(
  texts: Array<string | null | undefined>,
  to: Lang,
): Promise<(s: string | null | undefined) => string> {
  if (to === "en") return (s) => (s ?? "").toString();
  const map = await translateMany(texts, to);
  return (s) => {
    const src = (s ?? "").toString();
    return map.get(src) ?? src;
  };
}
