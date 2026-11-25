"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import PageHeader from "@/components/ui/PageHeader";
import RichText from "@/components/insights/RichText";

type QueryTrace = {
  spec?: { dataset?: string };
  summary?: string;
  result?: { measure: string; groups: string[]; truncated: boolean; rows: { group?: string[]; period?: string; value: number | string }[] };
  error?: string;
  skipped?: boolean;
};
type Step =
  | { status: "done"; runId: string; text: string; queries: QueryTrace[] }
  | { status: "needs_approval"; runId: string; proposed: { id: string; summary: string }[]; queries: QueryTrace[] };
type Message = { role: "user" | "assistant"; content: string; queries?: QueryTrace[]; failed?: boolean };

const SUGGESTIONS = [
  "How many live cases do we have in each district?",
  "How many hearings were logged each month this financial year?",
  "Which lawyers carry the most live cases?",
  "How much was spent on expenses last quarter, by category?",
  "How many cases have no next hearing date?",
];

/**
 * Ask questions in plain language; answers are built from aggregate queries
 * only. When approval is on (the default), each query Copilot wants to run is
 * shown first, in plain words, and runs only when the person agrees.
 */
export default function CopilotPage() {
  const status = useApi<{ ok: boolean; reason?: string; requireApproval: boolean }>("/api/insights/copilot");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<{ runId: string; proposed: { id: string; summary: string }[] } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy, waiting]);

  function take(step: Step, thread: Message[]) {
    if (step.status === "needs_approval") {
      setWaiting({ runId: step.runId, proposed: step.proposed });
      return;
    }
    setWaiting(null);
    setMessages([...thread, { role: "assistant", content: step.text, queries: step.queries }]);
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy || waiting) return;
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const history = next.filter((m) => !m.failed).map((m) => ({ role: m.role, content: m.content }));
      take(await api<Step>("/api/insights/copilot", { body: { messages: history } }), next);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: (e as Error).message, failed: true }]);
    } finally {
      setBusy(false);
    }
  }

  async function decide(approve: string[]) {
    if (!waiting || busy) return;
    const { runId } = waiting;
    setBusy(true);
    setWaiting(null);
    try {
      take(await api<Step>(`/api/insights/copilot/runs/${runId}`, { body: { approve } }), messages);
    } catch (e) {
      setMessages([...messages, { role: "assistant", content: (e as Error).message, failed: true }]);
    } finally {
      setBusy(false);
    }
  }

  const disabled = status.data && !status.data.ok;

  return (
    <div className="space-y-5">
      <PageHeader icon="💬" title="Copilot" subtitle="Ask about the numbers in plain language">
        {messages.length > 0 && <button className="btn-secondary" onClick={() => { setMessages([]); setWaiting(null); }}>New conversation</button>}
        <Link href="/director/insights/settings" className="btn-secondary">Settings</Link>
      </PageHeader>

      <div className="rounded-2xl border border-(--border) p-4 text-xs text-(--muted) space-y-1" style={{ background: "var(--bg-secondary)" }}>
        <p>
          Copilot works only with totals. It never sees a case file, a name, a case title or a document; it can only run the same grouped
          counts that the chart builder runs, and any group smaller than 3 is reported as &ldquo;fewer than 3&rdquo; before anything leaves the
          server. Those totals are sent to Anthropic to write the answer. Imported datasets are not available to it.
        </p>
        <p>
          {status.data?.requireApproval === false
            ? "Queries run without asking first (a director can change this in Settings)."
            : "Before each query runs you are shown what it will count and can approve or skip it."}
          {" "}Check important figures against the dashboards before quoting them; open &ldquo;How this was worked out&rdquo; under any answer to see the queries.
        </p>
      </div>

      {disabled && (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning-text)" }}>
          {status.data?.reason}
        </div>
      )}

      <div className="rounded-2xl border border-(--border) p-4 space-y-4 min-h-72" style={{ background: "var(--surface)" }}>
        {messages.length === 0 && !disabled && (
          <div className="space-y-2">
            <p className="text-sm text-(--muted)">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy || !status.data}
                  className="rounded-full border border-(--border) px-3 py-1.5 text-sm text-(--text) hover:border-(--accent)">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", color: "var(--text)" }}>
              {m.content}
            </p>
          </div>
        ) : (
          <div key={i} className="max-w-[90%] space-y-2">
            {m.failed
              ? <p className="text-sm text-(--error-text)">{m.content}</p>
              : <RichText text={m.content} />}
            {m.queries && m.queries.length > 0 && <Trace queries={m.queries} />}
          </div>
        ))}

        {waiting && (
          <div className="max-w-[90%] rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--accent)" }} role="group" aria-label="Queries waiting for approval">
            <p className="text-sm font-semibold text-(--text)">
              To answer, Copilot wants to run {waiting.proposed.length === 1 ? "this query" : `these ${waiting.proposed.length} queries`}:
            </p>
            <ul className="space-y-2">
              {waiting.proposed.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-secondary)" }}>
                  <span className="flex-1 min-w-60 text-sm text-(--text)">{p.summary}</span>
                  {waiting.proposed.length > 1 && (
                    <button className="btn-secondary" disabled={busy} onClick={() => decide([p.id])}>Run only this</button>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-(--muted)">Only the grouped totals go to Anthropic, with groups under 3 hidden. Nothing runs until you choose.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={busy} onClick={() => decide(waiting.proposed.map((p) => p.id))}>
                {waiting.proposed.length === 1 ? "Run it" : "Run all"}
              </button>
              <button className="btn-secondary" disabled={busy} onClick={() => decide([])}>Skip</button>
            </div>
          </div>
        )}

        {busy && <p className="text-sm text-(--muted)">Working it out…</p>}
        <div ref={endRef} />
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <textarea className="flex-1 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--text) focus:outline-none focus:border-(--accent) min-h-12"
          rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={!!disabled || !!waiting}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder={disabled ? "Copilot is not available" : waiting ? "Approve or skip the queries above first" : "Ask a question about cases, hearings, expenses, trainings…"} />
        <button className="btn-primary self-end" type="submit" disabled={busy || !input.trim() || !!disabled || !!waiting}>Ask</button>
      </form>
    </div>
  );
}

function Trace({ queries }: { queries: QueryTrace[] }) {
  return (
    <details className="rounded-lg border border-(--border) text-xs">
      <summary className="cursor-pointer px-3 py-2 text-(--muted)">How this was worked out ({queries.length} quer{queries.length === 1 ? "y" : "ies"})</summary>
      <div className="px-3 pb-3 space-y-3">
        {queries.map((q, i) => (
          <div key={i} className="space-y-1">
            <p className="text-(--text)">{q.summary ?? `A query on ${q.spec?.dataset ?? "the data"}`}</p>
            {q.skipped && <p className="text-(--muted)">Not run: you skipped it.</p>}
            {q.error && <p className="text-(--error-text)">{q.error}</p>}
            {q.result && (
              <table className="w-full">
                <tbody>
                  {q.result.rows.slice(0, 25).map((r, j) => (
                    <tr key={j} className="border-t border-(--border)">
                      <td className="py-1 pr-3 text-(--muted)">{[...(r.group ?? []), r.period ?? ""].filter(Boolean).join(" · ") || "Total"}</td>
                      <td className="py-1 text-right tabular-nums text-(--text)">{typeof r.value === "number" ? r.value.toLocaleString("en-IN") : r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {q.result && q.result.rows.length > 25 && <p className="text-(--muted)">…and {q.result.rows.length - 25} more rows</p>}
          </div>
        ))}
      </div>
    </details>
  );
}
