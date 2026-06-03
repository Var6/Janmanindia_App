import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth";

/**
 * On-demand translation for user-entered case data (titles, facts, diary
 * entries, court-order briefs, verdicts, …). Powers the per-field "Translate"
 * button on the case detail page — it is NOT used for static UI labels (those
 * go through the `t()` dictionary in lib/i18n.ts).
 *
 * Body:  { text: string; to: "en" | "hi" }
 * Returns: { text: string }   (the translation; the source on any failure)
 *
 * Translations are cached in-process keyed by (target, source) so repeated
 * views of the same field don't re-hit the model. The API key stays
 * server-side.
 */

// Process-level cache. Bounded so a long-lived server can't grow unbounded —
// once full we drop the oldest entry (Map preserves insertion order).
const cache = new Map<string, string>();
const CACHE_MAX = 2000;

function cacheGet(key: string): string | undefined {
  return cache.get(key);
}
function cacheSet(key: string, value: string): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi (Devanagari script)" };

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const { text, to } = (await req.json()) as { text?: unknown; to?: unknown };
    const source = typeof text === "string" ? text : "";
    const target = to === "hi" ? "hi" : to === "en" ? "en" : null;

    if (!source.trim()) return NextResponse.json({ text: source ?? "" });
    if (!target) {
      return NextResponse.json({ error: "`to` must be 'en' or 'hi'" }, { status: 400 });
    }
    // Guard pathological sizes — these are case fields, not documents.
    if (source.length > 8000) {
      return NextResponse.json({ error: "Text too long to translate." }, { status: 413 });
    }

    const key = `${target}:${source}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return NextResponse.json({ text: cached, cached: true });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Degrade gracefully — the caller falls back to the original text. Log
      // loudly so a misconfigured deployment (or an empty local .env.local) is
      // obvious rather than silently showing English.
      console.warn("[/api/translate] ANTHROPIC_API_KEY is not set — returning source text untranslated.");
      return NextResponse.json({ text: source, error: "missing_key" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const system =
      `You are a professional translator for Janman, a legal-aid NGO in India. ` +
      `Translate the user's text into ${LANG_NAME[target]}. ` +
      `This is legal case data, so be faithful and precise. Rules:\n` +
      `- Translate ONLY into ${LANG_NAME[target]}; if the text is already in that language, return it unchanged.\n` +
      `- Keep people's names, place names, and organisation names as proper nouns — transliterate them naturally into the target script rather than translating their meaning.\n` +
      `- Never change numbers, dates, money amounts, FIR/section/case numbers, or URLs.\n` +
      `- Preserve line breaks and overall formatting.\n` +
      `- Output ONLY the translation. No preamble, quotes, notes, or explanations.`;

    const res = await client.messages.create({
      // Haiku is fast + cheap and more than capable for translation, which
      // keeps per-field latency and cost low when a page localises many values.
      model: "claude-haiku-4-5-20251001",
      max_tokens: Math.min(4096, Math.ceil(source.length * 2) + 256),
      system,
      messages: [{ role: "user", content: source }],
    });

    const out = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const translated = out || source;
    cacheSet(key, translated);
    return NextResponse.json({ text: translated });
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
