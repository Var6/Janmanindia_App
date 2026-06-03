import type { Lang } from "@/lib/i18n";

/** Client-side cache of on-demand translations, keyed by `${target}:${source}`.
 *  Mirrors the server cache so re-toggling a field in the same session is
 *  instant and free. */
const cache = new Map<string, string>();

/** Translate a piece of user-entered text into `to` via /api/translate.
 *  Returns the source string unchanged on any failure so the UI never breaks. */
export async function translateText(text: string, to: Lang): Promise<string> {
  const source = text ?? "";
  if (!source.trim()) return source;
  const key = `${to}:${source}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const r = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: source, to }),
    });
    const d = (await r.json()) as { text?: string; error?: string };
    // On any failure (e.g. the API key isn't configured), return the source
    // WITHOUT caching it — so once the deployment is fixed a reload retries
    // instead of being stuck on the English fallback.
    if (!r.ok || d.error) {
      warnOnce(d.error);
      return source;
    }
    const out = typeof d.text === "string" && d.text ? d.text : source;
    cache.set(key, out);
    return out;
  } catch {
    return source;
  }
}

let warned = false;
function warnOnce(error?: string) {
  if (warned) return;
  warned = true;
  if (error === "missing_key") {
    console.warn(
      "[translate] ANTHROPIC_API_KEY is not configured on this deployment — " +
      "case data is shown in its original language. Set the key (it's already " +
      "in Vercel for production; add it to .env.local for local dev) to enable Hindi/English data translation."
    );
  } else if (error) {
    console.warn(`[translate] translation unavailable: ${error}`);
  }
}
