"use client";

import { useMemo, useState } from "react";
import { DEMO_LEGAL_SOURCES } from "@/lib/jna-sourced/demo-data";
import { LEGAL_OUTPUT_MODES } from "@/lib/jna-sourced/constants";
import { claudeCall } from "@/lib/ai-client";
import { useT } from "@/components/i18n/LanguageProvider";

const MODE_LABELS: Record<string, string> = {
  statutory_explainer: "Statutory Explainer",
  case_digest:         "Case Digest",
  training_module:     "Training Module",
  flash_cards:         "Flash Cards",
  campaign_brief:      "Campaign Brief",
  legal_aid_checklist: "Legal-Aid Checklist",
};

function tokenize(s: string): string[] {
  return [...new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2))];
}

export default function LegalKnowledge() {
  const t = useT();
  const [request, setRequest] = useState("");
  const [audience, setAudience] = useState("district fellows");
  const [mode, setMode] = useState<typeof LEGAL_OUTPUT_MODES[number]>("statutory_explainer");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const matchedSources = useMemo(() => {
    if (!request.trim()) return [];
    const tokens = tokenize(request);
    return DEMO_LEGAL_SOURCES
      .map((s) => {
        const hay = (s.title + " " + s.plainLanguageSummary + " " + s.tags.join(" ") + " " + s.audienceTags.join(" ") + " " + s.content).toLowerCase();
        const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
        return { s, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.s);
  }, [request]);

  async function generate() {
    if (!request.trim()) { setMsg(t("Enter a research request first.")); return; }
    setLoading(true);
    setMsg("");
    setOutput("");

    const sourceBlock = matchedSources.length
      ? matchedSources.map((s, i) => `[${i + 1}] ${s.title} (${s.citation})\n   ${s.plainLanguageSummary}\n   Use: ${s.content}`).join("\n\n")
      : "(No matching sources in the demo library.)";

    const system = `You are a grounded legal-knowledge assistant for Jan Nyay Abhiyan, a legal-aid NGO operating in Bihar.
Audience: ${audience}.
Output mode: ${MODE_LABELS[mode]}.
Use ONLY the source records provided. Cite them inline as [1], [2], etc.
Be plain-spoken, India-specific, and practical.`;

    const userMsg = `Research request: ${request}\n\nGrounded sources:\n${sourceBlock}\n\nProduce a ${MODE_LABELS[mode]} suited to the audience.`;

    const text = await claudeCall(system, [{ role: "user", content: userMsg }], 1800);
    setOutput(text);
    setLoading(false);
    setMsg(t("Done."));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5 space-y-4">
        <div className="text-[10px] uppercase tracking-wider text-(--accent) font-bold">{t("Legal Knowledge")}</div>
        <h2 className="text-lg font-bold text-(--text)">{t("Grounded research")}</h2>
        <p className="text-xs text-(--muted)">{t("Query a vetted source library and generate audience-targeted output.")}</p>

        <div>
          <label className="text-[11px] text-(--muted) block mb-1">{t("Research request")}</label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            placeholder={t("e.g. Domestic violence — protection order and residence rights for a woman dispossessed by in-laws.")}
            className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text) placeholder:text-(--muted) focus:border-(--accent) outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-(--muted) block mb-1">{t("Audience")}</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
            >
              <option>district fellows</option>
              <option>lawyers</option>
              <option>social workers</option>
              <option>campaign team</option>
              <option>community members</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-(--muted) block mb-1">{t("Output mode")}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
            >
              {LEGAL_OUTPUT_MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-(--accent) text-black rounded-lg px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("Generating…") : t("Generate grounded output")}
        </button>
        {msg && <p className="text-xs text-(--accent)">{msg}</p>}

        {matchedSources.length > 0 && (
          <div className="border-t border-(--border) pt-4">
            <div className="text-[11px] text-(--muted) uppercase tracking-wider mb-2">{t("Matched sources")}</div>
            <ol className="space-y-2">
              {matchedSources.map((s, i) => (
                <li key={s.id} className="text-xs">
                  <span className="text-(--accent) font-bold">[{i + 1}]</span>{" "}
                  <span className="text-(--text) font-semibold">{s.title}</span>
                  <div className="text-(--muted) text-[11px] mt-0.5">{s.citation} · {s.documentType}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-wider text-(--accent) font-bold mb-2">{t("Output")}</div>
        {output ? (
          <pre className="whitespace-pre-wrap text-xs text-(--text) font-sans leading-relaxed">{output}</pre>
        ) : (
          <p className="text-xs text-(--muted)">{t("Enter a research request and generate to see grounded output here.")}</p>
        )}
      </section>
    </div>
  );
}
