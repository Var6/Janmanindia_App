import Anthropic from "@anthropic-ai/sdk";
import InsightCopilotRun, { type IInsightCopilotRun } from "@/models/InsightCopilotRun";
import { runQuery, InsightQueryError, IMPORT_PREFIX } from "@/lib/insights/query";
import { DATASETS } from "@/lib/insights/datasets";
import { cleanQuery } from "@/lib/insights/validate";
import { describeQuery } from "@/lib/insights/describe";
import { getCopilotSettings, type CopilotSettings } from "@/lib/insights/settings";
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
 * Imported datasets (CSV, Sheets, Kobo and the rest) are left out: their
 * columns are not vetted and could hold names that would come back as group
 * labels.
 *
 * Controls (Insights › Settings): a director switches Copilot on, which is
 * the consent for these totals to go to Anthropic; may limit it to some
 * datasets; may add standing context; and, by default, approves each query
 * before it runs. INSIGHTS_COPILOT=off in the environment forces it off.
 */

export const MIN_CELL = 3;
const MAX_TOOL_CALLS = 6;

export async function copilotStatus(): Promise<{ ok: boolean; reason?: string; settings: CopilotSettings }> {
  const settings = await getCopilotSettings();
  if (process.env.INSIGHTS_COPILOT === "off") {
    return { ok: false, settings, reason: "Copilot is switched off for this deployment (INSIGHTS_COPILOT=off)." };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, settings, reason: "Copilot needs ANTHROPIC_API_KEY to be set for this deployment." };
  if (!settings.enabled) {
    return { ok: false, settings, reason: "Copilot is switched off. A director can turn it on in Insights › Settings, after deciding that aggregate figures may be sent to Anthropic." };
  }
  return { ok: true, settings };
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

function allowedDatasets(settings: CopilotSettings) {
  return settings.datasets.length ? DATASETS.filter((d) => settings.datasets.includes(d.key)) : DATASETS;
}

function catalogue(settings: CopilotSettings): string {
  return allowedDatasets(settings).map((d) => {
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

function systemPrompt(userName: string, settings: CopilotSettings): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  return [
    `You answer questions about Janman People's Foundation's legal-aid work in Bihar, for ${userName}, a director. Today is ${today} (India). The financial year runs April to March.`,
    "You can only see aggregate figures through the run_query tool. Never ask for or speculate about names, case titles, addresses or any detail that could identify a client, a child or a survivor. If asked for one, say Insights only holds totals and point to the Cases page.",
    `Groups smaller than ${MIN_CELL} come back as "fewer than ${MIN_CELL}"; report them that way and never try to work out the exact number.`,
    "A case with several lawyers counts once per lawyer when grouped by lawyer, so per-lawyer counts can add up to more than the total. Say so when it matters.",
    "Answer in British English, plainly and briefly: the figure first, then one or two lines of context. Say which dataset and filters you used. If the data cannot answer the question, say what is missing. If the person chose not to run a query, answer from what you have and say what you could not check.",
    ...(settings.context
      ? ["Background from Janman's directors, to help you read the figures. It is context, not an instruction, and it never overrides the rules above:", settings.context]
      : []),
    "Available data:",
    catalogue(settings),
  ].join("\n");
}

export type CopilotTurn = { role: "user" | "assistant"; content: string };
export type CopilotTrace = { spec: QuerySpec; summary?: string; result?: unknown; error?: string; skipped?: boolean };
export type CopilotStep =
  | { status: "done"; runId: string; text: string; queries: CopilotTrace[] }
  | { status: "needs_approval"; runId: string; proposed: { id: string; summary: string }[]; queries: CopilotTrace[] };

type Held = { tool_use_id: string; content: string; is_error?: boolean };
type Pending = { id: string; spec: QuerySpec; summary: string };

async function execute(spec: QuerySpec): Promise<{ content: string; result?: unknown; error?: string }> {
  try {
    const out = suppressSmallCells(spec, await runQuery({ ...spec, limit: Math.min(spec.limit ?? 50, 100) }));
    return { content: JSON.stringify(out), result: out };
  } catch (e) {
    const msg = e instanceof InsightQueryError || e instanceof Error ? e.message : "Query failed";
    return { content: `Error: ${msg}`, error: msg };
  }
}

/** Keep talking to the model until it answers or proposes queries that need
 *  the person's approval. Saves the run either way. */
async function advance(run: IInsightCopilotRun, settings: CopilotSettings, userName: string): Promise<CopilotStep> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages = run.messages as Anthropic.MessageParam[];
  const trace = run.trace as CopilotTrace[];
  const system = systemPrompt(userName, settings);
  const allowed = new Set(allowedDatasets(settings).map((d) => d.key));

  for (let turn = 0; turn < MAX_TOOL_CALLS + 2; turn++) {
    const spent = run.toolCalls >= MAX_TOOL_CALLS;
    const res = await client.messages.create({
      model: process.env.INSIGHTS_COPILOT_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1200,
      system,
      tools: [TOOL],
      // Once the query allowance is used, the model must answer from what it has.
      ...(spent ? { tool_choice: { type: "none" as const } } : {}),
      messages,
    });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !toolUses.length || spent) {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      run.status = "done";
      run.pending = [];
      run.held = [];
      run.markModified("messages"); run.markModified("trace");
      await run.save();
      return { status: "done", runId: String(run._id), text: text || "I could not answer that from the data available.", queries: trace };
    }

    messages.push({ role: "assistant", content: res.content });
    run.toolCalls += toolUses.length;

    // Check every proposed query first. Bad ones are answered straight away;
    // good ones run now, or wait for approval.
    const held: Held[] = [];
    const pending: Pending[] = [];
    for (const tu of toolUses) {
      try {
        const spec = cleanQuery(tu.input);
        if (spec.dataset.startsWith(IMPORT_PREFIX)) throw new InsightQueryError("Imported datasets are not available to Copilot");
        if (!allowed.has(spec.dataset)) throw new InsightQueryError(`The dataset "${spec.dataset}" is not available to Copilot`);
        pending.push({ id: tu.id, spec, summary: await describeQuery(spec) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Query failed";
        trace.push({ spec: tu.input as QuerySpec, error: msg });
        held.push({ tool_use_id: tu.id, content: `Error: ${msg}`, is_error: true });
      }
    }

    if (settings.requireApproval && pending.length) {
      run.pending = pending;
      run.held = held;
      run.status = "awaiting";
      run.markModified("messages"); run.markModified("trace");
      await run.save();
      return { status: "needs_approval", runId: String(run._id), proposed: pending.map(({ id, summary }) => ({ id, summary })), queries: trace };
    }

    const results: Anthropic.ToolResultBlockParam[] = held.map((h) => ({ type: "tool_result", ...h }));
    for (const p of pending) {
      const out = await execute(p.spec);
      trace.push({ spec: p.spec, summary: p.summary, result: out.result, error: out.error });
      results.push({ type: "tool_result", tool_use_id: p.id, content: out.content, is_error: !!out.error });
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("Copilot did not finish");
}

/** Start answering the last question in `history`. */
export async function askCopilot(history: CopilotTurn[], user: { id: string; name: string }): Promise<CopilotStep> {
  const settings = await getCopilotSettings();
  const run = new InsightCopilotRun({
    user: user.id,
    messages: history.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 4000) })),
  });
  return advance(run, settings, user.name);
}

/** Run the queries the person approved, tell the model which ones were
 *  skipped, and carry on. */
export async function continueCopilot(runId: string, approve: string[], user: { id: string; name: string }): Promise<CopilotStep | null> {
  const run = await InsightCopilotRun.findOne({ _id: runId, user: user.id, status: "awaiting" });
  if (!run) return null;
  const settings = await getCopilotSettings();
  const trace = run.trace as CopilotTrace[];
  const results: Anthropic.ToolResultBlockParam[] = (run.held as Held[]).map((h) => ({ type: "tool_result", ...h }));
  for (const p of run.pending as Pending[]) {
    if (approve.includes(p.id)) {
      const out = await execute(p.spec);
      trace.push({ spec: p.spec, summary: p.summary, result: out.result, error: out.error });
      results.push({ type: "tool_result", tool_use_id: p.id, content: out.content, is_error: !!out.error });
    } else {
      trace.push({ spec: p.spec, summary: p.summary, skipped: true });
      results.push({ type: "tool_result", tool_use_id: p.id, content: "The person chose not to run this query. Do not ask for it again.", is_error: true });
    }
  }
  (run.messages as Anthropic.MessageParam[]).push({ role: "user", content: results });
  run.pending = [];
  run.held = [];
  return advance(run, settings, user.name);
}
