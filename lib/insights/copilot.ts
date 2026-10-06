import Anthropic from "@anthropic-ai/sdk";
import { runQuery, InsightQueryError, IMPORT_PREFIX } from "@/lib/insights/query";
import { DATASETS } from "@/lib/insights/datasets";
import { cleanQuery } from "@/lib/insights/validate";
import type { QueryResult, QuerySpec } from "@/lib/insights/types";

/**
 * Copilot on aggregates only.
 *
 * The model never sees a record. It can only call one tool, run_query, whose
 * input is the same whitelisted spec the chart builder uses, and it gets back
 * grouped counts and sums. Free-text fields that could identify a person are
 * not in the catalogue at all, and any group smaller than MIN_CELL is reported
 * as "fewer than 3" so small groups (one POCSO case in one district, say)
 * cannot single anyone out.
 *
 * Imported datasets (CSV, Sheets, Kobo) are left out: their columns are not
 * vetted and could hold names that would come back as group labels.
 */

export const MIN_CELL = 3;
const MAX_TOOL_CALLS = 6;

export function copilotEnabled(): { ok: boolean; reason?: string } {
  if (process.env.INSIGHTS_COPILOT !== "on") {
    return { ok: false, reason: "Copilot is switched off. A director can turn it on by setting INSIGHTS_COPILOT=on in the app's environment, after deciding that aggregate figures may be sent to Anthropic." };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: "ANTHROPIC_API_KEY is not set for this deployment." };
  return { ok: true };
}

/** Replace small counts with a marker before anything leaves the server. */
export function suppressSmallCells(spec: QuerySpec, res: QueryResult) {
  const isCount = spec.measure.agg === "count" || spec.measure.agg === "countDistinct";
  const grouped = (spec.groupBy?.length ?? 0) > 0 || !!spec.time;
  return {
    measure: res.measureLabel,
    groups: res.groupLabels,
    truncated: res.truncated,
    rows: res.rows.map((r) => ({
      ...(r.keys.length ? { group: r.keys } : {}),
      ...(r.period ? { period: r.period.slice(0, 10) } : {}),
      value: isCount && grouped && r.value > 0 && r.value < MIN_CELL ? `fewer than ${MIN_CELL}` : r.value,
    })),
  };
}

function catalogue(): string {
  return DATASETS.map((d) => {
    const fields = d.fields.map((f) => {
      const tags = [f.type, f.dimension ? "groupable" : "", f.measurable ? "summable" : "", f.multi ? "multi-valued" : ""].filter(Boolean).join(", ");
      const vals = f.values?.length ? ` values: ${f.values.join(" | ")}` : "";
      return `    - ${f.key} (${f.label}; ${tags})${vals}`;
    }).join("\n");
    return `- dataset "${d.key}": ${d.label}. ${d.description} One record = one of "${d.unit}". Default date: ${d.defaultDate}.\n${fields}`;
  }).join("\n");
}

const TOOL: Anthropic.Tool = {
  name: "run_query",
  description:
    "Run an aggregate query over Janman's data and get grouped totals back. You never get individual records. " +
    "Use filters with op in/nin (value: list of strings), isTrue/isFalse (booleans), gte/lte (dates as YYYY-MM-DD or numbers). " +
    "District values are canonical Bihar district names, \"Unspecified\" or \"Outside Bihar\".",
  input_schema: {
    type: "object",
    properties: {
      dataset: { type: "string" },
      measure: { type: "object", properties: { agg: { type: "string", enum: ["count", "countDistinct", "sum", "avg", "min", "max"] }, field: { type: "string" } }, required: ["agg"] },
      filters: { type: "array", items: { type: "object", properties: { field: { type: "string" }, op: { type: "string" }, value: {} }, required: ["field", "op"] } },
      groupBy: { type: "array", items: { type: "string" }, maxItems: 2 },
      time: { type: "object", properties: { field: { type: "string" }, grain: { type: "string", enum: ["day", "week", "month", "quarter", "year"] } } },
      range: { type: "object", properties: { field: { type: "string" }, preset: { type: "string", enum: ["all", "last_30_days", "last_90_days", "last_6_months", "last_12_months", "this_month", "this_fy", "last_fy", "custom"] }, from: { type: "string" }, to: { type: "string" } } },
      sort: { type: "string", enum: ["value_desc", "value_asc", "label"] },
      limit: { type: "number" },
    },
    required: ["dataset", "measure"],
  },
};

export type CopilotTurn = { role: "user" | "assistant"; content: string };
export type CopilotAnswer = { text: string; queries: { spec: QuerySpec; result?: unknown; error?: string }[] };

export async function askCopilot(history: CopilotTurn[], userName: string): Promise<CopilotAnswer> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const system = [
    `You answer questions about Janman People's Foundation's legal-aid work in Bihar, for ${userName}, a director. Today is ${today} (India). The financial year runs April to March.`,
    "You can only see aggregate figures through the run_query tool. Never ask for or speculate about names, case titles, addresses or any detail that could identify a client, a child or a survivor. If asked for one, say Insights only holds totals and point to the Cases page.",
    `Groups smaller than ${MIN_CELL} come back as "fewer than ${MIN_CELL}"; report them that way and never try to work out the exact number.`,
    "A case with several lawyers counts once per lawyer when grouped by lawyer, so per-lawyer counts can add up to more than the total. Say so when it matters.",
    "Answer in British English, plainly and briefly: the figure first, then one or two lines of context. Say which dataset and filters you used. If the data cannot answer the question, say what is missing.",
    "Available data:",
  ].join("\n");

  const messages: Anthropic.MessageParam[] = history.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));
  const queries: CopilotAnswer["queries"] = [];
  const sys = `${system}\n${catalogue()}`;

  for (let i = 0; i <= MAX_TOOL_CALLS; i++) {
    const res = await client.messages.create({
      model: process.env.INSIGHTS_COPILOT_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1200,
      system: sys,
      tools: [TOOL],
      messages,
    });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !toolUses.length || i === MAX_TOOL_CALLS) {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { text: text || "I could not answer that from the data available.", queries };
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      try {
        const spec = cleanQuery(tu.input);
        if (spec.dataset.startsWith(IMPORT_PREFIX)) throw new InsightQueryError("Imported datasets are not available to Copilot");
        const out = suppressSmallCells(spec, await runQuery({ ...spec, limit: Math.min(spec.limit ?? 50, 100) }));
        queries.push({ spec, result: out });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
      } catch (e) {
        const msg = e instanceof InsightQueryError || e instanceof Error ? e.message : "Query failed";
        queries.push({ spec: tu.input as QuerySpec, error: msg });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: `Error: ${msg}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "I could not answer that from the data available.", queries };
}
