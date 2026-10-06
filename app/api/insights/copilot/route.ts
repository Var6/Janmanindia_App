import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, BadRequest } from "@/lib/insights/api";
import { askCopilot, copilotEnabled, type CopilotTurn } from "@/lib/insights/copilot";

/** GET — is Copilot available? */
export async function GET() {
  return insightsRoute("GET /api/insights/copilot", async () => NextResponse.json(copilotEnabled()));
}

/** POST { messages: [{ role, content }] } — answer the last question. */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/copilot", async (session) => {
    const status = copilotEnabled();
    if (!status.ok) return NextResponse.json({ error: status.reason }, { status: 503 });
    const body = await readJson<{ messages?: unknown }>(req);
    if (!Array.isArray(body.messages) || !body.messages.length) throw new BadRequest("Ask a question");
    const history: CopilotTurn[] = body.messages.slice(-12).map((m) => {
      const x = (m ?? {}) as Record<string, unknown>;
      return { role: x.role === "assistant" ? "assistant" : "user", content: String(x.content ?? "").slice(0, 4000) };
    });
    if (history[history.length - 1].role !== "user") throw new BadRequest("The last message must be a question");
    return NextResponse.json(await askCopilot(history, session.name));
  });
}
