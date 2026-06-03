import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { translateOne } from "@/lib/translate-store";

/**
 * On-demand translation for user-entered case data (titles, facts, diary
 * entries, court-order briefs, verdicts, …). Powers the client <Translatable>.
 * NOT used for static UI labels (those go through the `t()` dictionary).
 *
 * Body:  { text: string; to: "en" | "hi" }
 * Returns: { text: string }   (the translation; the source on any failure)
 *
 * Goes through the persistent translation cache (lib/translate-store): the
 * same string is translated once ever and reused forever (in-process → MongoDB
 * → Claude), so we never re-spend tokens on data we've already translated.
 */
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

    if (!process.env.ANTHROPIC_API_KEY) {
      // Degrade gracefully — the caller falls back to the original text. Log
      // loudly so a misconfigured deployment (or an empty local .env.local) is
      // obvious rather than silently showing English.
      console.warn("[/api/translate] ANTHROPIC_API_KEY is not set — returning source text untranslated.");
      return NextResponse.json({ text: source, error: "missing_key" }, { status: 503 });
    }

    const translated = await translateOne(source, target);
    return NextResponse.json({ text: translated });
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
