import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "@/lib/i18n";

/**
 * Server-side BATCH translation for list views (case titles, etc.).
 *
 * Translating one row at a time from the client would fire dozens of API calls
 * per page and rate-limit. Instead a server component calls this once with all
 * the strings on the page — it translates the cache-misses in a SINGLE model
 * call, caches each result in-process, and returns a lookup. Reliable (no
 * per-row flakiness), and warm pages cost nothing.
 *
 *   const tt = await translateTitles(cases.map(c => c.caseTitle), lang);
 *   <p>{tt(c.caseTitle)}</p>
 *
 * Degrades safely: when the language is English, the key is missing, or the
 * model errors, it returns the original strings unchanged.
 */

const cache = new Map<string, string>(); // `${lang}:${source}` → translation
const CACHE_MAX = 5000;

function cacheSet(key: string, value: string) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/** Translate a list of strings into `to`, returning a lookup fn original→translated. */
export async function translateTitles(
  texts: Array<string | null | undefined>,
  to: Lang,
): Promise<(s: string | null | undefined) => string> {
  const passthrough = (s: string | null | undefined) => (s ?? "").toString();
  if (to === "en") return passthrough;

  const sources = texts.map((t) => (t ?? "").toString());
  const misses = [...new Set(sources.filter((s) => s.trim() && !cache.has(`${to}:${s}`)))];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && misses.length > 0) {
    try {
      const client = new Anthropic({ apiKey });
      const langName = to === "hi" ? "Hindi (Devanagari script)" : "English";
      const system =
        `You translate short legal-case titles/labels for an Indian legal-aid NGO into ${langName}. ` +
        `Rules: transliterate people's / place names into the target script (don't translate their meaning); ` +
        `keep case numbers, section numbers, dates and "vs"/"v/s" intact; be concise. ` +
        `You are given a JSON array of strings. Return ONLY a JSON array of the SAME length in the SAME order — ` +
        `each element the translation of the corresponding input. No prose, no keys, no code fences.`;
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: Math.min(8192, misses.join("").length * 3 + 512),
        system,
        messages: [{ role: "user", content: JSON.stringify(misses) }],
      });
      const raw = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end > start) {
        const arr = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(arr) && arr.length === misses.length) {
          misses.forEach((src, i) => cacheSet(`${to}:${src}`, typeof arr[i] === "string" && arr[i] ? arr[i] : src));
        }
      }
    } catch {
      // Leave misses untranslated — the lookup falls back to the source.
    }
  }

  return (s) => {
    const src = (s ?? "").toString();
    return cache.get(`${to}:${src}`) ?? src;
  };
}
