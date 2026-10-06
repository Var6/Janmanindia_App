"use client";

import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/insights/client";
import type { QuerySpec } from "@/lib/insights/types";
import PageHeader from "@/components/ui/PageHeader";
import RichText from "@/components/insights/RichText";
import { useDatasets } from "@/components/insights/QueryBuilder";

type QueryTrace = {
  spec: QuerySpec;
  result?: { measure: string; groups: string[]; truncated: boolean; rows: { group?: string[]; period?: string; value: number | string }[] };
  error?: string;
};
type Message = { role: "user" | "assistant"; content: string; queries?: QueryTrace[]; failed?: boolean };

const SUGGESTIONS = [
  "How many live cases do we have in each district?",
  "How many hearings were logged each month this financial year?",
  "Which lawyers carry the most live cases?",
  "How much was spent on expenses last quarter, by category?",
  "How many cases have no next hearing date?",
];

/** Ask questions in plain language; answers are built from aggregate queries only. */
export default function CopilotPage() {
  const status = useApi<{ ok: boolean; reason?: string }>("/api/insights/copilot");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const history = next.filter((m) => !m.failed).map((m) => ({ role: m.role, content: m.content }));
      const r = await api<{ text: string; queries: QueryTrace[] }>("/api/insights/copilot", { body: { messages: history } });
      setMessages([...next, { role: "assistant", content: r.text, queries: r.queries }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: (e as Error).message, failed: true }]);
    } finally {
      setBusy(false);
    }
  }

  const disabled = status.data && !status.data.ok;

  return (
    <div className="space-y-5">
      <PageHeader icon="💬" title="Copilot" subtitle="Ask about the numbers in plain language">
        {messages.length > 0 && <button className="btn-secondary" onClick={() => setMessages([])}>New conversation</button>}
      </PageHeader>

      <div className="rounded-2xl border border-(--border) p-4 text-xs text-(--muted) space-y-1" style={{ background: "var(--bg-secondary)" }}>
        <p>
          Copilot works only with totals. It never sees a case file, a name, a case title or a document; it can only run the same grouped
          counts that the chart builder runs, and any group smaller than 3 is reported as &ldquo;fewer than 3&rdquo; before anything leaves the
          server. Those totals are sent to Anthropic to write the answer. Imported datasets are not available to it.
        </p>
        <p>Check important figures against the dashboards before quoting them; open &ldquo;How this was worked out&rdquo; under any answer to see the exact queries.</p>
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

        {busy && <p className="text-sm text-(--muted)">Working it out…</p>}
        <div ref={endRef} />
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <textarea className="flex-1 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--text) focus:outline-none focus:border-(--accent) min-h-12"
          rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={!!disabled}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder={disabled ? "Copilot is not available" : "Ask a question about cases, hearings, expenses, trainings…"} />
        <button className="btn-primary self-end" type="submit" disabled={busy || !input.trim() || !!disabled}>Ask</button>
      </form>
    </div>
  );
}

function Trace({ queries }: { queries: QueryTrace[] }) {
  const { datasets } = useDatasets();
  return (
    <details className="rounded-lg border border-(--border) text-xs">
      <summary className="cursor-pointer px-3 py-2 text-(--muted)">How this was worked out ({queries.length} quer{queries.length === 1 ? "y" : "ies"})</summary>
      <div className="px-3 pb-3 space-y-3">
        {queries.map((q, i) => {
          const ds = datasets.find((d) => d.key === q.spec?.dataset);
          const label = (k: string) => ds?.fields.find((f) => f.key === k)?.label ?? k;
          const parts = [
            ds?.label ?? q.spec?.dataset,
            q.result?.measure ?? q.spec?.measure?.agg,
            q.spec?.groupBy?.length ? `by ${q.spec.groupBy.map(label).join(" and ")}` : "",
            q.spec?.time ? `per ${q.spec.time.grain} of ${label(q.spec.time.field)}` : "",
            q.spec?.filters?.length ? `filtered on ${q.spec.filters.map((f) => label(f.field)).join(", ")}` : "",
            q.spec?.range?.preset && q.spec.range.preset !== "all" ? q.spec.range.preset.replace(/_/g, " ") : "",
          ].filter(Boolean);
          return (
            <div key={i} className="space-y-1">
              <p className="text-(--text)">{parts.join(" · ")}</p>
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
          );
        })}
      </div>
    </details>
  );
}
