"use client";

import { useMemo, useState } from "react";
import { DEMO_CASES } from "@/lib/jna-sourced/demo-data";
import { claudeCall } from "@/lib/ai-client";
import { useT } from "@/components/i18n/LanguageProvider";

const DOC_TYPES = [
  "Criminal Writ Petition",
  "PIL",
  "Anticipatory Bail Application",
  "Regular Bail Application",
  "Application u/s 156(3) CrPC",
  "Application u/s 482 CrPC",
  "Representation to SP / DM",
  "Legal Notice",
  "Affidavit",
  "Revision Petition",
  "Criminal Appeal",
  "Contempt Petition",
  "Protection Order Application (PWDVA)",
  "Compensation Petition",
  "Habeas Corpus",
];

export default function Drafter() {
  const t = useT();
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [directions, setDirections] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const linkedCase = useMemo(
    () => DEMO_CASES.find((c) => c.id === linkedCaseId) ?? null,
    [linkedCaseId],
  );

  async function draft() {
    if (!directions.trim() && !linkedCase) {
      setMessage(t("Add directions or link a case first."));
      return;
    }
    setLoading(true);
    setMessage("");
    setOutput("");

    const caseBlock = linkedCase
      ? `Linked case:
- Title: ${linkedCase.title}
- Client: ${linkedCase.client}
- Respondent: ${linkedCase.respondent}
- Court: ${linkedCase.court}
- Case No.: ${linkedCase.caseNo || "—"}
- FIR No.: ${linkedCase.firNo || "—"}
- Facts: ${linkedCase.facts}
- Grounds: ${linkedCase.grounds}
- Relief: ${linkedCase.relief}`
      : "(No linked case.)";

    const system = `You are a senior Indian advocate drafting court-facing documents for Jan Nyay Abhiyan.
Draft a "${docType}" suitable for filing. Use Indian legal style: cause title, prayer, paragraphs, citations.
If grounds reference Supreme Court cases, preserve them verbatim.`;

    const userMsg = `${caseBlock}\n\nAdvocate directions:\n${directions || "(none)"}\n\nProduce a complete draft of: ${docType}`;

    const text = await claudeCall(system, [{ role: "user", content: userMsg }], 3000);
    setOutput(text);
    setLoading(false);
    setMessage(t("Draft generated."));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5 space-y-4">
        <div className="text-[11px] uppercase tracking-wider text-(--accent) font-bold">{t("Senior Advocate Mode")}</div>
        <h2 className="text-lg font-bold text-(--text)">{t("AI Drafter")}</h2>
        <p className="text-xs text-(--muted)">{t("Server-side legal drafting with case-linked context.")}</p>

        <div>
          <label className="text-[12px] text-(--muted) block mb-1">{t("Document type")}</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
          >
            {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[12px] text-(--muted) block mb-1">{t("Link case (optional)")}</label>
          <select
            value={linkedCaseId}
            onChange={(e) => setLinkedCaseId(e.target.value)}
            className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text)"
          >
            <option value="">{t("— None —")}</option>
            {DEMO_CASES.map((c) => <option key={c.id} value={c.id}>{c.client} · {c.caseNo || "no number"}</option>)}
          </select>
          {linkedCase && (
            <p className="text-[12px] text-(--muted) mt-1">
              {t("Will inject facts, grounds, and relief from")} <span className="text-(--accent)">{linkedCase.title}</span>.
            </p>
          )}
        </div>

        <div>
          <label className="text-[12px] text-(--muted) block mb-1">{t("Advocate directions")}</label>
          <textarea
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            rows={6}
            placeholder={t("e.g. Emphasise mandatory investigation under Lalita Kumari; pray for SIT direction.")}
            className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text) placeholder:text-(--muted) focus:border-(--accent) outline-none"
          />
        </div>

        <button
          onClick={draft}
          disabled={loading}
          className="w-full bg-(--accent) text-black rounded-lg px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("Drafting…") : t("Draft document")}
        </button>
        {message && <p className="text-xs text-(--accent)">{message}</p>}
      </section>

      <section className="bg-(--surface) border border-(--border) rounded-2xl p-5">
        <div className="text-[11px] uppercase tracking-wider text-(--accent) font-bold mb-2">{t("Draft output")}</div>
        {output ? (
          <pre className="whitespace-pre-wrap text-xs text-(--text) font-mono leading-relaxed">{output}</pre>
        ) : (
          <p className="text-xs text-(--muted)">
            {t("Choose a document type, optionally link a case, and provide directions to generate a draft.")}
          </p>
        )}
      </section>
    </div>
  );
}
