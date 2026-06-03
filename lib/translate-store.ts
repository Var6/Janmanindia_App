import "server-only";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "@/lib/mongoose";
import Translation from "@/models/Translation";
import type { Lang } from "@/lib/i18n";

/**
 * Persistent, shared translation for incoming DB data (case titles, names,
 * free text, …). Three tiers, cheapest first:
 *   1. in-process memory   (free, this server instance)
 *   2. MongoDB cache       (free, survives restarts/deploys — translated once ever)
 *   3. Claude (Haiku)      (only for never-seen strings; result is persisted)
 *
 * Both the /api/translate endpoint (client <Translatable>) and the server-side
 * list batch go through here, so a given string is translated a single time
 * for the whole platform. Everything degrades to the original text on failure
 * (English language, missing API key on local dev, DB down, or model error).
 */

const mem = new Map<string, string>();      // `${lang}:${source}` → translated
const MEM_MAX = 10000;
const memSet = (k: string, v: string) => {
  if (mem.size >= MEM_MAX) { const o = mem.keys().next().value; if (o !== undefined) mem.delete(o); }
  mem.set(k, v);
};

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Translate many strings into `to`. Returns a Map(source → translated). */
export async function translateMany(
  raw: Array<string | null | undefined>,
  to: Lang,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const norm = raw.map((s) => (s ?? "").toString());
  if (to === "en") { for (const s of norm) out.set(s, s); return out; }

  const sources = [...new Set(norm.filter((s) => s.trim()))];
  if (sources.length === 0) { for (const s of norm) out.set(s, s); return out; }

  // Tier 1 — in-process memory.
  const afterMem: string[] = [];
  for (const s of sources) {
    const hit = mem.get(`${to}:${s}`);
    if (hit !== undefined) out.set(s, hit);
    else afterMem.push(s);
  }

  // Tier 2 — Mongo cache.
  let misses = afterMem;
  if (misses.length > 0) {
    try {
      await connectDB();
      const hashes = misses.map(hash);
      const docs = await Translation.find({ lang: to, srcHash: { $in: hashes } }).select("srcHash text").lean();
      const byHash = new Map(docs.map((d) => [d.srcHash, d.text]));
      const next: string[] = [];
      for (const s of misses) {
        const t = byHash.get(hash(s));
        if (t !== undefined) { out.set(s, t); memSet(`${to}:${s}`, t); }
        else next.push(s);
      }
      misses = next;
    } catch {
      // DB unavailable — fall through to the model / source fallback.
    }
  }

  // Tier 3 — translate the never-seen strings once, then persist.
  if (misses.length > 0) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey });
        const langName = to === "hi" ? "Hindi (Devanagari script)" : "English";
        const system =
          `You translate short text for an Indian legal-aid NGO (Janman) into ${langName}. ` +
          `Rules: transliterate people's / place / organisation names into the target script (do not translate their meaning); ` +
          `keep case numbers, section numbers, dates, money amounts and "vs"/"v/s" unchanged; preserve line breaks; be faithful and concise. ` +
          `You are given a JSON array of strings. Return ONLY a JSON array of the SAME length and order — each element the translation of the corresponding input. No prose, no code fences.`;
        const res = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: Math.min(8192, misses.join("").length * 3 + 512),
          system,
          messages: [{ role: "user", content: JSON.stringify(misses) }],
        });
        const rawTxt = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text).join("").trim();
        const a = rawTxt.indexOf("["), b = rawTxt.lastIndexOf("]");
        if (a !== -1 && b > a) {
          const arr = JSON.parse(rawTxt.slice(a, b + 1));
          if (Array.isArray(arr) && arr.length === misses.length) {
            const ops = misses.map((s, i) => {
              const tx = typeof arr[i] === "string" && arr[i] ? arr[i] : s;
              out.set(s, tx); memSet(`${to}:${s}`, tx);
              return { updateOne: {
                filter: { lang: to, srcHash: hash(s) },
                update: { $setOnInsert: { lang: to, srcHash: hash(s), source: s, text: tx } },
                upsert: true,
              } };
            });
            try { await connectDB(); await Translation.bulkWrite(ops, { ordered: false }); } catch { /* cache write best-effort */ }
          }
        }
      } catch {
        // Model error — leave as source below.
      }
    }
  }

  // Anything still unresolved → original text.
  for (const s of norm) if (!out.has(s)) out.set(s, s);
  return out;
}

/** Convenience: translate a single string (used by the /api/translate route). */
export async function translateOne(source: string, to: Lang): Promise<string> {
  const m = await translateMany([source], to);
  return m.get(source) ?? source;
}
