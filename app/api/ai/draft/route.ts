import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/** Single generic proxy used by Jan Sahayak / Legal Suite / Aangan / JNA Pro.
 *  Body: { system: string; messages: { role; content }[]; max_tokens?: number }
 *  Returns: { text: string }
 *  Note: the API key never leaves the server. */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: "AI is not configured on this deployment yet.", error: "missing_key" }, { status: 503 });
    }

    const { system, messages, max_tokens } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ text: "", error: "messages required" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: typeof max_tokens === "number" ? Math.min(max_tokens, 4096) : 1500,
      system: typeof system === "string" ? system : undefined,
      messages,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ text: "", error: msg }, { status: 500 });
  }
}
