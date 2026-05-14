/** Shared AI helper used by Jan Sahayak / Legal Suite / Aangan / JNA Pro.
 *  Hits `/api/ai/draft` — never call api.anthropic.com directly from the
 *  browser; the API key lives server-side. */
export async function claudeCall(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  max_tokens = 1500,
): Promise<string> {
  try {
    const r = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens }),
    });
    const d = await r.json();
    return d.text || d.error || "No response.";
  } catch (e) {
    return "Error: " + (e instanceof Error ? e.message : "request failed");
  }
}

/** localStorage replacement for the `window.storage` pattern in the imported
 *  Claude-artifact JSX. JSON-encoded; ssr-safe (no-op on the server). */
export async function lsGet<T = unknown>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export async function lsSet(key: string, value: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}
