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
    const d = (await r.json()) as { text?: string };
    const out = typeof d.text === "string" && d.text ? d.text : source;
    cache.set(key, out);
    return out;
  } catch {
    return source;
  }
}
