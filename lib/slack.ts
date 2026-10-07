/** Posts a message to a Slack incoming webhook. Only hooks.slack.com URLs
 *  are accepted, so a stored URL cannot be pointed at another server. */
export function isSlackWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "hooks.slack.com" && u.pathname.startsWith("/services/");
  } catch {
    return false;
  }
}

export async function postToSlack(url: string, text: string): Promise<boolean> {
  if (!isSlackWebhook(url)) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 3000) }),
      redirect: "error",
    });
    return res.ok;
  } catch (e) {
    console.error("postToSlack failed", e);
    return false;
  }
}
